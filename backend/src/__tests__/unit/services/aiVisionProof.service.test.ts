import { verifyIssuePhotoProof } from '../../../services/aiVisionProof.service';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import OpenAI from 'openai';

jest.mock('../../../config/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    labelDetection: jest.fn(),
    safeSearchDetection: jest.fn(),
  })),
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

describe('AI Vision Proof Service', () => {
  let mockClient: any;
  let openaiInstance: any;

  beforeEach(() => {
    mockClient = new ImageAnnotatorClient();
    openaiInstance = new OpenAI();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect invalid image if SafeSearch flags it', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: {
        adult: 'VERY_LIKELY',
        violence: 'UNLIKELY',
      }
    }]);

    mockClient.labelDetection.mockResolvedValue([{
      labelAnnotations: [{ description: 'Street' }]
    }]);

    const result = await verifyIssuePhotoProof('http://example.com/img.jpg', 'Yol Bozuk', 'altyapı', 'desc');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Uygunsuz içerik');
  });

  it('should validate relevance using LLM if SafeSearch passes', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: {
        adult: 'UNLIKELY',
        violence: 'UNLIKELY',
      }
    }]);

    mockClient.labelDetection.mockResolvedValue([{
      labelAnnotations: [{ description: 'Pothole' }]
    }]);

    (openaiInstance.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{
        message: { content: '{"valid": true, "reason": "Fotoğrafta çukur görünüyor."}' }
      }]
    });

    const result = await verifyIssuePhotoProof('http://example.com/img.jpg', 'Yol Bozuk', 'altyapı', 'desc');

    expect(result.valid).toBe(true);
    expect(openaiInstance.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
