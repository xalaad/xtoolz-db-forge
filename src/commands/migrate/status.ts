import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker } from '../../ui/task-runner';
import { renderTable } from '../../ui/table';
import color from 'picocolors';

export class MigrateStatusCommand extends BaseCommand {
  meta = {
    name: 'migrate:status',
    description: 'Show the status of each migration',
    section: 'Migrations' as const,
    usage: 'forge db migrate:status',
    examples: ['forge db migrate:status'],
    aliases: ['status'],
    flags: []
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Migration Status');
    logger.start();

    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    await this.withDataSource(ctx, async (ds) => {
      logger.step('Fetching migration status');

      const driverOptions = ds.driver.options as unknown as Record<string, unknown>;
      const migrationsTable = driverOptions?.migrationsTableName ?? 'migrations';
      const tableName = ds.driver.buildTableName(String(migrationsTable));

      let executedRows: Array<Record<string, unknown>> = [];

      try {
        executedRows = await ds.query(`SELECT * FROM ${tableName}`);
      } catch (error) {
        if (this.isMissingTableError(error)) {
          logger.done();
          logger.warn('Migrations table not found. No migrations have been run.');
          executedRows = [];
        } else {
          logger.fail();
          throw error;
        }
      }

      logger.done();

      const executedNames = executedRows
        .map((row) => String(row.name ?? row.NAME ?? ''))
        .filter((name) => name.length > 0);

      const available = ds.migrations
        ?.map((migration) => migration.name ?? '')
        .filter((name) => name.length > 0) ?? [];

      const executedSet = new Set(executedNames);
      const pending = available.filter((name) => !executedSet.has(name));

      // Build table rows
      const rows: string[][] = [];

      for (const name of executedNames) {
        rows.push([name, color.green('✓ Executed'), 'Yes']);
      }

      for (const name of pending) {
        rows.push([name, color.yellow('○ Pending'), 'No']);
      }

      if (rows.length === 0) {
        logger.warn('No migrations found');
        return;
      }

      console.log();
      renderTable({
        headers: ['Migration', 'Status', 'Ran'],
        rows
      });

      logger.separator();
      logger.info(`Total: ${color.cyan(String(available.length))} migrations`);
      logger.item('Executed', String(executedNames.length));
      logger.item('Pending', String(pending.length));

      if (pending.length > 0) {
        logger.complete(`${color.yellow(String(pending.length))} migration(s) pending`);
      } else {
        logger.complete('All migrations are up to date');
      }
    });
  }

  private isMissingTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const details = error as { code?: string; message?: string };
    const code = typeof details.code === 'string' ? details.code : '';
    const message = typeof details.message === 'string' ? details.message : '';

    return (
      code === 'ER_NO_SUCH_TABLE' ||
      code === '42P01' ||
      message.toLowerCase().includes("doesn't exist") ||
      message.toLowerCase().includes('does not exist')
    );
  }
}

export const migrateStatusCommand = new MigrateStatusCommand();
