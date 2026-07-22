import { parseSinglePromptIssue } from '../../../services/aiChatbotAssistant.service';
import OpenAI from 'openai';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

var mockChatCompletionsCreate = jest.fn();
var mockModerationsCreate = jest.fn();

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

describe('AI Chatbot Assistant Service', () => {
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

  it('should process user query and return chatbot response', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: { content: '{"asistanMesaji": "Sokak lambası sorununuz iletildi."}' }
      }]
    });

    const result = await parseSinglePromptIssue('Sokak lambası yanmıyor');
    expect(result.asistanMesaji).toContain('Sokak lambası sorununuz iletildi');
  });

  it('should fallback when API fails or quota exceeded', async () => {
    mockChatCompletionsCreate.mockRejectedValue(new Error('Quota exceeded'));

    const result = await parseSinglePromptIssue('Parkta kırık banklar var');
    expect(result.asistanMesaji).toBeDefined();
    // fallback JSON dönmeli veya varsayılan mesaj
  });

  it('should format issues context if issues are provided', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: { content: '{"asistanMesaji": "Bu bölgede 1 adet benzer sorun var."}' }
      }]
    });

    const response = await parseSinglePromptIssue(
      'Burada elektrik kesik',
      undefined,
      undefined,
      [{ role: 'user', content: 'Elektrik Kesintisi' }]
    );

    expect(response.asistanMesaji).toBe('Bu bölgede 1 adet benzer sorun var.');
    expect(mockChatCompletionsCreate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' })
        ])
      }),
      expect.anything()
    );
  });
});
