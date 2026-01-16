import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker, formatElapsed } from '../../ui/task-runner';
import color from 'picocolors';

export class DbFreshCommand extends BaseCommand {
  meta = {
    name: 'migrate:fresh',
    description: 'Drop all tables and re-run all migrations',
    section: 'Database' as const,
    usage: 'forge db migrate:fresh --yes',
    examples: [
      'forge db migrate:fresh --yes',
      'forge db migrate:fresh --seed'
    ],
    aliases: ['db:fresh'],
    flags: [
      {
        name: 'yes',
        alias: 'y',
        description: 'Skip confirmation',
        type: 'boolean' as const,
        default: false
      },
      {
        name: 'seed',
        description: 'Run seeders after migrations',
        type: 'boolean' as const,
        default: false
      }
    ],
    requiresConfirmation: true
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Fresh Migration');
    logger.start();

    // Drop database
    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    logger.step('Dropping database schema');
    await this.withDataSource(ctx, async (ds) => {
      await ds.dropDatabase();
    });
    logger.done();

    // Recreate database
    logger.step('Recreating database');
    await this.ensureDatabase(ctx, true);
    logger.done();

    // Run migrations with timing
    logger.step('Running migrations');
    const migrationStart = Date.now();
    let migrationCount = 0;

    await this.withDataSource(ctx, async (ds) => {
      const executed = await ds.runMigrations({ transaction: 'each' });
      migrationCount = executed.length;

      if (executed.length > 0) {
        logger.done();
        console.log();
        for (const migration of executed) {
          console.log(`${color.green('✓')} ${migration.name}`);
        }
      } else {
        logger.done();
        logger.warn('No migrations found');
      }
    });

    const migrationTime = Date.now() - migrationStart;
    console.log();
    logger.info(`Migrations: ${color.cyan(String(migrationCount))} in ${color.cyan(formatElapsed(migrationTime))}`);

    // Run seeders if requested
    if (this.getFlagBoolean(ctx, 'seed')) {
      console.log();
      logger.step('Loading seeders');

      if (!ctx.config.seederLoader) {
        logger.done();
        logger.warn('No seeder loader configured');
        logger.complete('Fresh migration complete (no seeders)');
        return;
      }

      const { SeederRunner } = await import('../../seeder/runner');
      const registry = await ctx.config.seederLoader();
      const seederNames = Object.keys(registry);
      logger.done();

      if (seederNames.length === 0) {
        logger.warn('No seeders found');
      } else {
        logger.info(`Found ${color.cyan(String(seederNames.length))} seeder(s)`);
        console.log();

        const seederStart = Date.now();

        await this.withDataSource(ctx, async (ds) => {
          const runner = new SeederRunner(ds, {
            fresh: true,
            force: true
          });

          for (const seederName of seederNames) {
            const startTime = Date.now();
            process.stdout.write(`${color.cyan('◐')} Running ${color.dim(seederName)}...`);

            try {
              const SeederClass = registry[seederName];
              await runner.runClass(SeederClass);

              const elapsed = Date.now() - startTime;
              process.stdout.write(`\r${color.green('✓')} ${seederName} ${color.dim(`(${formatElapsed(elapsed)})`)}\n`);
            } catch (err) {
              const elapsed = Date.now() - startTime;
              process.stdout.write(`\r${color.red('✗')} ${seederName} ${color.dim(`(${formatElapsed(elapsed)})`)}\n`);
              throw err;
            }
          }
        });

        const seederTime = Date.now() - seederStart;
        console.log();
        logger.info(`Seeders: ${color.cyan(String(seederNames.length))} in ${color.cyan(formatElapsed(seederTime))}`);
      }
    }

    logger.complete('Fresh migration complete');
  }
}

export const dbFreshCommand = new DbFreshCommand();
