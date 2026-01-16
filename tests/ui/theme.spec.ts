import {
  THEME,
  SYMBOLS,
  ASCII_BANNER,
  c,
  primary,
  secondary,
  accent,
  muted,
  highlight,
  statusColor,
  gradient,
  matrixChar,
} from '../../src/ui/theme';

describe('THEME', () => {
  it('should have primary color defined', () => {
    expect(THEME.primary).toBeDefined();
    expect(THEME.primary).toContain('\x1b[');
  });

  it('should have all status colors defined', () => {
    expect(THEME.success).toBeDefined();
    expect(THEME.error).toBeDefined();
    expect(THEME.warning).toBeDefined();
    expect(THEME.info).toBeDefined();
  });

  it('should have reset code', () => {
    expect(THEME.reset).toBe('\x1b[0m');
  });

  it('should have text formatting effects', () => {
    expect(THEME.bold).toBeDefined();
    expect(THEME.italic).toBeDefined();
    expect(THEME.underline).toBeDefined();
  });
});

describe('SYMBOLS', () => {
  it('should have common UI symbols', () => {
    expect(SYMBOLS.prompt).toBeDefined();
    expect(SYMBOLS.check).toBeDefined();
    expect(SYMBOLS.cross).toBeDefined();
    expect(SYMBOLS.arrow).toBeDefined();
  });

  it('should have spinner frames array', () => {
    expect(Array.isArray(SYMBOLS.spinnerFrames)).toBe(true);
    expect(SYMBOLS.spinnerFrames.length).toBeGreaterThan(0);
  });

  it('should have corner symbols', () => {
    expect(SYMBOLS.corner.topLeft).toBeDefined();
    expect(SYMBOLS.corner.topRight).toBeDefined();
    expect(SYMBOLS.corner.bottomLeft).toBeDefined();
    expect(SYMBOLS.corner.bottomRight).toBeDefined();
  });

  it('should have status symbols', () => {
    expect(SYMBOLS.success).toBeDefined();
    expect(SYMBOLS.error).toBeDefined();
    expect(SYMBOLS.warning).toBeDefined();
    expect(SYMBOLS.info).toBeDefined();
  });
});

describe('ASCII_BANNER', () => {
  it('should be a non-empty string', () => {
    expect(typeof ASCII_BANNER).toBe('string');
    expect(ASCII_BANNER.length).toBeGreaterThan(0);
  });

  it('should contain DB-FORGE text', () => {
    expect(ASCII_BANNER).toContain('██');
  });
});

describe('color functions', () => {
  describe('c()', () => {
    it('should wrap text with color codes', () => {
      const result = c('test', 'primary');
      expect(result).toContain(THEME.primary);
      expect(result).toContain('test');
      expect(result).toContain(THEME.reset);
    });

    it('should handle different color types', () => {
      expect(c('text', 'error')).toContain(THEME.error);
      expect(c('text', 'success')).toContain(THEME.success);
      expect(c('text', 'muted')).toContain(THEME.muted);
    });
  });

  describe('primary()', () => {
    it('should apply primary color', () => {
      const result = primary('test');
      expect(result).toContain(THEME.primary);
      expect(result).toContain('test');
    });
  });

  describe('secondary()', () => {
    it('should apply secondary color', () => {
      const result = secondary('test');
      expect(result).toContain(THEME.secondary);
      expect(result).toContain('test');
    });
  });

  describe('accent()', () => {
    it('should apply accent color', () => {
      const result = accent('test');
      expect(result).toContain(THEME.accent);
      expect(result).toContain('test');
    });
  });

  describe('muted()', () => {
    it('should apply muted color', () => {
      const result = muted('test');
      expect(result).toContain(THEME.muted);
      expect(result).toContain('test');
    });
  });

  describe('highlight()', () => {
    it('should apply bold and highlight', () => {
      const result = highlight('test');
      expect(result).toContain(THEME.bold);
      expect(result).toContain(THEME.highlight);
      expect(result).toContain('test');
    });
  });

  describe('statusColor()', () => {
    it('should apply correct status colors', () => {
      expect(statusColor('success', 'text')).toContain(THEME.success);
      expect(statusColor('error', 'text')).toContain(THEME.error);
      expect(statusColor('warning', 'text')).toContain(THEME.warning);
      expect(statusColor('info', 'text')).toContain(THEME.info);
    });
  });

  describe('gradient()', () => {
    it('should apply gradient effect', () => {
      const result = gradient('HELLO');
      expect(result).toContain('\x1b[38;5;');
      expect(result).toContain(THEME.reset);
    });

    it('should handle empty string', () => {
      const result = gradient('');
      expect(result).toContain(THEME.reset);
    });
  });

  describe('matrixChar()', () => {
    it('should return a single character', () => {
      const char = matrixChar();
      expect(typeof char).toBe('string');
      expect(char.length).toBe(1);
    });

    it('should return random characters', () => {
      const chars = new Set();
      for (let i = 0; i < 100; i++) {
        chars.add(matrixChar());
      }
      // Should have some variety
      expect(chars.size).toBeGreaterThan(1);
    });
  });
});
