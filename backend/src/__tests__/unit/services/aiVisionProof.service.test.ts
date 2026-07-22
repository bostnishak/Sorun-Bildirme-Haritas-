import { verifyIssuePhotoProof } from '../../../services/aiVisionProof.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

var mockChatCompletionsCreate = jest.fn();

jest.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => mockChatCompletionsCreate(...args),
      },
    };
    moderations = {
      create: jest.fn().mockResolvedValue({ results: [{ flagged: false, categories: {}, category_scores: {} }] }),
    };
    embeddings = {
      create: jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] }),
    };
  }
  return Object.assign(MockOpenAI, { default: MockOpenAI, __esModule: true });
});

jest.mock('../../../config/database', () => ({
  prisma: {
    systemPrompt: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    lpush: jest.fn().mockResolvedValue('OK'),
  },
}));

describe('AI Vision Proof Service', () => {
  beforeEach(() => {
    mockChatCompletionsCreate.mockReset();
    jest.spyOn(prisma.systemPrompt, 'findFirst').mockResolvedValue(null as any);
    jest.spyOn(redis, 'get').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect invalid image if data is too short', async () => {
    const result = await verifyIssuePhotoProof('short-data', 'WATER_SANITATION', 'Title', 'Desc');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Görsel verisi boş veya bozuk');
  });

  it('should validate relevance using LLM Vision API', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: { content: '{"valid": true, "confidenceScore": 0.85, "reason": "Fotoğrafta çukur görünüyor.", "detectedLabels": ["asfalt", "çukur"]}' }
      }],
      usage: { total_tokens: 150 }
    });

    const dummyLongUrl = 'http://example.com/img.jpg' + 'a'.repeat(100);
    const result = await verifyIssuePhotoProof(dummyLongUrl, 'TRANSPORTATION', 'Yol Bozuk', 'desc');

    expect(result.valid).toBe(true);
    expect(result.confidenceScore).toBe(0.85);
    expect(result.reason).toContain('çukur görünüyor');
    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
  });

  it('should handle LLM API errors gracefully (fallback)', async () => {
    mockChatCompletionsCreate.mockRejectedValue(new Error('API Down'));

    const dummyLongUrl = 'http://example.com/img.jpg' + 'a'.repeat(100);
    const result = await verifyIssuePhotoProof(dummyLongUrl, 'TRANSPORTATION', 'Yol Bozuk', 'desc');

    // Fallback accepts the image
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('OpenAI API veya kota yoğunluğu nedeniyle otomatik kabul edildi (Arka planda inceleme yapılacak).');
  });
});
