import type { Command, CommandConstructor, CommandMeta, CommandSection } from '../types';

export interface RegisteredCommand {
  command: Command;
  section: CommandSection;
  aliases: string[];
}

export class CommandRegistry {
  private commands = new Map<string, RegisteredCommand>();
  private sections = new Map<CommandSection, string[]>();

  register(command: Command): this {
    const { name, section = 'General', aliases = [] } = command.meta;

    const registered: RegisteredCommand = {
      command,
      section,
      aliases
    };

    // Register by name
    this.commands.set(name, registered);

    // Register aliases
    for (const alias of aliases) {
      this.commands.set(alias, registered);
    }

    // Add to section
    const sectionCommands = this.sections.get(section) ?? [];
    if (!sectionCommands.includes(name)) {
      sectionCommands.push(name);
      this.sections.set(section, sectionCommands);
    }

    return this;
  }

  registerMany(commands: Command[]): this {
    for (const command of commands) {
      this.register(command);
    }
    return this;
  }

  get(nameOrAlias: string): Command | undefined {
    return this.commands.get(nameOrAlias)?.command;
  }

  has(nameOrAlias: string): boolean {
    return this.commands.has(nameOrAlias);
  }

  getAll(): Command[] {
    const seen = new Set<string>();
    const result: Command[] = [];

    this.commands.forEach((registered) => {
      const name = registered.command.meta.name;
      if (!seen.has(name)) {
        seen.add(name);
        result.push(registered.command);
      }
    });

    return result;
  }

  getBySection(section: CommandSection): Command[] {
    const names = this.sections.get(section) ?? [];
    return names
      .map((name) => this.commands.get(name)?.command)
      .filter((cmd): cmd is Command => cmd !== undefined);
  }

  getSections(): CommandSection[] {
    return Array.from(this.sections.keys());
  }

  getGroupedBySection(): Map<CommandSection, Command[]> {
    const result = new Map<CommandSection, Command[]>();

    for (const section of this.getSections()) {
      result.set(section, this.getBySection(section));
    }

    return result;
  }

  describe(): void {
    const grouped = this.getGroupedBySection();

    grouped.forEach((commands, section) => {
      console.log(`\n  ${section}:`);
      commands.forEach((cmd) => {
        const aliases = cmd.meta.aliases?.length
          ? ` (${cmd.meta.aliases.join(', ')})`
          : '';
        console.log(`    ${cmd.meta.name.padEnd(20)} ${cmd.meta.description}${aliases}`);
      });
    });

    console.log('');
  }

  findByPrefix(prefix: string): Command[] {
    const results: Command[] = [];
    const seen = new Set<string>();

    this.commands.forEach((registered, key) => {
      const name = registered.command.meta.name;
      if (key.startsWith(prefix) && !seen.has(name)) {
        seen.add(name);
        results.push(registered.command);
      }
    });

    return results;
  }
}

// Global registry instance
let globalRegistry: CommandRegistry | null = null;

export function getGlobalRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new CommandRegistry();
  }
  return globalRegistry;
}

export function registerCommand(command: Command): void {
  getGlobalRegistry().register(command);
}

export function registerCommands(...commands: Command[]): void {
  getGlobalRegistry().registerMany(commands);
}
