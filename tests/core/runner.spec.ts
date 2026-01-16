import { parseArgs } from '../../src/core/runner';

describe('parseArgs', () => {
  it('should parse simple positional arguments', () => {
    const result = parseArgs(['migrate', 'run']);
    expect(result.args).toEqual(['migrate', 'run']);
    expect(result.flags).toEqual({});
  });

  it('should parse long flags without values', () => {
    const result = parseArgs(['--verbose', '--force']);
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({ verbose: true, force: true });
  });

  it('should parse long flags with values using =', () => {
    const result = parseArgs(['--config=forge.config.ts', '--name=Test']);
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({
      config: 'forge.config.ts',
      name: 'Test',
    });
  });

  it('should parse short flags', () => {
    const result = parseArgs(['-v', '-f', '-y']);
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({ v: true, f: true, y: true });
  });

  it('should parse short flags with values using =', () => {
    const result = parseArgs(['-c=config.ts', '-n=Test']);
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({
      c: 'config.ts',
      n: 'Test',
    });
  });

  it('should parse mixed arguments and flags', () => {
    const result = parseArgs([
      'migrate',
      '--verbose',
      'run',
      '--config=config.ts',
      '-y',
    ]);
    expect(result.args).toEqual(['migrate', 'run']);
    expect(result.flags).toEqual({
      verbose: true,
      config: 'config.ts',
      y: true,
    });
  });

  it('should handle empty input', () => {
    const result = parseArgs([]);
    expect(result.args).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('should handle flags with empty values', () => {
    const result = parseArgs(['--config=', '--name=value']);
    expect(result.flags).toEqual({
      config: '',
      name: 'value',
    });
  });

  it('should handle complex command patterns', () => {
    const result = parseArgs([
      'db:migrate',
      '--seed',
      '--class=UserSeeder',
      '-v',
      'extra-arg',
    ]);
    expect(result.args).toEqual(['db:migrate', 'extra-arg']);
    expect(result.flags).toEqual({
      seed: true,
      class: 'UserSeeder',
      v: true,
    });
  });
});
