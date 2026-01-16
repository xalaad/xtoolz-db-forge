import { CommandRegistry, getGlobalRegistry } from '../../src/core/registry';
import type { Command, CommandContext } from '../../src/types';

function createMockCommand(
  name: string,
  section: string = 'General',
  aliases: string[] = []
): Command {
  return {
    meta: {
      name,
      description: `Mock command: ${name}`,
      section: section as any,
      aliases,
    },
    execute: jest.fn().mockResolvedValue(undefined),
  };
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command by name', () => {
      const command = createMockCommand('migrate');
      registry.register(command);

      expect(registry.has('migrate')).toBe(true);
      expect(registry.get('migrate')).toBe(command);
    });

    it('should register command aliases', () => {
      const command = createMockCommand('migrate', 'Migrations', ['mig', 'm']);
      registry.register(command);

      expect(registry.get('migrate')).toBe(command);
      expect(registry.get('mig')).toBe(command);
      expect(registry.get('m')).toBe(command);
    });

    it('should add command to section', () => {
      const command = createMockCommand('migrate', 'Migrations');
      registry.register(command);

      const sections = registry.getSections();
      expect(sections).toContain('Migrations');
    });

    it('should return this for chaining', () => {
      const command = createMockCommand('test');
      const result = registry.register(command);
      expect(result).toBe(registry);
    });
  });

  describe('registerMany', () => {
    it('should register multiple commands', () => {
      const commands = [
        createMockCommand('migrate'),
        createMockCommand('seed'),
        createMockCommand('rollback'),
      ];

      registry.registerMany(commands);

      expect(registry.has('migrate')).toBe(true);
      expect(registry.has('seed')).toBe(true);
      expect(registry.has('rollback')).toBe(true);
    });

    it('should return this for chaining', () => {
      const result = registry.registerMany([createMockCommand('test')]);
      expect(result).toBe(registry);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent command', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return command by name', () => {
      const command = createMockCommand('test');
      registry.register(command);
      expect(registry.get('test')).toBe(command);
    });

    it('should return command by alias', () => {
      const command = createMockCommand('test', 'General', ['t']);
      registry.register(command);
      expect(registry.get('t')).toBe(command);
    });
  });

  describe('has', () => {
    it('should return false for non-existent command', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for registered command', () => {
      registry.register(createMockCommand('test'));
      expect(registry.has('test')).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all unique commands', () => {
      const commands = [
        createMockCommand('migrate', 'General', ['mig']),
        createMockCommand('seed'),
      ];
      registry.registerMany(commands);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.meta.name)).toEqual(['migrate', 'seed']);
    });

    it('should not duplicate commands with aliases', () => {
      const command = createMockCommand('test', 'General', ['t', 'tst']);
      registry.register(command);

      const all = registry.getAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('getBySection', () => {
    it('should return commands in section', () => {
      registry.register(createMockCommand('migrate', 'Migrations'));
      registry.register(createMockCommand('rollback', 'Migrations'));
      registry.register(createMockCommand('seed', 'Seeders'));

      const migrations = registry.getBySection('Migrations' as any);
      expect(migrations).toHaveLength(2);
      expect(migrations.map((c) => c.meta.name)).toEqual([
        'migrate',
        'rollback',
      ]);
    });

    it('should return empty array for non-existent section', () => {
      const result = registry.getBySection('NonExistent' as any);
      expect(result).toEqual([]);
    });
  });

  describe('getSections', () => {
    it('should return all registered sections', () => {
      registry.register(createMockCommand('migrate', 'Migrations'));
      registry.register(createMockCommand('seed', 'Seeders'));
      registry.register(createMockCommand('test', 'General'));

      const sections = registry.getSections();
      expect(sections).toContain('Migrations');
      expect(sections).toContain('Seeders');
      expect(sections).toContain('General');
    });
  });

  describe('findByPrefix', () => {
    beforeEach(() => {
      registry.registerMany([
        createMockCommand('migrate'),
        createMockCommand('migrate:run'),
        createMockCommand('migrate:status'),
        createMockCommand('seed:run'),
      ]);
    });

    it('should find commands by prefix', () => {
      const results = registry.findByPrefix('migrate');
      expect(results).toHaveLength(3);
      expect(results.map((c) => c.meta.name)).toEqual([
        'migrate',
        'migrate:run',
        'migrate:status',
      ]);
    });

    it('should return empty array for no matches', () => {
      const results = registry.findByPrefix('nonexistent');
      expect(results).toEqual([]);
    });

    it('should find exact prefix matches', () => {
      const results = registry.findByPrefix('seed');
      expect(results).toHaveLength(1);
      expect(results[0].meta.name).toBe('seed:run');
    });
  });

  describe('getGroupedBySection', () => {
    it('should return commands grouped by section', () => {
      registry.register(createMockCommand('migrate', 'Migrations'));
      registry.register(createMockCommand('seed', 'Seeders'));

      const grouped = registry.getGroupedBySection();

      expect(grouped.has('Migrations' as any)).toBe(true);
      expect(grouped.has('Seeders' as any)).toBe(true);
      expect(grouped.get('Migrations' as any)?.[0].meta.name).toBe('migrate');
    });
  });
});

describe('getGlobalRegistry', () => {
  it('should return a CommandRegistry instance', () => {
    const registry = getGlobalRegistry();
    expect(registry).toBeInstanceOf(CommandRegistry);
  });

  it('should return the same instance on multiple calls', () => {
    const registry1 = getGlobalRegistry();
    const registry2 = getGlobalRegistry();
    expect(registry1).toBe(registry2);
  });
});
