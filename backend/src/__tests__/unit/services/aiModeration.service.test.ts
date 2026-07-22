import { enforceDynamicModeration } from '../../../services/aiModeration.service';
import OpenAI from 'openai';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

var mockModerationsCreate = jest.fn();
var mockChatCompletionsCreate = jest.fn();

jest.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => mockChatCompletionsCreate(...args),
      },
    };
    moderations = {
      create: (...args: any[]) => mockModerationsCreate(...args),
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
    aiModerationLog: {
      create: jest.fn().mockResolvedValue({}),
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

describe('AI Moderation Service', () => {
  beforeEach(() => {
    mockChatCompletionsCreate.mockReset();
    mockModerationsCreate.mockReset();
    mockModerationsCreate.mockResolvedValue({
      results: [{ flagged: false, categories: {}, category_scores: {} }]
    });
    jest.spyOn(prisma.aiModerationLog, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.systemPrompt, 'findFirst').mockResolvedValue(null as any);
    jest.spyOn(redis, 'get').mockResolvedValue(null);
    jest.spyOn(redis, 'setex').mockResolvedValue('OK');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Regex Pattern Filters', () => {
    it('should identify sensitive info (TCKN)', async () => {
      await expect(enforceDynamicModeration('Benim TC kimlik numaram 10000000146 dir.'))
        .rejects.toThrow('T.C. Kimlik Numarası');
    });

    it('should identify IBAN', async () => {
      await expect(enforceDynamicModeration('IBAN: TR12 3456 7890 1234 5678 9012 34'))
        .rejects.toThrow(/güvenlik filtresine takıldı|Lütfen ihbar açıklamanızda özel kişisel bilgilerinizi/);
    });

    it('should allow clean text', async () => {
      mockModerationsCreate.mockResolvedValue({
        results: [{ flagged: false, categories: {} }]
      });

      const result = await enforceDynamicModeration('Sokak lambası yanmıyor, lütfen düzeltin.');
      expect(result.passed).toBe(true);
    });
  });

  describe('OpenAI Moderation API', () => {
    it('should flag hate speech', async () => {
      mockModerationsCreate.mockResolvedValueOnce({
        results: [{
          flagged: true,
          categories: { hate: true },
          category_scores: { hate: 0.99 }
        }]
      });

      await expect(enforceDynamicModeration('Tüm x ırkından olanlar yok edilmeli!'))
        .rejects.toThrow('nefret söylemi');
    });
  });
});
