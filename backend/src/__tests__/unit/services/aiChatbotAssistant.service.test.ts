import { parseSinglePromptIssue } from '../../../services/aiChatbotAssistant.service';
import OpenAI from 'openai';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('AI Chatbot Assistant Service', () => {
  let openaiInstance: any;

  beforeEach(() => {
    openaiInstance = new OpenAI();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process user query and return chatbot response', async () => {
    (openaiInstance.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{
        message: { content: '{"asistanMesaji": "Sokak lambası sorununuz iletildi."}' }
      }]
    });

    const response = await parseSinglePromptIssue(
      'Sokak lambası yanmıyor'
    );

    expect(response.asistanMesaji).toBe('Sokak lambası sorununuz iletildi.');
    expect(openaiInstance.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it('should format issues context if issues are provided', async () => {
    (openaiInstance.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{
        message: { content: '{"asistanMesaji": "Bu bölgede 1 adet benzer sorun var."}' }
      }]
    });

    const response = await parseSinglePromptIssue(
      'Burada elektrik kesik',
      undefined,
      [{ role: 'user', content: 'Elektrik Kesintisi' } as any]
    );

    expect(response.asistanMesaji).toBe('Bu bölgede 1 adet benzer sorun var.');
    expect(openaiInstance.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' })
        ])
      })
    );
  });
});
