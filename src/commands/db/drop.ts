import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker } from '../../ui/task-runner';

export class DbDropCommand extends BaseCommand {
  meta = {
    name: 'db:drop',
    description: 'Drop the entire database schema',
    section: 'Database' as const,
    usage: 'forge db db:drop --yes',
    examples: ['forge db db:drop --yes'],
    aliases: ['database:drop'],
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
    const logger = createProgressTracker('Drop Database');
    logger.start();

    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    logger.step('Dropping database schema');
    await this.withDataSource(ctx, async (ds) => {
      await ds.dropDatabase();
    });
    logger.done();

    logger.step('Recreating empty database');
    await this.ensureDatabase(ctx, true);
    logger.done();

    logger.complete('Database has been reset');
  }
}

export const dbDropCommand = new DbDropCommand();
