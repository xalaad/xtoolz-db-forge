import type { CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { SeederRunner } from '../../seeder/runner';
import { createProgressTracker, formatElapsed } from '../../ui/task-runner';
import { promptSelect } from '../../ui/prompts';
import color from 'picocolors';

export class SeedRunCommand extends BaseCommand {
  meta = {
    name: 'seed:run',
    description: 'Run database seeders',
    section: 'Seeders' as const,
    usage: 'forge db seed:run [--class=SeederName] [--force]',
    examples: [
      'forge db seed:run',
      'forge db seed:run --class=UserSeeder',
      'forge db seed:run --class=UserSeeder,RoleSeeder',
      'forge db seed:run --force'
    ],
    aliases: ['seed', 'db:seed'],
    flags: [
      {
        name: 'class',
        alias: 'c',
        description: 'Specific seeder class(es) to run (comma-separated)',
        type: 'string' as const
      },
      {
        name: 'force',
        alias: 'f',
        description: 'Force seeding in production',
        type: 'boolean' as const,
        default: false
      }
    ]
  };

  async execute(ctx: CommandContext): Promise<void> {
    const logger = createProgressTracker('Running Seeders');
    logger.start();

    // Load seeder registry
    logger.step('Loading seeder configuration');
    if (!ctx.config.seederLoader) {
      logger.done();
      logger.warn('No seeder loader configured. Add seederLoader to your forge config.');
      return;
    }

    const registry = await ctx.config.seederLoader();
    const availableSeeders = Object.keys(registry);
    logger.done();

    if (availableSeeders.length === 0) {
      logger.warn('No seeders registered');
      return;
    }

    logger.info(`Found ${color.cyan(String(availableSeeders.length))} seeders`);

    // Determine which seeders to run
    let selectedSeeders: string[];
    const classFlag = this.getFlagString(ctx, 'class', 'c');

    if (classFlag) {
      // Run specific seeder(s)
      selectedSeeders = classFlag.split(',').map((s) => s.trim());

      // Validate seeder names
      for (const name of selectedSeeders) {
        if (!registry[name]) {
          logger.error(`Seeder "${name}" not found`);
          logger.info(`Available seeders: ${availableSeeders.join(', ')}`);
          return;
        }
      }
    } else if (ctx.isInteractive) {
      // Interactive mode - let user choose
      const choices = availableSeeders.map((name) => ({
        title: name,
        value: name,
        description: registry[name].prototype?.description
      }));

      // Add "Run All" option
      choices.unshift({ title: 'Run All Seeders', value: '__all__', description: 'Execute all available seeders' });

      const selection = await promptSelect('Select seeder(s) to run', choices);

      if (!selection) {
        logger.warn('No seeder selected');
        return;
      }

      if (selection === '__all__') {
        selectedSeeders = availableSeeders;
      } else {
        selectedSeeders = [selection];
      }
    } else {
      // Non-interactive: run DatabaseSeeder or first available
      if (registry['DatabaseSeeder']) {
        selectedSeeders = ['DatabaseSeeder'];
      } else if (registry['default']) {
        selectedSeeders = ['default'];
      } else {
        selectedSeeders = availableSeeders;
      }
    }

    // Ensure database exists
    logger.step('Connecting to database');
    await this.ensureDatabase(ctx);
    logger.done();

    console.log();

    // Run seeders with individual timing
    let totalTime = 0;
    let successCount = 0;

    await this.withDataSource(ctx, async (ds) => {
      const runner = new SeederRunner(ds, {
        force: this.getFlagBoolean(ctx, 'force', 'f'),
        verbose: this.getFlagBoolean(ctx, 'verbose', 'v')
      });

      for (const seederName of selectedSeeders) {
        const startTime = Date.now();
        process.stdout.write(`${color.cyan('◐')} Running ${color.dim(seederName)}...`);

        try {
          const SeederClass = registry[seederName];
          await runner.runClass(SeederClass);

          const elapsed = Date.now() - startTime;
          totalTime += elapsed;
          successCount++;

          process.stdout.write(`\r${color.green('✓')} ${seederName} ${color.dim(`(${formatElapsed(elapsed)})`)}\n`);
        } catch (err) {
          const elapsed = Date.now() - startTime;
          process.stdout.write(`\r${color.red('✗')} ${seederName} ${color.dim(`(${formatElapsed(elapsed)})`)}\n`);
          throw err;
        }
      }
    });

    console.log();
    logger.separator();
    logger.info(`Total: ${color.cyan(String(successCount))} seeder(s) in ${color.cyan(formatElapsed(totalTime))}`);
    logger.complete('All seeders completed successfully');
  }
}

export const seedRunCommand = new SeedRunCommand();
