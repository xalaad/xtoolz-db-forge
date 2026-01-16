/**
 * Enterprise-grade interactive terminal
 * Beautiful modern styling with @clack/prompts
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import { THEME, SYMBOLS, ASCII_BANNER, primary, accent, muted, highlight, gradient } from './theme';

export interface MenuItem {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

export interface TerminalConfig {
  title?: string;
  subtitle?: string;
  showBanner?: boolean;
}

export class Terminal {
  private config: TerminalConfig;

  constructor(config: TerminalConfig = {}) {
    this.config = {
      title: 'DB-FORGE',
      subtitle: 'Database CLI Tool',
      showBanner: true,
      ...config
    };
  }

  /**
   * Print styled banner
   */
  printBanner(): void {
    console.clear();
    console.log();
    console.log(gradient(ASCII_BANNER));
    console.log();

    // Beautiful intro with clack
    p.intro(color.bgCyan(color.black(` ${this.config.title} v${this.getVersion()} `)));

    console.log();
    console.log(`  ${color.dim('Runtime:')} ${color.cyan(this.config.subtitle || '')}`);
    console.log();
  }

  /**
   * Print divider line
   */
  printDivider(char = '─', length = 60): void {
    console.log(color.dim(`  ${char.repeat(length)}`));
  }

  /**
   * Print section header
   */
  printSection(title: string): void {
    console.log();
    console.log(`  ${color.cyan('◆')} ${color.bold(title)}`);
    console.log(color.dim(`  ${'─'.repeat(50)}`));
  }

  /**
   * Interactive menu selection using clack
   */
  async selectMenu(items: MenuItem[], title?: string): Promise<MenuItem | null> {
    if (!process.stdin.isTTY) {
      return items.find(i => !i.disabled) || null;
    }

    // Group items by section
    const groups = new Map<string, MenuItem[]>();
    items.forEach(item => {
      const group = item.group || 'Commands';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    });

    // Build options for clack select
    const options: { value: MenuItem; label: string; hint?: string }[] = [];

    groups.forEach((groupItems, groupName) => {
      groupItems.forEach(item => {
        if (!item.disabled) {
          options.push({
            value: item,
            label: item.label,
            hint: item.description || ''
          });
        }
      });
    });

    const result = await p.select({
      message: title || 'Select a command',
      options,
      initialValue: options[0]?.value
    });

    if (p.isCancel(result)) {
      return null;
    }

    return result as MenuItem;
  }

  /**
   * Confirmation prompt
   */
  async confirm(message: string, defaultValue = true): Promise<boolean> {
    if (!process.stdin.isTTY) return defaultValue;

    const result = await p.confirm({
      message,
      initialValue: defaultValue
    });

    if (p.isCancel(result)) {
      return false;
    }

    return result;
  }

  /**
   * Text input
   */
  async prompt(message: string, defaultValue?: string): Promise<string> {
    const result = await p.text({
      message,
      placeholder: defaultValue,
      defaultValue
    });

    if (p.isCancel(result)) {
      return defaultValue || '';
    }

    return result;
  }

  /**
   * Select from choices
   */
  async select<T extends string>(message: string, choices: { label: string; value: T }[]): Promise<T | null> {
    const options = choices.map(c => ({ value: c.value as T, label: c.label }));

    const result = await p.select({
      message,
      options: options as any
    });

    if (p.isCancel(result)) {
      return null;
    }

    return result as T;
  }

  /**
   * Print status message
   */
  printStatus(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    switch (type) {
      case 'success':
        console.log(`  ${color.green('✓')} ${message}`);
        break;
      case 'error':
        console.log(`  ${color.red('✗')} ${message}`);
        break;
      case 'warning':
        console.log(`  ${color.yellow('!')} ${message}`);
        break;
      case 'info':
        console.log(`  ${color.blue('ℹ')} ${message}`);
        break;
    }
  }

  /**
   * Print success message
   */
  success(message: string): void {
    this.printStatus('success', message);
  }

  /**
   * Print error message
   */
  error(message: string): void {
    this.printStatus('error', message);
  }

  /**
   * Print warning message
   */
  warn(message: string): void {
    this.printStatus('warning', message);
  }

  /**
   * Print info message
   */
  info(message: string): void {
    this.printStatus('info', message);
  }

  /**
   * Print timing
   */
  printTiming(startTime: number, label = 'Completed'): void {
    const duration = Date.now() - startTime;
    const formatted = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    console.log();
    console.log(color.dim(`  → ${label} in ${color.cyan(formatted)}`));
  }

  /**
   * Spinner wrapper using clack
   */
  async withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
    const s = p.spinner();
    s.start(message);

    try {
      const result = await fn();
      s.stop(color.green('✓ ') + message);
      return result;
    } catch (error) {
      s.stop(color.red('✗ ') + message);
      throw error;
    }
  }

  /**
   * Print box with content
   */
  printBox(title: string, lines: string[]): void {
    console.log();
    p.note(lines.join('\n'), title);
  }

  /**
   * Print goodbye message
   */
  printGoodbye(): void {
    p.outro(color.dim('Session ended. Goodbye!'));
  }

  /**
   * Log a clack-style message
   */
  log(message: string): void {
    p.log.message(message);
  }

  /**
   * Log a step
   */
  step(message: string): void {
    p.log.step(message);
  }

  private getVersion(): string {
    try {
      return require('../../package.json').version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  clear(): void {
    console.clear();
  }
}

export const terminal = new Terminal();
