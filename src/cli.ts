#!/usr/bin/env node
import 'ts-node/register/transpile-only';
import 'reflect-metadata';
import 'dotenv/config';
import 'tsconfig-paths/register';

import { basename } from 'path';
import type { ForgeDbConfig, FlagMap } from './types';
import { CommandRegistry } from './core/registry';
import { CommandRunner, parseArgs } from './core/runner';
import { allCommands } from './commands';
import { error, info } from './ui/logger';
import {
  ASCII_BANNER,
  primary,
  accent,
  muted,
  highlight,
  SYMBOLS,
  gradient,
  THEME,
} from './ui/theme';

// ============================================================================
// Configuration Loading
// ============================================================================

async function loadConfig(configPath: string): Promise<ForgeDbConfig> {
  const { existsSync } = await import('fs');
  const { resolve } = await import('path');

  const absolutePath = resolve(process.cwd(), configPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);
  return module.default ?? module;
}

function resolveConfigPath(flags: FlagMap): string {
  const configFlag = flags.config ?? flags.c;
  if (typeof configFlag === 'string') {
    return configFlag;
  }
  return process.env.FORGE_CONFIG ?? 'forge.config.ts';
}

// ============================================================================
// Scope Resolution
// ============================================================================

type ForgeScope = 'db' | 'migrate' | 'config' | 'seed';
const SUPPORTED_SCOPES = new Set<ForgeScope>(['db', 'migrate', 'config', 'seed']);

function resolveScope(rawArgs: string[], flags: FlagMap): { scope: ForgeScope; args: string[] } {
  const args = [...rawArgs];

  let scope = (flags.scope ?? flags.s) as ForgeScope | undefined;
  if (typeof scope === 'string') {
    scope = scope.toLowerCase() as ForgeScope;
  }

  if (!scope) {
    const invoked = basename((process.argv[1] ?? '').toLowerCase());
    if (invoked.includes('forge-migrate')) scope = 'migrate';
    else if (invoked.includes('forge-config')) scope = 'config';
    else if (invoked.includes('forge-seed')) scope = 'seed';
    else if (invoked.includes('forge-db')) scope = 'db';
  }

  if (!scope) {
    scope = 'db';
  }

  if (args.length > 0) {
    const candidate = args[0].toLowerCase();
    if (SUPPORTED_SCOPES.has(candidate as ForgeScope)) {
      scope = candidate as ForgeScope;
      args.shift();
    } else {
      const colonIndex = candidate.indexOf(':');
      if (colonIndex > 0) {
        const candidateScope = candidate.slice(0, colonIndex);
        if (SUPPORTED_SCOPES.has(candidateScope as ForgeScope)) {
          scope = candidateScope as ForgeScope;
          const remainder = args[0].slice(colonIndex + 1);
          if (remainder.length > 0) {
            args[0] = remainder;
          } else {
            args.shift();
          }
        }
      }
    }
  }

  return { scope, args };
}

// ============================================================================
// Config Commands
// ============================================================================

async function handleConfigInit(flags: FlagMap, isInteractive: boolean): Promise<void> {
  const { existsSync, promises: fs } = await import('fs');
  const { resolve } = await import('path');
  const { promptSelect, promptConfirm } = await import('./ui/prompts');
  const { success, warn } = await import('./ui/logger');

  const runtimeFlag = flags.runtime ?? flags.r;
  let runtime = typeof runtimeFlag === 'string' ? runtimeFlag.toLowerCase() : undefined;

  if (!runtime || (runtime !== 'typeorm' && runtime !== 'sequelize')) {
    if (isInteractive) {
      const selection = await promptSelect('Select runtime', [
        { title: 'TypeORM', value: 'typeorm' },
        { title: 'Sequelize', value: 'sequelize' }
      ]);
      runtime = selection ?? 'typeorm';
    } else {
      runtime = 'typeorm';
    }
  }

  const targetPath = resolve(process.cwd(), resolveConfigPath(flags));

  if (existsSync(targetPath)) {
    if (isInteractive) {
      const confirmed = await promptConfirm(`Overwrite ${targetPath}?`, false);
      if (!confirmed) {
        warn('Aborted.');
        return;
      }
    }
  }

  const template = runtime === 'sequelize' ? getSequelizeConfigTemplate() : getTypeOrmConfigTemplate();
  await fs.writeFile(targetPath, template, 'utf8');
  success(`Config created at ${targetPath}`);
}

function getTypeOrmConfigTemplate(): string {
  return `import type { ForgeDbConfig } from '@xtools/db-forge';

const config: ForgeDbConfig = {
  runtime: 'typeorm',
  dataSourcePath: process.env.FORGE_TYPEORM_DATASOURCE ?? 'src/database/typeorm.config.ts',
  dataSourceFactory: async () => {
    const modulePath = process.env.FORGE_TYPEORM_DATASOURCE ?? './src/database/typeorm.config';
    const module = await import(modulePath);
    if (typeof module.buildDataSource === 'function') {
      return module.buildDataSource();
    }
    if (module.default && typeof module.default.initialize === 'function') {
      return module.default;
    }
    throw new Error('Expected buildDataSource or default DataSource export.');
  },
  migrationsDir: process.env.FORGE_MIGRATIONS_DIR ?? 'src/database/migrations',
  seedersDir: process.env.FORGE_SEEDERS_DIR ?? 'src/database/seeds'
};

export default config;
`;
}

function getSequelizeConfigTemplate(): string {
  return `import type { ForgeDbConfig } from '@xtools/db-forge';

const config: ForgeDbConfig = {
  runtime: 'sequelize',
  sequelizeMigrationsDir: process.env.FORGE_SEQUELIZE_MIGRATIONS_DIR ?? 'src/database/migrations',
  sequelizeSeedersDir: process.env.FORGE_SEQUELIZE_SEEDERS_DIR ?? 'src/database/seeders',
  sequelizeFactory: async () => {
    const { Sequelize } = await import('sequelize');
    const uri = process.env.FORGE_SEQUELIZE_URI ?? process.env.DB_URL;
    if (!uri) {
      throw new Error('FORGE_SEQUELIZE_URI (or DB_URL) must be set for Sequelize runtime.');
    }
    return new Sequelize(uri, {
      logging: process.env.FORGE_SEQUELIZE_LOGGING === 'true'
    });
  }
};

export default config;
`;
}

// ============================================================================
// Help System
// ============================================================================

function getVersion(): string {
  try {
    return require('../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function showHelp(): void {
  console.clear();
  console.log();
  console.log(gradient(ASCII_BANNER));
  console.log();
  console.log(muted(`  ${'─'.repeat(65)}`));
  console.log(`  ${accent('Enterprise Database CLI')}${' '.repeat(28)}${muted('v' + getVersion())}`);
  console.log(muted(`  ${'─'.repeat(65)}`));

  // Overview
  console.log();
  console.log(`  ${highlight('OVERVIEW')}`);
  console.log();
  console.log(`  DB-Forge is a powerful database management CLI for TypeORM and`);
  console.log(`  Sequelize projects. It provides migration management, seeding,`);
  console.log(`  and database operations with an interactive interface.`);

  // Usage
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('USAGE')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${muted('$')} ${primary('forge')}                        ${muted('# Interactive mode')}`);
  console.log(`    ${muted('$')} ${primary('forge')} ${accent('<command>')} ${muted('[options]')}    ${muted('# Direct command')}`);
  console.log(`    ${muted('$')} ${primary('forge')} ${accent('help')}                    ${muted('# Show this help')}`);

  // Interactive Mode
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('INTERACTIVE MODE')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${accent('↑/↓')}             Navigate commands`);
  console.log(`    ${accent('Enter')}           Select command`);
  console.log(`    ${accent('!')}               Search commands (fuzzy match)`);
  console.log(`    ${accent('Esc')}             Cancel / Exit`);

  // Scopes
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('SCOPES')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${primary('db')}          ${muted('→')} Database operations (create, drop, fresh)`);
  console.log(`    ${primary('migrate')}     ${muted('→')} Migration management`);
  console.log(`    ${primary('seed')}        ${muted('→')} Seeder management`);
  console.log(`    ${primary('config')}      ${muted('→')} Configuration management`);

  // Database Commands
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('DATABASE COMMANDS')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${primary('db:create')}             ${muted('→')} Create the database`);
  console.log(`    ${primary('db:drop')}               ${muted('→')} Drop the database`);
  console.log(`    ${primary('migrate:fresh')}         ${muted('→')} Drop all tables and re-run migrations`);
  console.log(`    ${primary('migrate:fresh --seed')}  ${muted('→')} Fresh migration with seeders`);

  // Migration Commands
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('MIGRATION COMMANDS')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${primary('migrate')}               ${muted('→')} Run all pending migrations`);
  console.log(`    ${primary('migrate:run')}           ${muted('→')} Run all pending migrations`);
  console.log(`    ${primary('migrate:revert')}        ${muted('→')} Revert the last migration`);
  console.log(`    ${primary('migrate:status')}        ${muted('→')} Show migration status`);
  console.log(`    ${primary('make:migration')}        ${muted('→')} Generate a new migration file`);
  console.log(`      ${muted('--name=<Name>')}         ${muted('  Migration name (required)')}`);

  // Seeder Commands
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('SEEDER COMMANDS')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${primary('seed:run')}              ${muted('→')} Run all seeders`);
  console.log(`    ${primary('seed:run --class=X')}    ${muted('→')} Run specific seeder`);
  console.log(`    ${primary('seed:run --force')}      ${muted('→')} Force re-run seeders`);
  console.log(`    ${primary('make:seeder')}           ${muted('→')} Generate a new seeder file`);
  console.log(`      ${muted('--name=<Name>')}         ${muted('  Seeder name (required)')}`);

  // Config Commands
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('CONFIG COMMANDS')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${primary('config init')}           ${muted('→')} Create forge.config.ts`);
  console.log(`      ${muted('--runtime=typeorm')}     ${muted('  Use TypeORM (default)')}`);
  console.log(`      ${muted('--runtime=sequelize')}   ${muted('  Use Sequelize')}`);

  // Options
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('OPTIONS')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${accent('--config, -c')}  ${muted('<path>')}   Path to config file`);
  console.log(`    ${accent('--yes, -y')}              Skip confirmation prompts`);
  console.log(`    ${accent('--force, -f')}            Force the operation`);
  console.log(`    ${accent('--verbose, -v')}          Show verbose output`);
  console.log(`    ${accent('--help, -h')}             Show help message`);
  console.log(`    ${accent('--version, -V')}          Show version number`);

  // Environment Variables
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('ENVIRONMENT VARIABLES')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${accent('FORGE_CONFIG')}           Path to config file`);
  console.log(`    ${accent('FORGE_RUNTIME')}          Runtime: typeorm | sequelize`);
  console.log(`    ${accent('DEBUG=true')}             Enable debug output`);
  console.log(`    ${accent('CI=true')}                Auto-confirm in CI environment`);

  // Examples
  console.log();
  console.log(`  ${primary(SYMBOLS.arrowRight)} ${highlight('EXAMPLES')}`);
  console.log(muted(`  ${'─'.repeat(55)}`));
  console.log();
  console.log(`    ${muted('# Initialize a new project')}`);
  console.log(`    ${muted('$')} forge config init --runtime=typeorm`);
  console.log();
  console.log(`    ${muted('# Run migrations')}`);
  console.log(`    ${muted('$')} forge migrate`);
  console.log();
  console.log(`    ${muted('# Create and run a seeder')}`);
  console.log(`    ${muted('$')} forge make:seeder --name=UserSeeder`);
  console.log(`    ${muted('$')} forge seed:run --class=UserSeeder`);
  console.log();
  console.log(`    ${muted('# Fresh database with seeds (CI mode)')}`);
  console.log(`    ${muted('$')} forge migrate:fresh --seed --yes`);
  console.log();
  console.log(`    ${muted('# Generate migration')}`);
  console.log(`    ${muted('$')} forge make:migration --name=CreateUsersTable`);

  // Footer
  console.log();
  console.log(muted(`  ${'─'.repeat(65)}`));
  console.log(`  ${muted('Documentation:')} ${accent('https://github.com/xalaad/xtools-db-forge.git')}`);
  console.log(`  ${muted('Report issues:')} ${accent('https://github.com/xalaad/xtools-db-forge.git/issues')}`);
  console.log(muted(`  ${'─'.repeat(65)}`));
  console.log();
}

function showVersion(): void {
  console.log(`db-forge v${getVersion()}`);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const { args, flags } = parseArgs(process.argv.slice(2));
  const { scope, args: scopedArgs } = resolveScope(args, flags);

  // Handle help
  if (flags.help || flags.h || scopedArgs[0] === 'help') {
    showHelp();
    return;
  }

  // Handle version
  if (flags.version || flags.V) {
    showVersion();
    return;
  }

  // Handle config scope
  if (scope === 'config') {
    const command = scopedArgs[0];
    if (command === 'init') {
      await handleConfigInit(flags, process.stdin.isTTY ?? false);
    } else {
      showHelp();
    }
    return;
  }

  // Load config
  const configPath = resolveConfigPath(flags);
  let config: ForgeDbConfig;

  try {
    config = await loadConfig(configPath);
  } catch (err) {
    error(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
    console.log();
    info('Run "forge config init" to create a config file.');
    info('Run "forge help" for usage information.');
    process.exitCode = 1;
    return;
  }

  // Create registry and runner
  const registry = new CommandRegistry();
  registry.registerMany(allCommands);

  const runner = new CommandRunner({
    config,
    registry,
    scope
  });

  // Interactive mode: only when NO arguments provided
  if (scopedArgs.length === 0 && process.stdin.isTTY) {
    await runner.runInteractive();
  } else if (scopedArgs.length === 0) {
    // No args and not TTY - show help
    showHelp();
  } else {
    // Direct command execution
    const [commandName, ...commandArgs] = scopedArgs;
    await runner.run(commandName, commandArgs, flags);
  }
}

// Run
main().catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  if (process.env.DEBUG === 'true' && err instanceof Error) {
    console.error(err.stack);
  }
  process.exitCode = 1;
});
