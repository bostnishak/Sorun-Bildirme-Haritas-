import OpenAI from 'openai';
import { LLMOptions, LLMProvider, LLMResponse, ModerationResult } from './llm.provider';
import { env } from '../../config/env';

export class OpenAIProvider implements LLMProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async complete(
    systemPrompt: string,
    userPrompt: string | Array<any>,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const response = await this.openai.chat.completions.create(
      {
        model: options?.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt as any },
        ],
        response_format: options?.responseFormat ? { type: options.responseFormat } : undefined,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      },
      { timeout: options?.timeoutMs || 15000 }
    );

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Boş LLM yanıtı');
    }

    return {
      content: rawContent,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async moderate(text: string): Promise<ModerationResult> {
    const response = await this.openai.moderations.create({
      model: 'text-moderation-latest',
      input: text,
    });
    
    const result = response.results[0];
    if (!result) {
      throw new Error('Boş moderasyon yanıtı');
    }

    return {
      flagged: result.flagged,
      categories: result.categories as unknown as Record<string, boolean>,
    };
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  }
}
