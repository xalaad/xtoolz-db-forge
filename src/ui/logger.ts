import type { LogLevel, SeederLogger } from '../types';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
} as const;

const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  bullet: '•',
  line: '─'
} as const;

export function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function bold(text: string): string {
  return `${COLORS.bold}${text}${COLORS.reset}`;
}

export function dim(text: string): string {
  return `${COLORS.dim}${text}${COLORS.reset}`;
}

export function success(message: string): void {
  console.log(`${colorize(SYMBOLS.success, 'green')} ${message}`);
}

export function error(message: string): void {
  console.log(`${colorize(SYMBOLS.error, 'red')} ${message}`);
}

export function warn(message: string): void {
  console.log(`${colorize(SYMBOLS.warning, 'yellow')} ${message}`);
}

export function info(message: string): void {
  console.log(`${colorize(SYMBOLS.info, 'blue')} ${message}`);
}

export function debug(message: string): void {
  console.log(`${colorize(SYMBOLS.bullet, 'gray')} ${dim(message)}`);
}

export function log(message: string): void {
  console.log(message);
}

export function newLine(): void {
  console.log('');
}

export function divider(char = SYMBOLS.line, length = 60): void {
  console.log(colorize(char.repeat(length), 'gray'));
}

export function header(title: string): void {
  const line = SYMBOLS.line.repeat(60);
  console.log('');
  console.log(colorize(line, 'cyan'));
  console.log(colorize(`  ${bold(title)}`, 'cyan'));
  console.log(colorize(line, 'cyan'));
  console.log('');
}

export function subheader(title: string): void {
  console.log('');
  console.log(`${colorize(SYMBOLS.arrow, 'cyan')} ${bold(title)}`);
}

export function bullet(message: string, indent = 0): void {
  const padding = ' '.repeat(indent * 2);
  console.log(`${padding}${colorize(SYMBOLS.bullet, 'gray')} ${message}`);
}

export function arrow(message: string): void {
  console.log(`  ${colorize(SYMBOLS.arrow, 'cyan')} ${message}`);
}

export function labelValue(label: string, value: string, labelWidth = 20): void {
  const paddedLabel = label.padEnd(labelWidth);
  console.log(`  ${colorize(paddedLabel, 'gray')}${value}`);
}

export interface LoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  prefix?: string;
}

export function createLogger(options: LoggerOptions = {}): SeederLogger {
  const { verbose = false, silent = false, prefix = '' } = options;
  const prefixStr = prefix ? `[${prefix}] ` : '';

  let groupDepth = 0;
  let spinnerActive = false;
  let spinnerInterval: NodeJS.Timeout | null = null;

  const shouldLog = (level: LogLevel): boolean => {
    if (silent) return false;
    if (level === 'debug' && !verbose) return false;
    return true;
  };

  const getIndent = (): string => '  '.repeat(groupDepth);

  return {
    info(message: string): void {
      if (shouldLog('info')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.info, 'blue')} ${prefixStr}${message}`);
      }
    },

    success(message: string): void {
      if (shouldLog('success')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.success, 'green')} ${prefixStr}${message}`);
      }
    },

    warn(message: string): void {
      if (shouldLog('warn')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.warning, 'yellow')} ${prefixStr}${message}`);
      }
    },

    error(message: string): void {
      if (shouldLog('error')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.error, 'red')} ${prefixStr}${message}`);
      }
    },

    debug(message: string): void {
      if (shouldLog('debug')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.bullet, 'gray')} ${prefixStr}${dim(message)}`);
      }
    },

    table(headers: string[], rows: string[][]): void {
      if (silent) return;
      const { renderTable } = require('./table');
      renderTable({ headers, rows });
    },

    progress(current: number, total: number, message?: string): void {
      if (silent) return;
      const { renderProgress } = require('./progress');
      renderProgress({ current, total, message });
    },

    startSpinner(message: string): void {
      if (silent || spinnerActive) return;
      const { startSpinner: start } = require('./spinner');
      spinnerInterval = start(message);
      spinnerActive = true;
    },

    stopSpinner(success?: boolean, message?: string): void {
      if (!spinnerActive || !spinnerInterval) return;
      const { stopSpinner: stop } = require('./spinner');
      stop(spinnerInterval, success ?? true, message);
      spinnerInterval = null;
      spinnerActive = false;
    },

    group(title: string): void {
      if (shouldLog('info')) {
        console.log(`${getIndent()}${colorize(SYMBOLS.arrow, 'cyan')} ${bold(title)}`);
        groupDepth++;
      }
    },

    groupEnd(): void {
      if (groupDepth > 0) {
        groupDepth--;
      }
    }
  };
}

export { COLORS, SYMBOLS };
