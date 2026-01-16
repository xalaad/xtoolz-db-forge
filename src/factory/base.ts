import type { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import type { Factory, FactoryBuilder, FactoryState } from '../types';

export abstract class BaseFactory<T extends ObjectLiteral> implements Factory<T> {
  abstract entity: EntityTarget<T>;

  protected dataSource: DataSource;
  protected states: Map<string, FactoryState<T>> = new Map();
  protected afterCreatingCallbacks: Array<(entity: T, index: number) => void | Promise<void>> = [];
  protected afterMakingCallbacks: Array<(entity: T, index: number) => void | Promise<void>> = [];

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.configure?.();
  }

  abstract definition(): Partial<T>;

  configure?(): void;

  // ============================================================================
  // State Management
  // ============================================================================

  state(name: string, attributes: Partial<T> | ((attrs: Partial<T>) => Partial<T>)): this {
    this.states.set(name, { name, attributes });
    return this;
  }

  hasState(name: string): boolean {
    return this.states.has(name);
  }

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  afterCreating(callback: (entity: T, index: number) => void | Promise<void>): this {
    this.afterCreatingCallbacks.push(callback);
    return this;
  }

  afterMaking(callback: (entity: T, index: number) => void | Promise<void>): this {
    this.afterMakingCallbacks.push(callback);
    return this;
  }

  // ============================================================================
  // Builder Pattern
  // ============================================================================

  count(n: number): FactoryBuilderImpl<T> {
    return new FactoryBuilderImpl(this, this.dataSource, n);
  }

  // ============================================================================
  // Direct Methods
  // ============================================================================

  makeOne(overrides: Partial<T> = {}): T {
    const attributes = { ...this.definition(), ...overrides } as T;
    return attributes;
  }

  async createOne(overrides: Partial<T> = {}): Promise<T> {
    const repo = this.getRepository();
    const attributes = this.makeOne(overrides);
    const entity = repo.create(attributes);
    const saved = await repo.save(entity);

    for (const callback of this.afterCreatingCallbacks) {
      await callback(saved, 0);
    }

    return saved;
  }

  make(count = 1, overrides: Partial<T> = {}): T[] {
    const result: T[] = [];

    for (let i = 0; i < count; i++) {
      const entity = this.makeOne(overrides);
      result.push(entity);
    }

    return result;
  }

  async create(count = 1, overrides: Partial<T> = {}): Promise<T[]> {
    const repo = this.getRepository();
    const entities: T[] = [];

    for (let i = 0; i < count; i++) {
      const attributes = this.makeOne(overrides);
      const entity = repo.create(attributes);
      const saved = await repo.save(entity);

      for (const callback of this.afterCreatingCallbacks) {
        await callback(saved, i);
      }

      entities.push(saved);
    }

    return entities;
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  protected getRepository(): Repository<T> {
    return this.dataSource.getRepository(this.entity);
  }

  applyState(attributes: Partial<T>, stateName: string): Partial<T> {
    const state = this.states.get(stateName);
    if (!state) {
      throw new Error(`State "${stateName}" not found on factory`);
    }

    if (typeof state.attributes === 'function') {
      return { ...attributes, ...state.attributes(attributes) };
    }

    return { ...attributes, ...state.attributes };
  }
}

// ============================================================================
// Factory Builder Implementation
// ============================================================================

class FactoryBuilderImpl<T extends ObjectLiteral> implements FactoryBuilder<T> {
  private factory: BaseFactory<T>;
  private dataSource: DataSource;
  private _count: number;
  private _states: string[] = [];
  private _sequences: Array<(index: number) => Partial<T>> = [];
  private _overrides: Partial<T> = {};

  constructor(factory: BaseFactory<T>, dataSource: DataSource, count: number) {
    this.factory = factory;
    this.dataSource = dataSource;
    this._count = count;
  }

  count(n: number): FactoryBuilder<T> {
    this._count = n;
    return this;
  }

  state(attributes: Partial<T>): FactoryBuilder<T>;
  state(name: string): FactoryBuilder<T>;
  state(nameOrAttributes: string | Partial<T>): FactoryBuilder<T> {
    if (typeof nameOrAttributes === 'string') {
      this._states.push(nameOrAttributes);
    } else {
      this._overrides = { ...this._overrides, ...nameOrAttributes };
    }
    return this;
  }

  sequence(callback: (index: number) => Partial<T>): FactoryBuilder<T> {
    this._sequences.push(callback);
    return this;
  }

  async make(): Promise<T[]> {
    const result: T[] = [];

    for (let i = 0; i < this._count; i++) {
      let attributes = this.factory.definition();

      // Apply states
      for (const stateName of this._states) {
        attributes = this.factory.applyState(attributes, stateName);
      }

      // Apply sequences
      for (const sequence of this._sequences) {
        attributes = { ...attributes, ...sequence(i) };
      }

      // Apply overrides
      attributes = { ...attributes, ...this._overrides };

      result.push(attributes as T);
    }

    return result;
  }

  async create(): Promise<T[]> {
    const repo = this.dataSource.getRepository(this.factory.entity);
    const items = await this.make();
    const entities: T[] = [];

    for (let i = 0; i < items.length; i++) {
      const entity = repo.create(items[i]);
      const saved = await repo.save(entity);
      entities.push(saved);
    }

    return entities;
  }

  async createOne(): Promise<T> {
    const items = await this.create();
    return items[0];
  }

  makeOne(): T {
    let attributes = this.factory.definition();

    for (const stateName of this._states) {
      attributes = this.factory.applyState(attributes, stateName);
    }

    for (const sequence of this._sequences) {
      attributes = { ...attributes, ...sequence(0) };
    }

    attributes = { ...attributes, ...this._overrides };

    return attributes as T;
  }
}

// ============================================================================
// Factory Helpers
// ============================================================================

export function faker(): typeof import('./faker-helpers') {
  return require('./faker-helpers');
}
