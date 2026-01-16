import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker, formatElapsed } from '../../ui/task-runner';
import color from 'picocolors';

export class MigrateRunCommand extends BaseCommand {
  meta = {
    name: 'migrate',
    description: 'Run all pending migrations',
    section: 'Migrations' as const,
    usage: 'forge db migrate',
    examples: ['forge db migrate'],
    aliases: ['migrate:run'],
    flags: []
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Running Migrations');
    logger.start();

    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    await this.withDataSource(ctx, async (ds) => {
      logger.step('Checking pending migrations');
      const hasPending = await ds.showMigrations();
      logger.done();

      if (!hasPending) {
        logger.info('No pending migrations found');
        logger.complete('Database is up to date');
        return;
      }

      // Run all migrations with timing
      logger.step('Running migrations');
      const startTime = Date.now();

      const executed = await ds.runMigrations({ transaction: 'each' });
      const totalTime = Date.now() - startTime;

      logger.done();

      if (executed.length === 0) {
        logger.warn('No migrations were executed');
        return;
      }

      // Show each executed migration
      console.log();
      for (const migration of executed) {
        console.log(`${color.green('✓')} ${migration.name}`);
      }

      console.log();
      logger.separator();
      logger.info(`Total: ${color.cyan(String(executed.length))} migration(s) in ${color.cyan(formatElapsed(totalTime))}`);
      logger.complete('All migrations completed successfully');
    });
  }
}

export const migrateRunCommand = new MigrateRunCommand();
