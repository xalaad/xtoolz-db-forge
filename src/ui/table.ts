import type { TableOptions } from '../types';
import { colorize, bold } from './logger';

export interface ColumnConfig {
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
}

const BOX_CHARS = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼'
};

const SIMPLE_BOX_CHARS = {
  topLeft: '',
  topRight: '',
  bottomLeft: '',
  bottomRight: '',
  horizontal: '-',
  vertical: '|',
  leftT: '',
  rightT: '',
  topT: '',
  bottomT: '',
  cross: '+'
};

function calculateColumnWidths(headers: string[], rows: string[][]): number[] {
  const widths = headers.map((h) => h.length);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellLength = stripAnsi(row[i] ?? '').length;
      if (i < widths.length) {
        widths[i] = Math.max(widths[i], cellLength);
      } else {
        widths.push(cellLength);
      }
    }
  }

  return widths.map((w) => Math.min(w + 2, 50)); // Add padding, max 50
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function padCell(content: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const stripped = stripAnsi(content);
  const padding = width - stripped.length;

  if (padding <= 0) {
    return content.slice(0, width);
  }

  switch (align) {
    case 'center': {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left) + content + ' '.repeat(right);
    }
    case 'right':
      return ' '.repeat(padding) + content;
    default:
      return content + ' '.repeat(padding);
  }
}

export function renderTable(options: TableOptions): void {
  const { headers, rows, border = true, headerColor = 'cyan' } = options;
  const widths = calculateColumnWidths(headers, rows);
  const chars = border ? BOX_CHARS : SIMPLE_BOX_CHARS;

  // Header row
  if (border) {
    const topBorder =
      chars.topLeft +
      widths.map((w) => chars.horizontal.repeat(w)).join(chars.topT) +
      chars.topRight;
    console.log(colorize(topBorder, 'gray'));
  }

  const headerRow = headers.map((h, i) =>
    colorize(bold(padCell(h, widths[i], 'center')), headerColor as keyof typeof import('./logger').COLORS)
  );

  console.log(
    colorize(chars.vertical, 'gray') +
    headerRow.join(colorize(chars.vertical, 'gray')) +
    colorize(chars.vertical, 'gray')
  );

  // Separator
  if (border) {
    const separator =
      chars.leftT +
      widths.map((w) => chars.horizontal.repeat(w)).join(chars.cross) +
      chars.rightT;
    console.log(colorize(separator, 'gray'));
  }

  // Data rows
  for (const row of rows) {
    const cells = widths.map((w, i) => padCell(row[i] ?? '', w, 'left'));
    console.log(
      colorize(chars.vertical, 'gray') +
      cells.join(colorize(chars.vertical, 'gray')) +
      colorize(chars.vertical, 'gray')
    );
  }

  // Bottom border
  if (border) {
    const bottomBorder =
      chars.bottomLeft +
      widths.map((w) => chars.horizontal.repeat(w)).join(chars.bottomT) +
      chars.bottomRight;
    console.log(colorize(bottomBorder, 'gray'));
  }
}

export function simpleTable(headers: string[], rows: string[][]): void {
  renderTable({ headers, rows, border: false });
}

export function keyValueTable(data: Record<string, string | number | boolean | undefined>): void {
  const rows = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)]);

  renderTable({
    headers: ['Property', 'Value'],
    rows,
    border: true
  });
}
