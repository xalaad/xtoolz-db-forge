import color from 'picocolors';

/**
 * Status bar manager - displays persistent hints at bottom of terminal
 */
export class StatusBar {
  private hints: string;
  private enabled: boolean = true;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(hints?: string) {
    this.hints = hints || '↑/↓ Navigate  •  Enter Select  •  ! Search  •  Esc Cancel';
  }

  /**
   * Get terminal dimensions
   */
  private getTerminalSize(): { rows: number; cols: number } {
    return {
      rows: process.stdout.rows || 24,
      cols: process.stdout.columns || 80
    };
  }

  /**
   * Move cursor to bottom of terminal and draw status bar
   */
  draw(): void {
    if (!this.enabled || !process.stdout.isTTY) return;

    const { rows, cols } = this.getTerminalSize();
    const hint = this.hints;

    // Save cursor position
    process.stdout.write('\x1b7');

    // Move to the very last line
    process.stdout.write(`\x1b[${rows};1H`);

    // Clear line
    process.stdout.write('\x1b[2K');

    // Center the hint text (no background, just dim text)
    const padding = Math.max(0, Math.floor((cols - hint.length) / 2));
    process.stdout.write(' '.repeat(padding) + color.dim(hint));

    // Restore cursor position
    process.stdout.write('\x1b8');
  }

  /**
   * Clear the status bar
   */
  clear(): void {
    if (!process.stdout.isTTY) return;

    const { rows } = this.getTerminalSize();

    // Save cursor position
    process.stdout.write('\x1b7');

    // Move to last line and clear
    process.stdout.write(`\x1b[${rows};1H`);
    process.stdout.write('\x1b[2K');

    // Restore cursor position
    process.stdout.write('\x1b8');
  }

  /**
   * Enable/disable the status bar
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
      this.stopAutoRefresh();
    }
  }

  /**
   * Start auto-refreshing the status bar
   */
  startAutoRefresh(intervalMs: number = 500): void {
    this.stopAutoRefresh();
    this.intervalId = setInterval(() => {
      this.draw();
    }, intervalMs);
    // Don't let this interval prevent process from exiting
    this.intervalId.unref();
  }

  /**
   * Stop auto-refreshing
   */
  stopAutoRefresh(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Initialize status bar with resize handling
   */
  init(): void {
    if (!process.stdout.isTTY) return;

    // Handle terminal resize
    process.stdout.on('resize', () => {
      if (this.enabled) {
        this.draw();
      }
    });

    // Clean up on exit
    process.on('exit', () => {
      this.destroy();
    });

    // Draw initial status bar and start auto-refresh
    this.draw();
    this.startAutoRefresh(1000);
  }

  /**
   * Clean up and restore terminal state
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.clear();
  }

  /**
   * Update hints text
   */
  setHints(hints: string): void {
    this.hints = hints;
  }

  /**
   * Print the hints inline (fallback for non-TTY)
   */
  printInline(): void {
    console.log(color.dim(`  ${this.hints}`));
  }
}

// Global status bar instance
export const statusBar = new StatusBar();

/**
 * Print keyboard hints (convenience function)
 */
export function printKeyboardHints(): void {
  console.log(color.dim('  ↑/↓ Navigate  •  Enter Select  •  ! Search  •  Esc Cancel'));
  console.log();
}
