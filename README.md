# @xtools/db-forge

A hacker-style database CLI tool for TypeORM and Sequelize projects. Run migrations, seeders, and database operations with an interactive terminal experience.

```
██████╗ ██████╗       ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗      ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║  ██║██████╔╝█████╗█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║  ██║██╔══██╗╚════╝██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██████╔╝██████╔╝      ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═════╝ ╚═════╝       ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

## Features

- Interactive terminal with Matrix-style aesthetics
- TypeORM and Sequelize support
- Migration management (run, revert, status, fresh)
- Seeder management with dependencies
- Command search with fuzzy matching (vim-style `!` command)
- Laravel/Artisan-inspired commands
- CI/CD friendly with --yes/--force flags

## Installation

```bash
npm install @xtools/db-forge
```

## Quick Start

### 1. Initialize Configuration

```bash
npx forge config init
```

This creates a `forge.config.ts` file in your project root.

### 2. Configure Your Project

```typescript
// forge.config.ts
import type { ForgeDbConfig } from '@xtools/db-forge';

const config: ForgeDbConfig = {
  runtime: 'typeorm',
  dataSourcePath: 'src/database/typeorm.config.ts',
  dataSourceFactory: async () => {
    const module = await import('./src/database/typeorm.config');
    return module.default;
  },
  migrationsDir: 'src/database/migrations',
  seedersDir: 'src/database/seeds'
};

export default config;
```

### 3. Run Commands

```bash
# Interactive mode
npx forge

# Run migrations
npx forge migrate

# Run seeders
npx forge seed:run

# Generate migration
npx forge make:migration --name=CreateUsersTable

# Generate seeder
npx forge make:seeder --name=UserSeeder
```

## Interactive Mode

When you run `forge` without arguments, it launches an interactive terminal with:

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate menu |
| `Enter` | Select command |
| `!` | Search and filter commands |
| `Esc` | Cancel / Exit |

### Command Search

Press `!` to enter command search mode. Type a partial command name and DB-Forge will use fuzzy matching to find commands. For example:
- `mig` matches `migrate`, `migrate:fresh`, `migrate:status`
- `seed` matches `seed:run`, `make:seeder`
- `fresh` matches `migrate:fresh`

## Commands

### Database Commands

| Command | Description |
|---------|-------------|
| `db:create` | Create the database |
| `db:drop` | Drop the database |
| `migrate:fresh` | Drop all tables and re-run migrations |

### Migration Commands

| Command | Description |
|---------|-------------|
| `migrate` | Run pending migrations |
| `migrate:revert` | Revert the last migration |
| `migrate:status` | Show migration status |
| `make:migration` | Generate a new migration file |

### Seeder Commands

| Command | Description |
|---------|-------------|
| `seed:run` | Run database seeders |
| `make:seeder` | Generate a new seeder file |

### Config Commands

| Command | Description |
|---------|-------------|
| `config init` | Create a forge.config.ts file |

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--config` | `-c` | Path to config file |
| `--yes` | `-y` | Skip confirmation prompts |
| `--force` | `-f` | Force the operation |
| `--verbose` | `-v` | Show verbose output |
| `--help` | `-h` | Show help message |
| `--version` | `-V` | Show version |

## Configuration Options

### TypeORM Configuration

```typescript
const config: ForgeDbConfig = {
  runtime: 'typeorm',

  // Path to your TypeORM data source
  dataSourcePath: 'src/database/typeorm.config.ts',

  // Factory function to create DataSource
  dataSourceFactory: async () => {
    const module = await import('./src/database/typeorm.config');
    return module.default;
  },

  // Directories
  migrationsDir: 'src/database/migrations',
  seedersDir: 'src/database/seeds'
};
```

### Sequelize Configuration

```typescript
const config: ForgeDbConfig = {
  runtime: 'sequelize',

  // Sequelize factory
  sequelizeFactory: async () => {
    const { Sequelize } = await import('sequelize');
    return new Sequelize(process.env.DB_URL!);
  },

  // Directories
  sequelizeMigrationsDir: 'src/database/migrations',
  sequelizeSeedersDir: 'src/database/seeders'
};
```

## Seeder System

DB-Forge includes a Laravel-inspired seeder system with:

- **Dependencies**: Define seeder execution order
- **Conditional Execution**: Run specific seeders with `--class` flag

### Creating a Seeder

```typescript
// src/database/seeds/user.seeder.ts
import { BaseSeeder } from '@xtools/db-forge';

export class UserSeeder extends BaseSeeder {
  name = 'UserSeeder';

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(User);

    await repo.save([
      { name: 'Admin', email: 'admin@example.com' },
      { name: 'User', email: 'user@example.com' }
    ]);
  }
}
```

### Running Seeders

```bash
# Run all seeders
npx forge seed:run

# Run a specific seeder
npx forge seed:run --class=UserSeeder

# Force re-run even if already executed
npx forge seed:run --force
```

### Registering Seeders

Configure a seeder loader in your forge config:

```typescript
// forge.config.ts
import type { ForgeDbConfig } from '@xtools/db-forge';

const config: ForgeDbConfig = {
  runtime: 'typeorm',
  // ... other config
  seederLoader: async () => {
    const { UserSeeder } = await import('./src/database/seeds/user.seeder');
    const { RoleSeeder } = await import('./src/database/seeds/role.seeder');
    return {
      UserSeeder,
      RoleSeeder
    };
  }
};
```

## CI/CD Usage

For automated pipelines, use `--yes` to skip prompts:

```bash
# Run migrations in CI
npx forge migrate --yes

# Fresh database with seeds
npx forge migrate:fresh --seed --yes
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FORGE_CONFIG` | Path to config file (default: `forge.config.ts`) |
| `DEBUG` | Enable debug output when set to `true` |
| `CI` | Auto-confirm prompts in CI environments |

## Local Development

- Sources live in `src/` and compile to `dist/` via `npm run build`
- Type helpers (`ForgeDbConfig`, etc.) are available from `@xtools/db-forge`
- Peer dependencies: `ts-node`, `dotenv`, `reflect-metadata`, `tsconfig-paths`, and your ORM (`typeorm` or `sequelize`)

## License

MIT
