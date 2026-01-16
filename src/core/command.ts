import type { DataSource } from 'typeorm';
import type {
  Command,
  CommandContext,
  CommandMeta,
  CommandFlag,
  ForgeDbConfig,
  FlagMap
} from '../types';

export abstract class BaseCommand implements Command {
  abstract meta: CommandMeta;

  abstract execute(ctx: CommandContext): Promise<void>;

  protected getFlag(ctx: CommandContext, name: string, alias?: string): string | boolean | number | undefined {
    // First check if flag was explicitly provided
    const explicit = ctx.flags[name] ?? (alias ? ctx.flags[alias] : undefined);
    if (explicit !== undefined) {
      return explicit;
    }

    // Fall back to default from meta
    const flagDef = this.meta.flags?.find(f => f.name === name || f.alias === alias);
    return flagDef?.default;
  }

  protected getFlagString(ctx: CommandContext, name: string, alias?: string): string | undefined {
    const value = this.getFlag(ctx, name, alias);
    return typeof value === 'string' ? value : undefined;
  }

  protected getFlagBoolean(ctx: CommandContext, name: string, alias?: string): boolean {
    const value = this.getFlag(ctx, name, alias);
    return value === true || value === 'true';
  }

  protected getFlagNumber(ctx: CommandContext, name: string, alias?: string): number | undefined {
    const value = this.getFlag(ctx, name, alias);
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  protected getArg(ctx: CommandContext, index: number): string | undefined {
    return ctx.args[index];
  }

  protected async withDataSource<T>(
    ctx: CommandContext,
    work: (ds: DataSource) => Promise<T>
  ): Promise<T> {
    const ds = await ctx.config.dataSourceFactory?.();
    if (!ds) {
      throw new Error('No dataSourceFactory configured.');
    }

    await ds.initialize();
    try {
      return await work(ds);
    } finally {
      if (ds.isInitialized) {
        await ds.destroy();
      }
    }
  }

  protected async ensureDatabase(ctx: CommandContext, force = false): Promise<void> {
    if (!ctx.config.ensureDatabase) {
      return;
    }

    await ctx.config.ensureDatabase({
      log: console.log,
      force
    });
  }
}

export function defineCommand(meta: CommandMeta, execute: (ctx: CommandContext) => Promise<void>): Command {
  return {
    meta,
    execute
  };
}

export function createCommandFlags(...flags: CommandFlag[]): CommandFlag[] {
  return flags;
}

export const commonFlags = {
  yes: {
    name: 'yes',
    alias: 'y',
    description: 'Skip confirmation prompts',
    type: 'boolean' as const,
    default: false
  },
  force: {
    name: 'force',
    alias: 'f',
    description: 'Force the operation',
    type: 'boolean' as const,
    default: false
  },
  verbose: {
    name: 'verbose',
    alias: 'v',
    description: 'Show verbose output',
    type: 'boolean' as const,
    default: false
  },
  config: {
    name: 'config',
    alias: 'c',
    description: 'Path to config file',
    type: 'string' as const
  },
  env: {
    name: 'env',
    alias: 'e',
    description: 'Environment to use',
    type: 'string' as const,
    default: 'development'
  }
};
