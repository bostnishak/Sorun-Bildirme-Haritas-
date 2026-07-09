export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  timeoutMs?: number;
}

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage?: UsageInfo;
}

export interface LLMProvider {
  /**
   * Completes a chat prompt
   */
  complete(
    systemPrompt: string,
    userPrompt: string | Array<any>,
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Moderates the given text
   */
  moderate(text: string): Promise<ModerationResult>;

  /**
   * Generates embeddings for the given text
   */
  createEmbedding(text: string): Promise<number[]>;
}
