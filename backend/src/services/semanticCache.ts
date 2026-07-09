import { redis } from '../config/redis';
import { OpenAIProvider } from './llm/openai.provider';
import { logger } from '../utils/logger';

const llmProvider = new OpenAIProvider();

interface CachedEmbedding {
  text: string;
  embedding: number[];
  response: any;
}

export class SemanticCache {
  private static SIMILARITY_THRESHOLD = 0.95;
  private static CACHE_KEY = 'semantic_cache_list';

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async get(text: string): Promise<any | null> {
    try {
      // 1. Get embedding for the input text
      const embedding = await llmProvider.createEmbedding(text);

      // 2. Fetch cached items
      const cachedData = await redis.lrange(this.CACHE_KEY, 0, 99); // last 100 items
      
      for (const itemStr of cachedData) {
        const item: CachedEmbedding = JSON.parse(itemStr);
        const similarity = this.cosineSimilarity(embedding, item.embedding);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          logger.info(`Semantic cache hit (similarity: ${similarity.toFixed(4)})`);
          return item.response;
        }
      }

      return null;
    } catch (err) {
      logger.warn('Semantic cache get error', { error: String(err) });
      return null;
    }
  }

  static async set(text: string, response: any): Promise<void> {
    try {
      const embedding = await llmProvider.createEmbedding(text);
      const cacheItem: CachedEmbedding = { text, embedding, response };
      
      // Prepend to list
      await redis.lpush(this.CACHE_KEY, JSON.stringify(cacheItem));
      // Keep only last 100 items
      await redis.ltrim(this.CACHE_KEY, 0, 99);
    } catch (err) {
      logger.warn('Semantic cache set error', { error: String(err) });
    }
  }
}
