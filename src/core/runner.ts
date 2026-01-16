import * as p from '@clack/prompts';
import color from 'picocolors';
import type { Command, CommandContext, ForgeDbConfig, FlagMap, ParsedArgs } from '../types';
import { CommandRegistry } from './registry';
import { confirmAction, CancelledError, isCancelled } from '../ui/prompts';
import { success, warn, error, info, newLine } from '../ui/logger';
import { Terminal, type MenuItem } from '../ui/terminal';
import { gradient, ASCII_BANNER } from '../ui/theme';
import { statusBar } from '../ui/status-bar';

// Fuzzy match helper for command search
function fuzzyMatch(query: string, target: string): boolean {
  query = query.toLowerCase();
  target = target.toLowerCase();

  if (target.includes(query)) return true;

  // Check if all chars in query appear in order in target
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

export interface RunnerOptions {
  config: ForgeDbConfig;
  registry: CommandRegistry;
  scope: string;
}

export class CommandRunner {
  private config: ForgeDbConfig;
  private registry: CommandRegistry;
  private scope: string;
  private terminal: Terminal;

  constructor(options: RunnerOptions) {
    this.config = options.config;
    this.registry = options.registry;
    this.scope = options.scope;
    this.terminal = new Terminal({
      title: 'DB-FORGE',
      subtitle: `${options.scope.toUpperCase()} mode`,
      showBanner: true,
    });
  }

  async run(commandName: string, args: string[], flags: FlagMap): Promise<void> {
    // Try direct lookup first, then with scope prefix
    let command = this.registry.get(commandName);
    if (!command && this.scope) {
      command = this.registry.get(`${this.scope}:${commandName}`);
    }
    // Also try common scope prefixes for cross-scope commands
    if (!command) {
      for (const prefix of ['migrate', 'seed', 'db', 'make']) {
        command = this.registry.get(`${prefix}:${commandName}`);
        if (command) break;
      }
    }

    if (!command) {
      p.log.error(`Unknown command "${commandName}".`);
      this.suggestSimilar(commandName);
      process.exitCode = 1;
      return;
    }

    const ctx: CommandContext = {
      config: this.config,
      flags,
      args,
      isInteractive: false,
      scope: this.scope
    };

    await this.executeCommand(command, ctx);
  }

  async runInteractive(): Promise<void> {
    let continueLoop = true;

    // Initialize status bar
    statusBar.init();

    // Show beautiful banner
    console.clear();
    console.log();
    console.log(gradient(ASCII_BANNER));
    console.log();

    p.intro(color.bgCyan(color.black(' DB-FORGE ')) + color.dim(` v${this.getVersion()}`));

    // Show config summary
    this.printConfigSummary();

    // Draw status bar at bottom
    statusBar.draw();

    while (continueLoop) {
      const commands = this.registry.getAll();

      // Group commands by section
      const sections = new Map<string, Command[]>();
      commands.forEach(cmd => {
        const section = cmd.meta.section || 'General';
        if (!sections.has(section)) {
          sections.set(section, []);
        }
        sections.get(section)!.push(cmd);
      });

      // Build options for clack select with grouping
      const options: { value: string; label: string; hint?: string }[] = [];

      const sectionOrder = ['Database', 'Migrations', 'Seeders', 'General'];
      const sortedSections = [...sections.keys()].sort((a, b) => {
        const aIdx = sectionOrder.indexOf(a);
        const bIdx = sectionOrder.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

      sortedSections.forEach(sectionName => {
        const sectionCommands = sections.get(sectionName)!;
        sectionCommands.forEach(cmd => {
          options.push({
            value: cmd.meta.name,
            label: `${color.cyan(cmd.meta.name)}`,
            hint: cmd.meta.description
          });
        });
      });

      // Add command search option
      options.push({
        value: '__search__',
        label: `${color.yellow('!')} ${color.dim('Type command...')}`,
        hint: 'Search and filter commands'
      });

      // Add exit option
      options.push({
        value: '__exit__',
        label: color.dim('Exit'),
        hint: 'Quit the application'
      });

      // Beautiful select prompt
      const selected = await p.select({
        message: 'What would you like to do?',
        options,
        initialValue: options[0]?.value
      });

      if (p.isCancel(selected) || selected === '__exit__') {
        p.outro(color.dim('Thanks for using DB-Forge. Goodbye!'));
        return;
      }

      // Handle command search
      let command: Command | undefined;
      if (selected === '__search__') {
        const searchResult = await this.searchCommand();
        if (!searchResult) continue;
        command = searchResult;
      } else {
        command = this.registry.get(selected as string);
      }

      if (!command) {
        p.log.error(`Command not found: ${selected}`);
        continue;
      }

      // Clear status bar before command execution
      statusBar.clear();

      // Show what we're doing
      p.log.step(`Executing ${color.cyan(command.meta.name)}`);
      console.log(color.dim(`   ${command.meta.description}`));
      console.log();

      const ctx: CommandContext = {
        config: this.config,
        flags: {},
        args: [],
        isInteractive: true,
        scope: this.scope
      };

      const startTime = Date.now();
      await this.executeCommand(command, ctx);

      // Show timing
      const duration = Date.now() - startTime;
      const formatted = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
      console.log();
      p.log.success(`Completed in ${color.cyan(formatted)}`);

      // Redraw status bar
      statusBar.draw();

      // Ask to continue
      console.log();
      const shouldContinue = await p.confirm({
        message: 'Run another command?',
        initialValue: true
      });

      if (p.isCancel(shouldContinue) || !shouldContinue) {
        continueLoop = false;
      } else {
        // Clear and show banner again
        console.clear();
        console.log();
        console.log(gradient(ASCII_BANNER));
        console.log();
        p.intro(color.bgCyan(color.black(' DB-FORGE ')) + color.dim(` v${this.getVersion()}`));
        this.printConfigSummary();
        statusBar.draw();
      }
    }

    // Clean up status bar
    statusBar.destroy();

    p.outro(color.dim('Thanks for using DB-Forge. Goodbye!'));
  }

  private async executeCommand(command: Command, ctx: CommandContext): Promise<void> {
    try {
      // Handle confirmation
      if (command.meta.requiresConfirmation) {
        const autoConfirm = !ctx.isInteractive && this.shouldAutoConfirm(ctx.flags);

        if (!autoConfirm) {
          const confirmed = await confirmAction(command.meta.description);
          if (!confirmed) {
            p.log.warn('Operation cancelled.');
            return;
          }
        } else {
          p.log.info('Confirmation auto-accepted (--yes/--force/CI).');
        }
      }

      await command.execute(ctx);
    } catch (err) {
      // Handle user cancellation (ESC key) gracefully
      if (isCancelled(err)) {
        p.log.warn('Operation cancelled.');
        return;
      }

      if (err instanceof Error) {
        p.log.error(err.message);
        if (process.env.DEBUG === 'true') {
          console.error(err.stack);
        }
      } else {
        p.log.error(String(err));
      }
      process.exitCode = 1;
    }
  }

  private shouldAutoConfirm(flags: FlagMap): boolean {
    return (
      flags.yes === true ||
      flags.y === true ||
      flags.force === true ||
      flags.f === true ||
      process.env.CI === 'true'
    );
  }

  private suggestSimilar(commandName: string): void {
    const prefix = commandName.split(':')[0];
    const similar = this.registry.findByPrefix(prefix);

    if (similar.length > 0) {
      p.log.info('Did you mean:');
      for (const cmd of similar.slice(0, 5)) {
        console.log(`   ${color.dim('•')} ${cmd.meta.name}`);
      }
    }
  }

  /**
   * Interactive command search with fuzzy filtering
   */
  private async searchCommand(): Promise<Command | null> {
    const commands = this.registry.getAll();

    // Get user input
    const query = await p.text({
      message: `${color.yellow('!')} Type command name (fuzzy search):`,
      placeholder: 'e.g., migrate, seed, fresh...'
    });

    if (p.isCancel(query) || !query) {
      return null;
    }

    // Filter commands by fuzzy match
    const matches = commands.filter(cmd =>
      fuzzyMatch(query, cmd.meta.name) ||
      fuzzyMatch(query, cmd.meta.description) ||
      (cmd.meta.aliases?.some(alias => fuzzyMatch(query, alias)) ?? false)
    );

    if (matches.length === 0) {
      p.log.warn(`No commands matching "${query}"`);
      return null;
    }

    if (matches.length === 1) {
      return matches[0];
    }

    // Multiple matches - let user choose
    const options = matches.map(cmd => ({
      value: cmd.meta.name,
      label: color.cyan(cmd.meta.name),
      hint: cmd.meta.description
    }));

    const selected = await p.select({
      message: `Found ${matches.length} matches:`,
      options: options as any
    });

    if (p.isCancel(selected)) {
      return null;
    }

    return this.registry.get(selected as string) || null;
  }

  private printConfigSummary(): void {
    const runtime = this.config.runtime ?? 'typeorm';

    const lines: string[] = [];
    lines.push(`${color.dim('Runtime:')}     ${color.cyan(runtime.toUpperCase())}`);

    if (runtime === 'sequelize') {
      if (this.config.sequelizeMigrationsDir) {
        lines.push(`${color.dim('Migrations:')}  ${this.config.sequelizeMigrationsDir}`);
      }
      if (this.config.sequelizeSeedersDir) {
        lines.push(`${color.dim('Seeders:')}     ${this.config.sequelizeSeedersDir}`);
      }
    } else {
      if (this.config.migrationsDir) {
        lines.push(`${color.dim('Migrations:')}  ${this.config.migrationsDir}`);
      }
      if (this.config.seedersDir) {
        lines.push(`${color.dim('Seeders:')}     ${this.config.seedersDir}`);
      }
    }

    p.note(lines.join('\n'), 'Configuration');
  }

  private getVersion(): string {
    try {
      return require('../../package.json').version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: string[] = [];
  const flags: FlagMap = {};

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const withoutDashes = arg.slice(2);
      const eqIndex = withoutDashes.indexOf('=');

      if (eqIndex > 0) {
        const key = withoutDashes.slice(0, eqIndex);
        const value = withoutDashes.slice(eqIndex + 1);
        flags[key] = value;
      } else {
        flags[withoutDashes] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else if (arg.startsWith('-') && arg.includes('=')) {
      const withoutDash = arg.slice(1);
      const eqIndex = withoutDash.indexOf('=');
      const key = withoutDash.slice(0, eqIndex);
      const value = withoutDash.slice(eqIndex + 1);
      flags[key] = value;
    } else {
      args.push(arg);
    }
  }

  return { args, flags };
}
