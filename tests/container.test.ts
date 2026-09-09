import { describe, it, expect } from 'vitest';
import { container } from '../server/src/core/container';

describe('Service Container (Dependency Injection)', () => {
  it('should register and resolve singletons', () => {
    const testInstance = { id: 'test-service-123' };
    container.registerInstance('testService', testInstance);

    const resolved = container.resolve<typeof testInstance>('testService');
    expect(resolved).toBe(testInstance);
  });

  it('should lazily instantiate registered factories', () => {
    let factoryCount = 0;
    container.register('lazyService', () => {
      factoryCount++;
      return { count: factoryCount };
    });

    expect(factoryCount).toBe(0);
    const inst1 = container.resolve<{ count: number }>('lazyService');
    expect(inst1.count).toBe(1);

    // Second resolve returns cached singleton
    const inst2 = container.resolve<{ count: number }>('lazyService');
    expect(inst2).toBe(inst1);
    expect(factoryCount).toBe(1);
  });

  it('should throw error when resolving unregistered service', () => {
    expect(() => container.resolve('nonExistentService')).toThrow(
      'Service "nonExistentService" is not registered'
    );
  });
});
