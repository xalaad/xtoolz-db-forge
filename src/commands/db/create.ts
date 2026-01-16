import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { createProgressTracker } from '../../ui/task-runner';

export class DbCreateCommand extends BaseCommand {
  meta = {
    name: 'db:create',
    description: 'Ensure the configured database exists',
    section: 'Database' as const,
    usage: 'forge db db:create',
    examples: ['forge db db:create'],
    aliases: ['database:create'],
    flags: []
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Create Database');
    logger.start();

    logger.step('Checking database connection');
    await this.ensureDatabase(ctx, true);
    logger.done();

    logger.complete('Database is ready');
  }
}

export const dbCreateCommand = new DbCreateCommand();
