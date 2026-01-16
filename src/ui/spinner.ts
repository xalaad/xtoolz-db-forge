import type { SpinnerOptions } from '../types';
import { colorize } from './logger';

const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  circle: ['◐', '◓', '◑', '◒'],
  square: ['◰', '◳', '◲', '◱'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  bar: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█', '▉', '▊', '▋', '▌', '▍', '▎', '▏']
};

export interface SpinnerInstance {
  update(text: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  warn(text?: string): void;
  info(text?: string): void;
  stop(): void;
}

export function startSpinner(text: string, type: keyof typeof SPINNER_FRAMES = 'dots'): NodeJS.Timeout {
  const frames = SPINNER_FRAMES[type];
  let frameIndex = 0;

  const interval = setInterval(() => {
    const frame = colorize(frames[frameIndex], 'cyan');
    process.stdout.write(`\r${frame} ${text}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);

  return interval;
}

export function stopSpinner(interval: NodeJS.Timeout, success = true, message?: string): void {
  clearInterval(interval);
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line

  if (message) {
    const symbol = success ? colorize('✓', 'green') : colorize('✗', 'red');
    console.log(`${symbol} ${message}`);
  }
}

export function createSpinner(options: SpinnerOptions): SpinnerInstance {
  const { text, color = 'cyan', spinner = SPINNER_FRAMES.dots } = options;
  const frames = Array.isArray(spinner) ? spinner : SPINNER_FRAMES.dots;

  let currentText = text;
  let frameIndex = 0;
  let interval: NodeJS.Timeout | null = null;

  const start = (): void => {
    if (interval) return;

    interval = setInterval(() => {
      const frame = colorize(frames[frameIndex], color as keyof typeof import('./logger').COLORS);
      process.stdout.write(`\r${frame} ${currentText}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);
  };

  const clearLine = (): void => {
    process.stdout.write('\r' + ' '.repeat(Math.max(currentText.length + 5, 80)) + '\r');
  };

  const stop = (): void => {
    if (interval) {
      clearInterval(interval);
      interval = null;
      clearLine();
    }
  };

  // Start immediately
  start();

  return {
    update(newText: string): void {
      currentText = newText;
    },

    succeed(finalText?: string): void {
      stop();
      const message = finalText ?? currentText;
      console.log(`${colorize('✓', 'green')} ${message}`);
    },

    fail(finalText?: string): void {
      stop();
      const message = finalText ?? currentText;
      console.log(`${colorize('✗', 'red')} ${message}`);
    },

    warn(finalText?: string): void {
      stop();
      const message = finalText ?? currentText;
      console.log(`${colorize('⚠', 'yellow')} ${message}`);
    },

    info(finalText?: string): void {
      stop();
      const message = finalText ?? currentText;
      console.log(`${colorize('ℹ', 'blue')} ${message}`);
    },

    stop(): void {
      stop();
    }
  };
}

export async function withSpinner<T>(
  text: string,
  task: () => Promise<T>,
  options?: { successText?: string; failText?: string }
): Promise<T> {
  const spinner = createSpinner({ text });

  try {
    const result = await task();
    spinner.succeed(options?.successText);
    return result;
  } catch (error) {
    spinner.fail(options?.failText ?? `Failed: ${text}`);
    throw error;
  }
}
