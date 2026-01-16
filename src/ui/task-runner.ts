/**
 * Live Task Runner with spinners and elapsed time
 * Beautiful progress tracking for migrations, seeds, and database operations
 */

import * as p from '@clack/prompts';
import color from 'picocolors';

export interface TaskStep {
  name: string;
  run: () => Promise<void>;
}

export interface TaskOptions {
  title: string;
  steps?: TaskStep[];
}

/**
 * Format elapsed time nicely
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins}m ${secs}s`;
}

/**
 * Create a live updating timer display
 */
class LiveTimer {
  private startTime: number;
  private interval: NodeJS.Timeout | null = null;
  private currentMessage: string = '';

  constructor() {
    this.startTime = Date.now();
  }

  start(message: string): void {
    this.currentMessage = message;
    this.startTime = Date.now();

    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25l'); // Hide cursor

      this.interval = setInterval(() => {
        const elapsed = formatElapsed(Date.now() - this.startTime);
        process.stdout.write(`\r${color.cyan('◐')} ${this.currentMessage} ${color.dim(`(${elapsed})`)}\x1b[K`);
      }, 100);
    } else {
      console.log(`${color.cyan('○')} ${message}...`);
    }
  }

  update(message: string): void {
    this.currentMessage = message;
    if (!process.stdout.isTTY) {
      console.log(`  ${color.dim('→')} ${message}`);
    }
  }

  stop(success: boolean, message?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const elapsed = formatElapsed(Date.now() - this.startTime);
    const finalMessage = message || this.currentMessage;

    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K'); // Clear line
      process.stdout.write('\x1b[?25h'); // Show cursor
    }

    if (success) {
      console.log(`${color.green('✓')} ${finalMessage} ${color.dim(`(${elapsed})`)}`);
    } else {
      console.log(`${color.red('✗')} ${finalMessage} ${color.dim(`(${elapsed})`)}`);
    }
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Task Logger for tracking operation progress
 */
export class TaskLogger {
  private timer: LiveTimer;
  private stepCount: number = 0;
  private currentStep: number = 0;
  private title: string;

  constructor(title: string) {
    this.title = title;
    this.timer = new LiveTimer();
  }

  /**
   * Start the task
   */
  start(message?: string): void {
    console.log();
    p.log.step(color.bold(this.title));
    if (message) {
      this.timer.start(message);
    }
  }

  /**
   * Log a sub-step starting
   */
  step(message: string): void {
    this.currentStep++;
    const prefix = this.stepCount > 0
      ? `[${this.currentStep}/${this.stepCount}] `
      : '';
    this.timer.start(`${prefix}${message}`);
  }

  /**
   * Update the current step message
   */
  update(message: string): void {
    this.timer.update(message);
  }

  /**
   * Complete current step successfully
   */
  done(message?: string): void {
    this.timer.stop(true, message);
  }

  /**
   * Mark current step as failed
   */
  fail(message?: string): void {
    this.timer.stop(false, message);
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    console.log(`${color.blue('ℹ')} ${message}`);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    console.log(`${color.yellow('!')} ${message}`);
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    console.log(`${color.red('✗')} ${message}`);
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    console.log(`${color.green('✓')} ${message}`);
  }

  /**
   * Set total step count for progress display
   */
  setStepCount(count: number): void {
    this.stepCount = count;
    this.currentStep = 0;
  }

  /**
   * Log a dimmed detail message
   */
  detail(message: string): void {
    console.log(`  ${color.dim(message)}`);
  }

  /**
   * Log a list item
   */
  item(label: string, value?: string): void {
    if (value) {
      console.log(`  ${color.dim('•')} ${label}: ${color.cyan(value)}`);
    } else {
      console.log(`  ${color.dim('•')} ${label}`);
    }
  }

  /**
   * Print a separator line
   */
  separator(): void {
    console.log(color.dim('  ' + '─'.repeat(50)));
  }

  /**
   * Complete the task with summary
   */
  complete(summary?: string): void {
    console.log();
    if (summary) {
      p.log.success(summary);
    }
  }
}

/**
 * Run multiple tasks with live progress
 */
export async function runTasks(
  title: string,
  tasks: { name: string; task: () => Promise<void> }[]
): Promise<void> {
  const logger = new TaskLogger(title);
  logger.start();
  logger.setStepCount(tasks.length);

  const startTime = Date.now();

  for (const { name, task } of tasks) {
    logger.step(name);
    try {
      await task();
      logger.done();
    } catch (error) {
      logger.fail();
      throw error;
    }
  }

  const totalTime = formatElapsed(Date.now() - startTime);
  logger.complete(`All tasks completed in ${color.cyan(totalTime)}`);
}

/**
 * Run a single task with spinner
 */
export async function runTask<T>(
  message: string,
  task: () => Promise<T>
): Promise<T> {
  const timer = new LiveTimer();
  timer.start(message);

  try {
    const result = await task();
    timer.stop(true);
    return result;
  } catch (error) {
    timer.stop(false);
    throw error;
  }
}

/**
 * Create a progress tracker for migrations/seeds
 */
export function createProgressTracker(title: string) {
  return new TaskLogger(title);
}

export { formatElapsed };
