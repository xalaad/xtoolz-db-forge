import type { ProgressOptions } from '../types';
import { colorize, COLORS } from './logger';

const DEFAULT_WIDTH = 40;
const PROGRESS_CHARS = {
  filled: '█',
  empty: '░',
  leftCap: '',
  rightCap: ''
};

export interface ProgressBar {
  update(current: number, message?: string): void;
  increment(message?: string): void;
  complete(message?: string): void;
  fail(message?: string): void;
}

export function renderProgress(options: ProgressOptions): void {
  const {
    total,
    current = 0,
    width = DEFAULT_WIDTH,
    showPercentage = true,
    showCount = true,
    format
  } = options;

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const filledLength = total > 0 ? Math.round((current / total) * width) : 0;
  const emptyLength = width - filledLength;

  const bar =
    PROGRESS_CHARS.leftCap +
    colorize(PROGRESS_CHARS.filled.repeat(filledLength), 'green') +
    colorize(PROGRESS_CHARS.empty.repeat(emptyLength), 'gray') +
    PROGRESS_CHARS.rightCap;

  const parts: string[] = [bar];

  if (showPercentage) {
    parts.push(colorize(`${percentage.toString().padStart(3)}%`, 'cyan'));
  }

  if (showCount) {
    parts.push(colorize(`(${current}/${total})`, 'gray'));
  }

  if (format) {
    parts.push(format);
  }

  process.stdout.write(`\r${parts.join(' ')}`);
}

export function createProgressBar(total: number, options: Partial<ProgressOptions> = {}): ProgressBar {
  let current = 0;
  const width = options.width ?? DEFAULT_WIDTH;

  const render = (message?: string): void => {
    renderProgress({
      total,
      current,
      width,
      showPercentage: options.showPercentage ?? true,
      showCount: options.showCount ?? true,
      format: message
    });
  };

  return {
    update(value: number, message?: string): void {
      current = Math.min(value, total);
      render(message);
    },

    increment(message?: string): void {
      current = Math.min(current + 1, total);
      render(message);
    },

    complete(message?: string): void {
      current = total;
      render(message);
      console.log(''); // New line after progress
      if (message) {
        console.log(`${colorize('✓', 'green')} ${message}`);
      }
    },

    fail(message?: string): void {
      console.log(''); // New line after progress
      if (message) {
        console.log(`${colorize('✗', 'red')} ${message}`);
      }
    }
  };
}

export function progressTask<T>(
  label: string,
  items: T[],
  task: (item: T, index: number) => Promise<void>
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const total = items.length;
    console.log(`${colorize('→', 'cyan')} ${label}`);

    const bar = createProgressBar(total);

    try {
      for (let i = 0; i < items.length; i++) {
        await task(items[i], i);
        bar.increment();
      }
      bar.complete();
      resolve();
    } catch (error) {
      bar.fail(`Failed at item ${bar}`);
      reject(error);
    }
  });
}
