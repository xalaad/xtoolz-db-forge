import chalk from 'chalk';
import prompts, { PromptObject } from 'prompts';
import { existsSync, promises as fs } from 'fs';
import { resolve, isAbsolute } from 'path';

import { CommandDefinition, ForgeDbConfig, FlagMap, ForgeRuntime } from './types';

export const icons = {
  info: chalk.cyan('[i]'),
  success: chalk.green('[ok]'),
  warn: chalk.yellow('[!]'),
  error: chalk.red('[x]')
};

const PROMPT_OPTIONS = {
  onCancel: () => {
    console.log(`${icons.warn} Aborted.`);
    process.exit(1);
  }
} as const;

export function parseArgs(raw: string[]): { args: string[]; flags: FlagMap } {
  const args: string[] = [];
  const flags: FlagMap = {};

  raw.forEach((token) => {
    if (token.startsWith('--')) {
      const [key, value] = token.slice(2).split('=');
      flags[key] = value ?? true;
    } else if (token.startsWith('-') && token.length > 1) {
      const key = token.slice(1);
      flags[key] = true;
    } else {
      args.push(token);
    }
  });

  return { args, flags };
}

export function extractFlag(flags: FlagMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

export function shouldAutoConfirm(flags: FlagMap): boolean {
  const truthy = (value: string | boolean | undefined): boolean => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['1', 'true', 't', 'yes', 'y', 'force'].includes(normalized);
    }
    return false;
  };

  if (truthy(flags.y) || truthy(flags.yes) || truthy(flags.force) || truthy(flags.f)) {
    return true;
  }

  const ciValue = process.env.CI?.toLowerCase();
  return ciValue === '1' || ciValue === 'true';
}

export function info(message: string) {
  console.log(`${icons.info} ${message}`);
}

export function success(message: string) {
  console.log(`${icons.success} ${message}`);
}

export function warn(message: string) {
  console.log(`${icons.warn} ${message}`);
}

export function fail(message: string) {
  console.error(`${icons.error} ${message}`);
}

export function log(message: string) {
  console.log(chalk.gray(message));
}

export async function confirmAction(
  message: string,
  opts: { initial?: boolean } = {}
): Promise<boolean> {
  const response = await prompts(
    {
      type: 'confirm',
      name: 'confirm',
      message: `${message}? (y/N)`,
      initial: opts.initial ?? false
    },
    PROMPT_OPTIONS
  );

  return Boolean(response.confirm);
}

export async function ensureDir(directory: string) {
  if (!existsSync(directory)) {
    await fs.mkdir(directory, { recursive: true });
  }
}

export async function loadConfig(configPath: string): Promise<ForgeDbConfig> {
  const resolved = resolve(process.cwd(), configPath);

  let config: ForgeDbConfig | null = null;
  if (existsSync(resolved)) {
    const mod = require(resolved);
    config = (mod?.default ?? mod) as ForgeDbConfig;
  } else {
    config = await buildConfigFromEnv();
    if (!config) {
      throw new Error(`Unable to find forge config at ${resolved}`);
    }
  }

  if (!config || typeof config !== 'object') {
    throw new Error('ForgeDbConfig must export an object.');
  }

  applyEnvOverrides(config);
  validateConfig(config);

  return config;
}

export function resolveConfigPath(flags: FlagMap): string {
  const override = extractFlag(flags, 'config') ?? extractFlag(flags, 'c');
  if (override) {
    return override;
  }

  if (process.env.FORGE_CONFIG) {
    return process.env.FORGE_CONFIG;
  }
  if (process.env.DB_FORGE_CONFIG) {
    return process.env.DB_FORGE_CONFIG;
  }
  if (process.env.DB_ARTISAN_CONFIG) {
    return process.env.DB_ARTISAN_CONFIG;
  }

  const defaultCandidates = [
    'forge.config.ts',
    'forge.config.js',
    'db-forge.config.ts',
    'db-forge.config.js',
    'db-artisan.config.ts',
    'db-artisan.config.js'
  ];
  for (const candidate of defaultCandidates) {
    const absolute = resolve(process.cwd(), candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }

  return defaultCandidates[0];
}

export async function promptText(
  message: string,
  initial?: string,
  validate?: PromptObject['validate']
): Promise<string> {
  const response = await prompts(
    {
      type: 'text',
      name: 'value',
      message,
      initial,
      validate: validate ?? ((value) => (value && value.trim().length > 0 ? true : 'Required'))
    },
    PROMPT_OPTIONS
  );

  return response.value;
}

export async function promptSelect<T extends string>(
  message: string,
  choices: { title: string; value: T }[],
  initial = 0
): Promise<T | undefined> {
  const response = await prompts(
    {
      type: 'select',
      name: 'value',
      message,
      choices,
      initial
    },
    PROMPT_OPTIONS
  );

  return response.value;
}

export async function promptConfirm(message: string, initial = false): Promise<boolean> {
  return confirmAction(message, { initial });
}

export function resolveTargetPath(baseDir: string, name: string): string {
  const sanitized = name.trim().replace(/[^A-Za-z0-9_-]/g, '');
  return resolve(baseDir, sanitized);
}

export function toAbsolutePath(pathValue: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
}

export function handleFatal(error: unknown): never {
  handleError(error);
  return process.exit(1);
}

export function handleError(error: unknown) {
  if (error instanceof Error) {
    fail(error.message);
  } else {
    fail(String(error));
  }
}

export const header = (scope?: string) => {
  const scopeLabel = scope ? chalk.white(` [scope: ${scope}]`) : '';
  console.log(
    chalk.magentaBright('\n+------------------------------------------+') +
      chalk.magentaBright('\n|') +
      chalk.whiteBright('             Forge DB CLI                ') +
      chalk.magentaBright('|\n') +
      chalk.magentaBright('+------------------------------------------+\n') +
      (scopeLabel ? `${chalk.gray(scopeLabel)}\n` : '')
  );
};

export const describeCommands = (
  commands: CommandDefinition[],
  options: { showUsage?: boolean } = {}
) => {
  const { showUsage = false } = options;

  console.log(chalk.cyanBright('\nAvailable commands:\n'));

  const grouped = new Map<string, CommandDefinition[]>();
  commands.forEach((command) => {
    const section = command.section ?? 'General';
    if (!grouped.has(section)) {
      grouped.set(section, []);
    }
    grouped.get(section)!.push(command);
  });

  for (const [section, entries] of grouped) {
    console.log(chalk.whiteBright(`${section}:`));
    entries.forEach((command) => {
      const key = chalk.green(command.key.padEnd(18));
      const label = chalk.white(command.label.padEnd(18));
      console.log(`${key} ${label} ${command.description}`);
      if (showUsage && command.usage) {
        console.log(`  ${chalk.gray('usage:')} ${chalk.gray(command.usage)}`);
      }
    });
    console.log('');
  }
};

export function determineRuntime(config: ForgeDbConfig): ForgeRuntime {
  if (config.runtime === 'sequelize') {
    return 'sequelize';
  }
  if (config.runtime === 'typeorm') {
    return 'typeorm';
  }
  if (typeof config.sequelizeFactory === 'function') {
    return 'sequelize';
  }
  return 'typeorm';
}

export function isTypeOrmRuntime(config: ForgeDbConfig): boolean {
  return determineRuntime(config) === 'typeorm';
}

export function isSequelizeRuntime(config: ForgeDbConfig): boolean {
  return determineRuntime(config) === 'sequelize';
}

async function buildConfigFromEnv(): Promise<ForgeDbConfig | null> {
  const runtimeHint = process.env.FORGE_RUNTIME?.toLowerCase();

  if (runtimeHint === 'sequelize' || process.env.FORGE_SEQUELIZE_URI) {
    const migrationsDir =
      process.env.FORGE_SEQUELIZE_MIGRATIONS_DIR ?? process.env.FORGE_MIGRATIONS_DIR;
    if (!migrationsDir) {
      return null;
    }
    return {
      runtime: 'sequelize',
      sequelizeMigrationsDir: migrationsDir,
      sequelizeSeedersDir: process.env.FORGE_SEQUELIZE_SEEDERS_DIR,
      sequelizeConfigPath: process.env.FORGE_SEQUELIZE_CONFIG_PATH,
      sequelizeFactory: async () => {
        const uri = process.env.FORGE_SEQUELIZE_URI ?? process.env.DB_URL;
        if (!uri) {
          throw new Error(
            'FORGE_SEQUELIZE_URI (or DB_URL) must be set in the environment for Sequelize runtime.'
          );
        }
        const sequelizeModule = await import('sequelize').catch(() => {
          throw new Error(
            'Sequelize runtime requested but the "sequelize" package could not be resolved.'
          );
        });
        const { Sequelize } = sequelizeModule as { Sequelize: any };
        const dialect = (process.env.FORGE_SEQUELIZE_DIALECT ??
          process.env.DB_DIALECT ??
          '') as any;
        const logging = process.env.FORGE_SEQUELIZE_LOGGING === 'true';
        return new Sequelize(uri, {
          ...(dialect ? { dialect } : {}),
          logging
        });
      }
    };
  }

  const dataSourcePath =
    process.env.FORGE_TYPEORM_DATASOURCE ??
    process.env.TYPEORM_DATA_SOURCE ??
    process.env.FORGE_DATA_SOURCE;

  if (!dataSourcePath) {
    return null;
  }

  const migrationsDir =
    process.env.FORGE_MIGRATIONS_DIR ?? process.env.TYPEORM_MIGRATIONS_DIR ?? 'dist/migrations';

  return {
    runtime: 'typeorm',
    dataSourcePath,
    migrationsDir,
    dataSourceFactory: async () => {
      const moduleSpecifier = toModuleSpecifier(dataSourcePath);
      const imported = await import(moduleSpecifier);
      const maybeFactory =
        imported.buildDataSource ??
        imported.createDataSource ??
        imported.makeDataSource ??
        imported.dataSourceFactory;
      if (typeof maybeFactory === 'function') {
        return await maybeFactory();
      }
      if (imported.default && typeof imported.default.initialize === 'function') {
        return imported.default;
      }
      if (imported.dataSource && typeof imported.dataSource.initialize === 'function') {
        return imported.dataSource;
      }
      throw new Error(
        `Unable to resolve a TypeORM DataSource factory from module "${moduleSpecifier}".`
      );
    }
  };
}

function applyEnvOverrides(config: ForgeDbConfig) {
  const runtimeEnv = process.env.FORGE_RUNTIME?.toLowerCase();
  if (runtimeEnv === 'typeorm' || runtimeEnv === 'sequelize') {
    config.runtime = runtimeEnv as ForgeRuntime;
  }

  if (process.env.FORGE_TYPEORM_DATASOURCE) {
    config.dataSourcePath = process.env.FORGE_TYPEORM_DATASOURCE;
  }

  if (process.env.FORGE_DATA_SOURCE) {
    config.dataSourcePath = process.env.FORGE_DATA_SOURCE;
  }

  if (process.env.FORGE_MIGRATIONS_DIR) {
    config.migrationsDir = process.env.FORGE_MIGRATIONS_DIR;
  }

  if (process.env.FORGE_SEQUELIZE_MIGRATIONS_DIR) {
    config.sequelizeMigrationsDir = process.env.FORGE_SEQUELIZE_MIGRATIONS_DIR;
  }

  if (process.env.FORGE_SEQUELIZE_SEEDERS_DIR) {
    config.sequelizeSeedersDir = process.env.FORGE_SEQUELIZE_SEEDERS_DIR;
  }

  if (process.env.FORGE_SEQUELIZE_CONFIG_PATH) {
    config.sequelizeConfigPath = process.env.FORGE_SEQUELIZE_CONFIG_PATH;
  }
}

function validateConfig(config: ForgeDbConfig) {
  const runtime = determineRuntime(config);

  if (runtime === 'typeorm') {
    if (typeof config.dataSourceFactory !== 'function') {
      throw new Error(
        'ForgeDbConfig (TypeORM runtime) requires a "dataSourceFactory" function.'
      );
    }
    if (!config.dataSourcePath) {
      throw new Error('ForgeDbConfig (TypeORM runtime) requires a "dataSourcePath".');
    }
    if (!config.migrationsDir) {
      throw new Error('ForgeDbConfig (TypeORM runtime) requires a "migrationsDir".');
    }
  } else if (runtime === 'sequelize') {
    if (typeof config.sequelizeFactory !== 'function') {
      throw new Error(
        'ForgeDbConfig (Sequelize runtime) requires a "sequelizeFactory" function or env-backed factory.'
      );
    }

    const migrationsDir = config.sequelizeMigrationsDir ?? config.migrationsDir;
    if (!migrationsDir) {
      throw new Error(
        'ForgeDbConfig (Sequelize runtime) requires "sequelizeMigrationsDir" or "migrationsDir".'
      );
    }
  } else {
    throw new Error(`Unsupported runtime "${runtime}".`);
  }
}

function toModuleSpecifier(value: string): string {
  if (value.startsWith('.') || value.startsWith('/')) {
    return resolve(process.cwd(), value);
  }
  return value;
}
