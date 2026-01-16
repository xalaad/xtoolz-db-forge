import type { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import type {
  Seeder,
  SeederContext,
  SeederConstructor,
  SeederLogger,
  SeederResult,
  SeederRunnerInterface
} from '../types';

export abstract class BaseSeeder implements Seeder {
  abstract name: string;
  description?: string;

  protected context!: SeederContext;
  protected recordsAffected = 0;

  setContext(context: SeederContext): void {
    this.context = context;
  }

  getContext(): SeederContext {
    return this.context;
  }

  abstract run(): Promise<void>;

  // ============================================================================
  // Laravel-like call() method for chaining seeders
  // ============================================================================

  protected async call(seeders: SeederConstructor | SeederConstructor[]): Promise<SeederResult[]> {
    const seederList = Array.isArray(seeders) ? seeders : [seeders];
    const results: SeederResult[] = [];

    for (const SeederClass of seederList) {
      const result = await this.context.runner.runClass(SeederClass);
      results.push(result);
    }

    return results;
  }

  protected async callIf(
    condition: boolean | (() => boolean | Promise<boolean>),
    seeders: SeederConstructor | SeederConstructor[]
  ): Promise<SeederResult[]> {
    const shouldRun = typeof condition === 'function' ? await condition() : condition;

    if (shouldRun) {
      return this.call(seeders);
    }

    return [];
  }

  protected async callUnless(
    condition: boolean | (() => boolean | Promise<boolean>),
    seeders: SeederConstructor | SeederConstructor[]
  ): Promise<SeederResult[]> {
    const shouldSkip = typeof condition === 'function' ? await condition() : condition;
    return this.callIf(!shouldSkip, seeders);
  }

  // ============================================================================
  // Data Source Helpers
  // ============================================================================

  protected get dataSource(): DataSource {
    return this.context.dataSource;
  }

  protected get logger(): SeederLogger {
    return this.context.logger;
  }

  protected get options() {
    return this.context.options;
  }

  protected getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.dataSource.getRepository(entity);
  }

  protected async query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T> {
    return this.dataSource.query(sql, parameters);
  }

  protected async transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async () => {
      return work();
    });
  }

  // ============================================================================
  // Record Tracking
  // ============================================================================

  protected addRecords(count: number): void {
    this.recordsAffected += count;
  }

  getRecordsAffected(): number {
    return this.recordsAffected;
  }

  // ============================================================================
  // Conditional Execution Helpers
  // ============================================================================

  protected isProduction(): boolean {
    return this.context.options.env === 'production' || process.env.NODE_ENV === 'production';
  }

  protected isDevelopment(): boolean {
    return this.context.options.env === 'development' || process.env.NODE_ENV === 'development';
  }

  protected isTest(): boolean {
    return this.context.options.env === 'test' || process.env.NODE_ENV === 'test';
  }

  protected isFresh(): boolean {
    return this.context.options.fresh === true;
  }

  protected isForced(): boolean {
    return this.context.options.force === true;
  }

  // ============================================================================
  // Bulk Insert Helpers
  // ============================================================================

  protected async insert<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    data: Partial<T>[]
  ): Promise<T[]> {
    const repo = this.getRepository(entity);
    const entities = repo.create(data as T[]);
    const saved = await repo.save(entities);
    this.addRecords(saved.length);
    return saved;
  }

  protected async insertOne<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    data: Partial<T>
  ): Promise<T> {
    const repo = this.getRepository(entity);
    const created = repo.create(data as T);
    const saved = await repo.save(created);
    this.addRecords(1);
    return saved;
  }

  protected async upsert<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    data: Partial<T>[],
    conflictColumns: string[]
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(entity)
      .values(data)
      .orUpdate(Object.keys(data[0] ?? {}), conflictColumns)
      .execute();
    this.addRecords(data.length);
  }

  protected async truncate<T extends ObjectLiteral>(entity: EntityTarget<T>): Promise<void> {
    const repo = this.getRepository(entity);
    const tableName = repo.metadata.tableName;
    await this.query(`TRUNCATE TABLE ${tableName}`);
    this.logger.warn(`Truncated table: ${tableName}`);
  }

  // ============================================================================
  // Logging Helpers
  // ============================================================================

  protected log(message: string): void {
    this.logger.info(message);
  }

  protected debug(message: string): void {
    this.logger.debug(message);
  }

  protected success(message: string): void {
    this.logger.success(message);
  }

  protected warn(message: string): void {
    this.logger.warn(message);
  }

  protected error(message: string): void {
    this.logger.error(message);
  }

  protected progress(current: number, total: number, message?: string): void {
    this.logger.progress(current, total, message);
  }

  protected table(headers: string[], rows: string[][]): void {
    this.logger.table(headers, rows);
  }

  protected group(title: string): void {
    this.logger.group(title);
  }

  protected groupEnd(): void {
    this.logger.groupEnd();
  }
}

// Type guard for seeder
export function isSeeder(obj: unknown): obj is Seeder {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'name' in obj &&
    'run' in obj &&
    'setContext' in obj &&
    'getContext' in obj
  );
}

// Factory function for simple seeders
export function createSeeder(
  name: string,
  run: (ctx: SeederContext) => Promise<void>,
  description?: string
): SeederConstructor {
  return class extends BaseSeeder {
    name = name;
    description = description;

    async run(): Promise<void> {
      await run(this.context);
    }
  };
}
