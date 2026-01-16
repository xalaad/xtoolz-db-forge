/**
 * Hacker-style terminal theme
 * Matrix/cyberpunk inspired colors and symbols
 */

export const THEME = {
  // Primary colors - Matrix green palette
  primary: '\x1b[38;5;46m',      // Bright green
  secondary: '\x1b[38;5;34m',    // Dark green
  accent: '\x1b[38;5;51m',       // Cyan

  // Status colors
  success: '\x1b[38;5;46m',      // Green
  error: '\x1b[38;5;196m',       // Red
  warning: '\x1b[38;5;214m',     // Orange
  info: '\x1b[38;5;39m',         // Blue

  // Neutral colors
  text: '\x1b[38;5;252m',        // Light gray
  muted: '\x1b[38;5;240m',       // Dark gray
  dim: '\x1b[38;5;236m',         // Very dark gray
  highlight: '\x1b[38;5;231m',   // White

  // Effects
  bold: '\x1b[1m',
  dim_effect: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  reset: '\x1b[0m',

  // Background
  bgDark: '\x1b[48;5;232m',
  bgHighlight: '\x1b[48;5;236m',
  bgSuccess: '\x1b[48;5;22m',
  bgError: '\x1b[48;5;52m',
} as const;

export const SYMBOLS = {
  // Hacker-style symbols
  prompt: '❯',
  cursor: '█',
  arrow: '→',
  arrowRight: '▶',
  arrowDown: '▼',
  check: '✓',
  cross: '✗',
  bullet: '•',
  line: '─',
  doubleLine: '═',
  corner: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
  },
  vertical: '│',
  horizontal: '─',
  tee: {
    left: '├',
    right: '┤',
    top: '┬',
    bottom: '┴',
  },
  cross_symbol: '┼',

  // Spinners
  spinnerFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],

  // Status
  success: '[✓]',
  error: '[✗]',
  warning: '[!]',
  info: '[i]',
  running: '[~]',
  pending: '[○]',

  // Decorative
  star: '★',
  diamond: '◆',
  square: '■',
  circle: '●',
  triangleUp: '▲',
  triangleDown: '▼',
} as const;

// ASCII art for the banner
export const ASCII_BANNER = `
██████╗ ██████╗       ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗      ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║  ██║██████╔╝█████╗█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║  ██║██╔══██╗╚════╝██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██████╔╝██████╔╝      ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═════╝ ╚═════╝       ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
`;

export const ASCII_BANNER_SMALL = `
┌─┐┌─┐┬─┐┌─┐┌─┐
├┤ │ │├┬┘│ ┬├┤
└  └─┘┴└─└─┘└─┘
`;

// Helper functions
export function c(text: string, color: keyof typeof THEME): string {
  return `${THEME[color]}${text}${THEME.reset}`;
}

export function primary(text: string): string {
  return c(text, 'primary');
}

export function secondary(text: string): string {
  return c(text, 'secondary');
}

export function accent(text: string): string {
  return c(text, 'accent');
}

export function muted(text: string): string {
  return c(text, 'muted');
}

export function highlight(text: string): string {
  return `${THEME.bold}${THEME.highlight}${text}${THEME.reset}`;
}

export function statusColor(status: 'success' | 'error' | 'warning' | 'info', text: string): string {
  return `${THEME[status]}${text}${THEME.reset}`;
}

// Gradient effect (simulated with color stepping)
export function gradient(text: string): string {
  const colors = [46, 47, 48, 49, 50, 51]; // Green to cyan
  let result = '';
  const chars = text.split('');
  chars.forEach((char, i) => {
    const colorIndex = Math.floor((i / chars.length) * colors.length);
    result += `\x1b[38;5;${colors[colorIndex]}m${char}`;
  });
  return result + THEME.reset;
}

// Matrix-style rain character
export function matrixChar(): string {
  const chars = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789';
  return chars[Math.floor(Math.random() * chars.length)];
}
