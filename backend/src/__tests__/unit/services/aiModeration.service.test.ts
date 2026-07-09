import { enforceDynamicModeration } from '../../../services/aiModeration.service';
import OpenAI from 'openai';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    moderations: {
      create: jest.fn(),
    },
  }));
});

describe('AI Moderation Service', () => {
  let openaiInstance: any;

  beforeEach(() => {
    openaiInstance = new OpenAI();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Regex Pattern Filters', () => {
    it('should identify sensitive info (TCKN)', async () => {
      await expect(enforceDynamicModeration('Benim TC kimlik numaram 12345678901 dir.'))
        .rejects.toThrow('güvenlik filtresine takıldı');
    });

    it('should identify IBAN', async () => {
      await expect(enforceDynamicModeration('IBAN: TR12 3456 7890 1234 5678 9012 34'))
        .rejects.toThrow(/güvenlik filtresine takıldı|Lütfen ihbar açıklamanızda özel kişisel bilgilerinizi/);
    });

    it('should allow clean text', async () => {
      (openaiInstance.moderations.create as jest.Mock).mockResolvedValue({
        results: [{ flagged: false, categories: {} }]
      });

      const result = await enforceDynamicModeration('Sokak lambası yanmıyor, lütfen düzeltin.');
      expect(result.passed).toBe(true);
    });
  });

  describe('OpenAI Moderation API', () => {
    it('should flag hate speech', async () => {
      (openaiInstance.moderations.create as jest.Mock).mockResolvedValue({
        results: [{
          flagged: true,
          categories: {
            'hate': true,
          },
        }]
      });

      await expect(enforceDynamicModeration('Nefret dolu bir cümle'))
        .rejects.toThrow('güvenlik ilkelerini ihlal');
    });
  });
});
