/**
 * Provider-agnostic LLM client interface.
 * Implementations must handle rate limiting and retries internally.
 */
export interface LLMClient {
  /** Generate a text completion */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  
  /** Generate and parse as JSON */
  generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  /** System instruction / context */
  systemPrompt?: string;
}

export type ProgressCallback = (step: number, totalSteps: number, message: string) => void;
