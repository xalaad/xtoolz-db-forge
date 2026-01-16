import type { DataSource } from 'typeorm';
import type {
  Seeder,
  SeederConstructor,
  SeederContext,
  SeederOptions,
  SeederResult,
  SeederRunnerInterface,
  SeederLogger
} from '../types';
import { createLogger } from '../ui/logger';
import { createSpinner } from '../ui/spinner';
import { renderTable } from '../ui/table';

export class SeederRunner implements SeederRunnerInterface {
  private dataSource: DataSource;
  private options: SeederOptions;
  private logger: SeederLogger;
  private results: SeederResult[] = [];

  constructor(
    dataSource: DataSource,
    options: SeederOptions = {}
  ) {
    this.dataSource = dataSource;
    this.options = options;
    this.logger = createLogger({
      verbose: options.verbose,
      prefix: 'seeder'
    });
  }

  async run(seeder: Seeder): Promise<SeederResult> {
    const startTime = Date.now();
    const spinner = createSpinner({ text: `Running ${seeder.name}...` });

    try {
      // Set context
      const context: SeederContext = {
        dataSource: this.dataSource,
        logger: this.logger,
        options: this.options,
        runner: this
      };
      seeder.setContext(context);

      // Run the seeder
      await seeder.run();

      const duration = Date.now() - startTime;
      const recordsAffected = (seeder as unknown as { getRecordsAffected?: () => number }).getRecordsAffected?.() ?? 0;

      spinner.succeed(`${seeder.name} completed in ${duration}ms (${recordsAffected} records)`);

      const result: SeederResult = {
        seederName: seeder.name,
        success: true,
        duration,
        recordsAffected
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      spinner.fail(`${seeder.name} failed: ${error instanceof Error ? error.message : String(error)}`);

      const result: SeederResult = {
        seederName: seeder.name,
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error))
      };

      this.results.push(result);
      return result;
    }
  }

  async runClass(SeederClass: SeederConstructor): Promise<SeederResult> {
    const seeder = new SeederClass();
    return this.run(seeder);
  }

  async runMultiple(seeders: SeederConstructor[]): Promise<SeederResult[]> {
    const results: SeederResult[] = [];
    const total = seeders.length;

    this.logger.info(`Running ${total} seeder(s)...`);
    console.log('');

    for (let i = 0; i < seeders.length; i++) {
      const SeederClass = seeders[i];
      const result = await this.runClass(SeederClass);
      results.push(result);

      if (!result.success && !this.options.force) {
        this.logger.error(`Stopping due to failure in ${result.seederName}`);
        break;
      }
    }

    // Print summary
    this.printSummary(results);

    return results;
  }

  getResults(): SeederResult[] {
    return [...this.results];
  }

  private printSummary(results: SeederResult[]): void {
    console.log('');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const totalRecords = results.reduce((sum, r) => sum + (r.recordsAffected ?? 0), 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    renderTable({
      headers: ['Seeder', 'Status', 'Duration', 'Records'],
      rows: results.map((r) => [
        r.seederName,
        r.success ? '✓ Success' : '✗ Failed',
        `${r.duration}ms`,
        String(r.recordsAffected ?? 0)
      ])
    });

    console.log('');
    this.logger.info(
      `Summary: ${successful.length} succeeded, ${failed.length} failed, ${totalRecords} records in ${totalDuration}ms`
    );
  }
}

export function createSeederRunner(
  dataSource: DataSource,
  options: SeederOptions = {}
): SeederRunner {
  return new SeederRunner(dataSource, options);
}
