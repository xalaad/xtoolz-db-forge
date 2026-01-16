import type { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

// ============================================================================
// Core Types
// ============================================================================

export type LogFunction = (message: string) => void;
export type ForgeRuntime = 'typeorm' | 'sequelize';

export interface EnsureDatabaseContext {
  force?: boolean;
  log: LogFunction;
}

export type EnsureDatabaseFn = (context: EnsureDatabaseContext) => Promise<void>;
export type DataSourceFactory = () => Promise<DataSource>;
export type SequelizeFactory = () => Promise<any>;

// ============================================================================
// Seeder Types
// ============================================================================

export interface SeederLogger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  table(headers: string[], rows: string[][]): void;
  progress(current: number, total: number, message?: string): void;
  startSpinner(message: string): void;
  stopSpinner(success?: boolean, message?: string): void;
  group(title: string): void;
  groupEnd(): void;
}

export interface SeederOptions {
  force?: boolean;
  fresh?: boolean;
  env?: string;
  verbose?: boolean;
  class?: string | string[];
}

export interface SeederContext {
  dataSource: DataSource;
  logger: SeederLogger;
  options: SeederOptions;
  runner: SeederRunnerInterface;
}

export interface SeederRunnerInterface {
  run(seeder: Seeder): Promise<SeederResult>;
  runClass(SeederClass: SeederConstructor): Promise<SeederResult>;
  runMultiple(seeders: SeederConstructor[]): Promise<SeederResult[]>;
}

export interface SeederResult {
  seederName: string;
  success: boolean;
  duration: number;
  recordsAffected?: number;
  error?: Error;
  children?: SeederResult[];
}

export interface Seeder {
  name: string;
  description?: string;
  run(): Promise<void>;
  setContext(context: SeederContext): void;
  getContext(): SeederContext;
}

export type SeederConstructor<T extends Seeder = Seeder> = new () => T;
export type SeederRegistry = Record<string, SeederConstructor>;
export type SeederLoader = () => Promise<SeederRegistry>;

export interface SeederGroup {
  name: string;
  description?: string;
  seeders: string[];
}

// ============================================================================
// Factory Types
// ============================================================================

export interface FactoryDefinition<T extends ObjectLiteral> {
  (): Partial<T>;
}

export interface FactoryState<T extends ObjectLiteral> {
  name: string;
  attributes: Partial<T> | ((attrs: Partial<T>) => Partial<T>);
}

export interface FactoryBuilder<T extends ObjectLiteral> {
  count(n: number): FactoryBuilder<T>;
  state(attributes: Partial<T>): FactoryBuilder<T>;
  sequence(callback: (index: number) => Partial<T>): FactoryBuilder<T>;
  make(): Promise<T[]>;
  create(): Promise<T[]>;
  createOne(): Promise<T>;
  makeOne(): T;
}

export interface Factory<T extends ObjectLiteral> {
  entity: EntityTarget<T>;
  definition(): Partial<T>;
  configure?(): void;
}

export type FactoryConstructor<T extends ObjectLiteral> = new (dataSource: DataSource) => Factory<T>;

// ============================================================================
// Command Types
// ============================================================================

export type FlagMap = Record<string, string | boolean>;

export interface ParsedArgs {
  args: string[];
  flags: FlagMap;
}

export interface CommandContext {
  config: ForgeDbConfig;
  flags: FlagMap;
  args: string[];
  isInteractive: boolean;
  scope: string;
  dataSource?: DataSource;
}

export type CommandSection =
  | 'General'
  | 'Database'
  | 'Migrations'
  | 'Seeders'
  | 'Factories'
  | 'Configuration'
  | string;

export interface CommandMeta {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  section?: CommandSection;
  aliases?: string[];
  flags?: CommandFlag[];
  requiresDatabase?: boolean;
  requiresConfirmation?: boolean;
}

export interface CommandFlag {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  default?: string | boolean | number;
  required?: boolean;
}

export interface Command {
  meta: CommandMeta;
  execute(ctx: CommandContext): Promise<void>;
}

export type CommandConstructor = new () => Command;

/**
 * Legacy command definition type (for backwards compatibility with utils.ts)
 * @deprecated Use Command interface instead
 */
export interface CommandDefinition {
  key: string;
  label: string;
  description: string;
  section?: string;
  usage?: string;
  confirm?: boolean;
  handler: (ctx: CommandContext) => Promise<void>;
}

// ============================================================================
// Config Types
// ============================================================================

export interface ForgeDbConfig {
  /**
   * Preferred runtime. When omitted, the CLI will infer it based on provided options.
   */
  runtime?: ForgeRuntime;

  /**
   * TypeORM: factory returning a fresh DataSource instance.
   */
  dataSourceFactory?: DataSourceFactory;

  /**
   * TypeORM: path to the DataSource entry module (used for migration generation).
   */
  dataSourcePath?: string;

  /**
   * Base migrations directory (used for both runtimes when applicable).
   */
  migrationsDir?: string;

  /**
   * Directory containing seeder files.
   */
  seedersDir?: string;

  /**
   * Directory containing factory files.
   */
  factoriesDir?: string;

  /**
   * Optional hook to ensure a database exists prior to running migrations/seeds.
   */
  ensureDatabase?: EnsureDatabaseFn;

  /**
   * TypeORM: optional hook that resolves available seeders.
   */
  seederLoader?: SeederLoader;

  /**
   * Seeder groups for convenient batch seeding.
   */
  seederGroups?: Record<string, SeederGroup>;

  /**
   * Sequelize: factory returning a configured Sequelize instance.
   */
  sequelizeFactory?: SequelizeFactory;

  /**
   * Sequelize: directory containing migration files.
   */
  sequelizeMigrationsDir?: string;

  /**
   * Sequelize: directory containing seeder files.
   */
  sequelizeSeedersDir?: string;

  /**
   * Sequelize CLI: config file path for migration generation (optional).
   */
  sequelizeConfigPath?: string;
}

// ============================================================================
// UI Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface TableOptions {
  headers: string[];
  rows: string[][];
  border?: boolean;
  headerColor?: string;
}

export interface ProgressOptions {
  total: number;
  current?: number;
  width?: number;
  format?: string;
  showPercentage?: boolean;
  showCount?: boolean;
}

export interface SpinnerOptions {
  text: string;
  color?: string;
  spinner?: string[];
}
