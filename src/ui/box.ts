import { colorize, bold } from './logger';

const BOX_CHARS = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  // Alternative styles
  doubleTopLeft: '╔',
  doubleTopRight: '╗',
  doubleBottomLeft: '╚',
  doubleBottomRight: '╝',
  doubleHorizontal: '═',
  doubleVertical: '║'
};

export type BoxStyle = 'single' | 'double' | 'rounded';

export interface BoxOptions {
  title?: string;
  style?: BoxStyle;
  padding?: number;
  borderColor?: string;
  titleColor?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

function getBoxChars(style: BoxStyle) {
  switch (style) {
    case 'double':
      return {
        topLeft: BOX_CHARS.doubleTopLeft,
        topRight: BOX_CHARS.doubleTopRight,
        bottomLeft: BOX_CHARS.doubleBottomLeft,
        bottomRight: BOX_CHARS.doubleBottomRight,
        horizontal: BOX_CHARS.doubleHorizontal,
        vertical: BOX_CHARS.doubleVertical
      };
    case 'rounded':
    case 'single':
    default:
      return {
        topLeft: BOX_CHARS.topLeft,
        topRight: BOX_CHARS.topRight,
        bottomLeft: BOX_CHARS.bottomLeft,
        bottomRight: BOX_CHARS.bottomRight,
        horizontal: BOX_CHARS.horizontal,
        vertical: BOX_CHARS.vertical
      };
  }
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function padLine(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const strippedLength = stripAnsi(text).length;
  const padding = width - strippedLength;

  if (padding <= 0) return text;

  switch (align) {
    case 'center': {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    }
    case 'right':
      return ' '.repeat(padding) + text;
    default:
      return text + ' '.repeat(padding);
  }
}

export function box(content: string | string[], options: BoxOptions = {}): void {
  const {
    title,
    style = 'rounded',
    padding = 1,
    borderColor = 'cyan',
    titleColor = 'cyan',
    align = 'left'
  } = options;

  const chars = getBoxChars(style);
  const lines = Array.isArray(content) ? content : content.split('\n');

  // Calculate width
  const contentWidth = Math.max(
    ...lines.map((l) => stripAnsi(l).length),
    title ? stripAnsi(title).length + 4 : 0
  );
  const innerWidth = options.width ?? contentWidth + padding * 2;
  const totalWidth = innerWidth + 2; // +2 for borders

  const hr = chars.horizontal.repeat(innerWidth);
  const paddingStr = ' '.repeat(padding);

  // Top border with optional title
  let topLine: string;
  if (title) {
    const titleStr = ` ${bold(title)} `;
    const titleLength = stripAnsi(titleStr).length;
    const leftHr = chars.horizontal.repeat(Math.floor((innerWidth - titleLength) / 2));
    const rightHr = chars.horizontal.repeat(innerWidth - leftHr.length - titleLength);
    topLine = chars.topLeft + leftHr + colorize(titleStr, titleColor as keyof typeof import('./logger').COLORS) + rightHr + chars.topRight;
  } else {
    topLine = chars.topLeft + hr + chars.topRight;
  }

  console.log(colorize(topLine, borderColor as keyof typeof import('./logger').COLORS));

  // Empty line for top padding
  for (let i = 0; i < padding - 1; i++) {
    console.log(
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS) +
      ' '.repeat(innerWidth) +
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS)
    );
  }

  // Content lines
  for (const line of lines) {
    const paddedLine = paddingStr + padLine(line, innerWidth - padding * 2, align) + paddingStr;
    console.log(
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS) +
      paddedLine +
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS)
    );
  }

  // Empty line for bottom padding
  for (let i = 0; i < padding - 1; i++) {
    console.log(
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS) +
      ' '.repeat(innerWidth) +
      colorize(chars.vertical, borderColor as keyof typeof import('./logger').COLORS)
    );
  }

  // Bottom border
  const bottomLine = chars.bottomLeft + hr + chars.bottomRight;
  console.log(colorize(bottomLine, borderColor as keyof typeof import('./logger').COLORS));
}

export function banner(title: string, subtitle?: string): void {
  const lines = [bold(title)];
  if (subtitle) {
    lines.push(colorize(subtitle, 'gray'));
  }

  box(lines, {
    style: 'double',
    borderColor: 'cyan',
    padding: 2,
    align: 'center'
  });
}

export function infoBox(title: string, content: string | string[]): void {
  box(content, {
    title,
    style: 'rounded',
    borderColor: 'blue',
    titleColor: 'blue',
    padding: 1
  });
}

export function successBox(title: string, content: string | string[]): void {
  box(content, {
    title: `✓ ${title}`,
    style: 'rounded',
    borderColor: 'green',
    titleColor: 'green',
    padding: 1
  });
}

export function errorBox(title: string, content: string | string[]): void {
  box(content, {
    title: `✗ ${title}`,
    style: 'rounded',
    borderColor: 'red',
    titleColor: 'red',
    padding: 1
  });
}

export function warnBox(title: string, content: string | string[]): void {
  box(content, {
    title: `⚠ ${title}`,
    style: 'rounded',
    borderColor: 'yellow',
    titleColor: 'yellow',
    padding: 1
  });
}
