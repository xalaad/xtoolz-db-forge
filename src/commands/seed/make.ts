import { existsSync, promises as fs } from 'fs';
import { resolve, join, dirname } from 'path';
import type { Command, CommandContext } from '../../types';
import { BaseCommand } from '../../core/command';
import { success, warn, error, info } from '../../ui/logger';
import { promptText, promptSelect } from '../../ui/prompts';

const SEEDER_TEMPLATE = `import { BaseSeeder } from '@xtools/db-forge';

export class {{name}} extends BaseSeeder {
  name = '{{name}}';
  description = '{{description}}';

  async run(): Promise<void> {
    this.log('Running {{name}}...');

    // Example: Insert records
    // await this.insert(User, [
    //   { name: 'John', email: 'john@example.com' },
    //   { name: 'Jane', email: 'jane@example.com' }
    // ]);

    // Example: Call other seeders
    // await this.call([RoleSeeder, PermissionSeeder]);

    // Example: Conditional seeding
    // if (!this.isProduction()) {
    //   await this.call(TestDataSeeder);
    // }

    this.success('{{name}} completed');
  }
}
`;

const DATABASE_SEEDER_TEMPLATE = `import { BaseSeeder, SeederConstructor } from '@xtools/db-forge';

// Import your seeders here
// import { UserSeeder } from './user.seeder';
// import { RoleSeeder } from './role.seeder';

export class DatabaseSeeder extends BaseSeeder {
  name = 'DatabaseSeeder';
  description = 'Main entry point seeder that calls all other seeders';

  async run(): Promise<void> {
    this.log('Starting database seeding...');

    // Call your seeders in order
    await this.call([
      // UserSeeder,
      // RoleSeeder,
    ]);

    // Conditional seeders for non-production environments
    // if (!this.isProduction()) {
    //   await this.call([
    //     TestDataSeeder,
    //   ]);
    // }

    this.success('Database seeding completed');
  }
}
`;

export class SeedMakeCommand extends BaseCommand {
  meta = {
    name: 'make:seeder',
    description: 'Create a new seeder class',
    section: 'Seeders' as const,
    usage: 'forge db make:seeder --name=UserSeeder',
    examples: [
      'forge db make:seeder --name=UserSeeder',
      'forge db make:seeder --name=DatabaseSeeder --database',
      'forge db make:seeder'
    ],
    aliases: ['seed:make'],
    flags: [
      {
        name: 'name',
        alias: 'n',
        description: 'Name of the seeder class',
        type: 'string' as const
      },
      {
        name: 'database',
        alias: 'd',
        description: 'Create a DatabaseSeeder (main entry point)',
        type: 'boolean' as const,
        default: false
      }
    ]
  };

  async execute(ctx: CommandContext): Promise<void> {
    let name = this.getFlagString(ctx, 'name', 'n') ?? this.getArg(ctx, 0);
    const isDatabaseSeeder = this.getFlagBoolean(ctx, 'database', 'd');

    if (isDatabaseSeeder) {
      name = 'DatabaseSeeder';
    }

    if (!name) {
      if (ctx.isInteractive) {
        const type = await promptSelect('What type of seeder?', [
          { title: 'Regular Seeder', value: 'regular', description: 'A standard seeder class' },
          { title: 'Database Seeder', value: 'database', description: 'Main entry point that calls other seeders' }
        ]);

        if (type === 'database') {
          name = 'DatabaseSeeder';
        } else {
          name = await promptText('Seeder name (e.g., UserSeeder)');
        }
      } else {
        error('Seeder name is required. Use --name=SeederName');
        return;
      }
    }

    if (!name || name.trim().length === 0) {
      error('Seeder name cannot be empty.');
      return;
    }

    // Ensure name ends with "Seeder"
    if (!name.endsWith('Seeder')) {
      name = `${name}Seeder`;
    }

    // PascalCase the name
    name = name.charAt(0).toUpperCase() + name.slice(1);

    // Determine seeders directory
    const seedersDir = resolve(process.cwd(), ctx.config.seedersDir ?? 'src/database/seeds');

    // Ensure directory exists
    if (!existsSync(seedersDir)) {
      await fs.mkdir(seedersDir, { recursive: true });
      info(`Created seeders directory: ${seedersDir}`);
    }

    // Generate filename
    const filename = `${this.toKebabCase(name)}.ts`;
    const filepath = join(seedersDir, filename);

    // Check if file already exists
    if (existsSync(filepath)) {
      error(`Seeder already exists: ${filepath}`);
      return;
    }

    // Generate content
    const template = name === 'DatabaseSeeder' ? DATABASE_SEEDER_TEMPLATE : SEEDER_TEMPLATE;
    const content = template
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{description\}\}/g, `Seed ${name.replace('Seeder', '')} data`);

    // Write file
    await fs.writeFile(filepath, content, 'utf8');

    success(`Created seeder: ${filepath}`);

    // Remind user to register the seeder
    if (name !== 'DatabaseSeeder') {
      info('Remember to register this seeder in your seeder loader or DatabaseSeeder.');
    }
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}

export const seedMakeCommand = new SeedMakeCommand();
