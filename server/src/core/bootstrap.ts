/**
 * Service Bootstrap — Wires up the DI container with all services.
 * 
 * This is the composition root: the single place where all
 * dependencies are resolved and connected. No service creates
 * its own dependencies; everything is injected.
 */

import { container, ServiceKeys } from './container.js';
import { eventBus } from './eventBus.js';
import { GeminiClient } from '../services/llm/gemini.js';
import { MongoKitRepository } from '../repositories/kit.repository.js';
import { LLMClient } from '../services/llm/client.js';
import { IKitRepository } from '../repositories/kit.repository.js';

export function bootstrapServices(): void {
  // Register event bus
  container.registerInstance(ServiceKeys.EVENT_BUS, eventBus);

  // Register LLM client (Strategy pattern — swap provider here)
  container.register<LLMClient>(ServiceKeys.LLM_CLIENT, () => {
    return new GeminiClient();
  });

  // Register repositories (Repository pattern)
  container.register<IKitRepository>(ServiceKeys.KIT_REPOSITORY, () => {
    return new MongoKitRepository();
  });

  console.log('✓ Services bootstrapped');
}

/**
 * Convenience accessors to avoid spreading container.resolve everywhere.
 */
export function getLLMClient(): LLMClient {
  return container.resolve<LLMClient>(ServiceKeys.LLM_CLIENT);
}

export function getKitRepository(): IKitRepository {
  return container.resolve<IKitRepository>(ServiceKeys.KIT_REPOSITORY);
}
