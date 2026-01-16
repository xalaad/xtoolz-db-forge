import { spawn } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import { resolve, join } from 'path';
import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { success, warn, error, info } from '../../ui/logger';
import { promptText } from '../../ui/prompts';

export class MigrateGenerateCommand extends BaseCommand {
  meta = {
    name: 'make:migration',
    description: 'Generate a new migration file from entity changes',
    section: 'Migrations' as const,
    usage: 'forge db make:migration --name=CreateUsers',
    examples: [
      'forge db make:migration --name=CreateUsers',
      'forge db make:migration --name=AddPhoneToUsers'
    ],
    aliases: ['migrate:generate'],
    flags: [
      {
        name: 'name',
        alias: 'n',
        description: 'Name for the migration',
        type: 'string' as const,
        required: true
      }
    ]
  };

  async execute(ctx: CommandContext): Promise<void> {
    let migrationName = this.getFlagString(ctx, 'name', 'n') ?? this.getArg(ctx, 0);

    if (!migrationName) {
      if (ctx.isInteractive) {
        migrationName = await promptText('Migration name (e.g., CreateUsers)');
      } else {
        error('Migration name is required. Use --name=MigrationName');
        return;
      }
    }

    if (!migrationName || migrationName.trim().length === 0) {
      error('Migration name cannot be empty.');
      return;
    }

    const sanitized = migrationName.trim().replace(/[^A-Za-z0-9_-]/g, '');
    if (!sanitized) {
      error('Invalid migration name. Use alphanumeric characters, hyphen, or underscore.');
      return;
    }

    const migrationsDir = resolve(process.cwd(), ctx.config.migrationsDir ?? 'src/database/migrations');

    // Ensure directory exists
    if (!existsSync(migrationsDir)) {
      await fs.mkdir(migrationsDir, { recursive: true });
      info(`Created migrations directory: ${migrationsDir}`);
    }

    const targetBase = this.resolveTargetPath(migrationsDir, sanitized);
    const dataSourcePath = resolve(process.cwd(), ctx.config.dataSourcePath ?? '');
    const beforeFiles = new Set(await fs.readdir(migrationsDir));

    await this.ensureDatabase(ctx);

    info(`Generating migration: ${sanitized}`);

    const command = process.platform === 'win32' ? 'cmd' : 'npx';
    const args =
      process.platform === 'win32'
        ? [
            '/c',
            'npx',
            'typeorm-ts-node-commonjs',
            '-d',
            dataSourcePath,
            'migration:generate',
            targetBase
          ]
        : [
            'typeorm-ts-node-commonjs',
            '-d',
            dataSourcePath,
            'migration:generate',
            targetBase
          ];

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_OPTIONS: this.appendNodeOptions(process.env.NODE_OPTIONS)
        }
      });

      child.on('close', async (code) => {
        if (code === 0) {
          const afterFiles = await fs.readdir(migrationsDir);
          const created = afterFiles.filter((file) => !beforeFiles.has(file));
          if (created.length > 0) {
            created
              .sort()
              .forEach((file) => success(`Migration created: ${resolve(migrationsDir, file)}`));
          } else {
            success('Migration generated successfully.');
          }
          resolvePromise();
        } else {
          rejectPromise(new Error(`Migration generation failed with exit code ${code}`));
        }
      });

      child.on('error', rejectPromise);
    });
  }

  private resolveTargetPath(migrationsDir: string, name: string): string {
    const timestamp = Date.now();
    return join(migrationsDir, `${timestamp}-${name}`);
  }

  private appendNodeOptions(existing?: string): string {
    const required = '-r tsconfig-paths/register';
    if (!existing) {
      return required;
    }
    return existing.includes(required) ? existing : `${existing} ${required}`;
  }
}

export const migrateGenerateCommand = new MigrateGenerateCommand();
