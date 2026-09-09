/**
 * Service Container — Lightweight dependency injection.
 * 
 * Not a full IoC framework (that would be over-engineering), but a typed
 * registry that manages service lifecycles and dependency resolution.
 * 
 * Patterns used:
 * - Registry Pattern: central service lookup
 * - Factory Pattern: lazy service instantiation
 * - Singleton Pattern: single instances per key
 */

type Factory<T> = () => T;

class Container {
  private singletons = new Map<string, unknown>();
  private factories = new Map<string, Factory<unknown>>();

  /**
   * Register a factory function for a service.
   * The service is lazily instantiated on first resolve.
   */
  register<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory);
    // Clear cached singleton if re-registering
    this.singletons.delete(key);
  }

  /**
   * Register a pre-built instance as a singleton.
   */
  registerInstance<T>(key: string, instance: T): void {
    this.singletons.set(key, instance);
  }

  /**
   * Resolve a service by key. Creates a singleton on first access.
   */
  resolve<T>(key: string): T {
    // Check for existing singleton
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    // Check for factory
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service "${key}" is not registered in the container`);
    }

    // Create singleton
    const instance = factory();
    this.singletons.set(key, instance);
    return instance as T;
  }

  /**
   * Check if a service is registered.
   */
  has(key: string): boolean {
    return this.singletons.has(key) || this.factories.has(key);
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}

/** Service key constants to avoid magic strings */
export const ServiceKeys = {
  LLM_CLIENT: 'llm:client',
  KIT_REPOSITORY: 'repo:kit',
  USER_REPOSITORY: 'repo:user',
  PRACTICE_REPOSITORY: 'repo:practice',
  EVENT_BUS: 'core:eventBus',
  PIPELINE_FACTORY: 'factory:pipeline',
} as const;

/**
 * Singleton container instance.
 */
export const container = new Container();
