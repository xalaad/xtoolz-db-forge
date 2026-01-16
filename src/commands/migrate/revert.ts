import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker } from '../../ui/task-runner';

export class MigrateRevertCommand extends BaseCommand {
  meta = {
    name: 'migrate:revert',
    description: 'Revert the last migration',
    section: 'Migrations' as const,
    usage: 'forge db migrate:revert --yes',
    examples: ['forge db migrate:revert --yes'],
    aliases: ['migrate:rollback'],
    flags: [
      {
        name: 'yes',
        alias: 'y',
        description: 'Skip confirmation',
        type: 'boolean' as const,
        default: false
      }
    ],
    requiresConfirmation: true
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Reverting Migration');
    logger.start();

    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    await this.withDataSource(ctx, async (ds) => {
      logger.step('Reverting last migration');
      await ds.undoLastMigration();
      logger.done();

      logger.complete('Successfully reverted the last migration');
    });
  }
}

export const migrateRevertCommand = new MigrateRevertCommand();
