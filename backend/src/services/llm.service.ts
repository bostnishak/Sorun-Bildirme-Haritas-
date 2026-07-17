import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import pRetry from 'p-retry';
import { z } from 'zod';
import crypto from 'crypto';
import { redis } from '../config/redis';
import { openAITokensTotal, aiModerationDurationHistogram } from '../utils/metrics';
import { OpenAIProvider } from './llm/openai.provider';
import { SystemPromptService } from './systemPrompt.service';
import { maskPII } from '../utils/piiMasker';

const llmProvider = new OpenAIProvider();

const SYSTEM_PROMPT = `Sen Türkiye'deki bir belediye sorun bildirimi platformunun içerik denetçisisin.

Görevin: Kullanıcıların gönderdiği sorun başlığı ve açıklamasını değerlendirerek bunun gerçek bir belediye/altyapı sorunu olup olmadığını belirlemek.

GEÇERLI içerik örnekleri:
- Yol bozulmaları, çukurlar, asfalt hasarı
- Su kaçakları, kanalizasyon sorunları
- Sokak lambası arızaları
- Çöp toplanmaması, çevre kirliliği
- Park ve yeşil alan sorunları
- Trafik işaretleri, yol çizgileri
- Kaldırım hasarları

GEÇERSİZ içerik örnekleri:
- Küfür, hakaret veya saldırgan dil
- Spam veya anlamsız metin ("asdfg", "test 123")
- Kişisel şikayetler (komşu gürültüsü, bireysel anlaşmazlıklar)
- Siyasi içerik
- Reklam veya ticari içerik
- Konuyla tamamen ilgisiz içerik

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{"valid": true/false, "reason": "kısa açıklama (max 100 karakter)"}`;

export interface LLMGuardResult {
  valid: boolean;
  reason: string;
}

export const LLMGuardSchema = z.object({
  valid: z.boolean(),
  reason: z.string().max(150).default('Geçersiz içerik'),
});

/**
 * OpenAI ile içerik denetimi yapar
 * Geçersizse BadRequestError fırlatır
 */
export async function guardContent(
  title: string,
  description: string,
): Promise<LLMGuardResult> {
  const start = Date.now();
  // Standart formdan gelen başlık ve açıklamayı PII sızıntısına karşı maskele
  const safeTitle = maskPII(title.substring(0, 200));
  const safeDescription = maskPII(description.substring(0, 1000));
  const userMessage = `Başlık: "${safeTitle}"\nAçıklama: "${safeDescription}"`;
  const cacheKey = `llm_guard:${crypto.createHash('md5').update(userMessage).digest('hex')}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const runLLM = async () => {
      const activePrompt = await SystemPromptService.getPrompt('LLM_GUARD_CONTENT', SYSTEM_PROMPT);
      return await llmProvider.complete(
        activePrompt,
        userMessage,
        {
          model: 'gpt-4o-mini',
          responseFormat: 'json_object',
          temperature: 0.1,
          maxTokens: 100,
          timeoutMs: 10000,
        }
      );
    };

    const response = await pRetry(runLLM, { retries: 3, minTimeout: 1000, maxTimeout: 4000 });

    if (response.usage) {
      openAITokensTotal.labels('gpt-4o-mini', 'guard_content').inc(response.usage.totalTokens);
    }

    const result = LLMGuardSchema.parse(JSON.parse(response.content));
    
    await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 24 hours cache
    aiModerationDurationHistogram.labels('guard_content', 'gpt-4o-mini').observe(Date.now() - start);

    if (!result.valid) {
      logger.info('LLM Guard: içerik reddedildi', {
        reason: result.reason,
        title: title.substring(0, 50),
      });
      throw new BadRequestError(
        `İçerik denetiminden geçemedi: ${result.reason}`,
      );
    }

    return result;
  } catch (err) {
    if (err instanceof BadRequestError) throw err;

    // OpenAI API hatası — Fail-Close prensibi ile isteği reddet
    logger.error('LLM Guard API hatası — Fail-Close uygulandı', { error: String(err) });
    throw new BadRequestError('Yapay zeka analiz servisimiz şu an yoğunluk nedeniyle hizmet veremiyor. Lütfen daha sonra tekrar deneyin.');
  }
}

const VISION_SYSTEM_PROMPT = `Sen Türkiye'deki bir belediye sorun bildirimi platformunun görsel denetçisisin.
Görevin: Kullanıcının yüklediği fotoğrafın, bildirdiği sorun (başlık, açıklama ve kategori) ile eşleşip eşleşmediğini ve gerçekten bir belediye/altyapı/çevre sorunu içerip içermediğini kontrol etmek.
Eğer fotoğraf tamamen alakasızsa (örneğin selfie, ev içi fotoğrafı, ekran görüntüsü, rastgele manzara) veya belirtilen sorunla hiçbir ilgisi yoksa reddet.
Yanıtını SADECE JSON formatında ver: {"valid": true/false, "reason": "kısa açıklama (max 100 karakter)"}`;

/**
 * OpenAI Vision ile fotoğraf analizi yapar
 */
export async function analyzeImageContent(
  imageBuffer: Buffer,
  mimeType: string,
  title: string,
  description: string,
  category: string
): Promise<LLMGuardResult> {
  const start = Date.now();
  const base64Image = imageBuffer.toString('base64');
  const userMessage = `Bildirilen Kategori: ${category}\nBaşlık: "${title}"\nAçıklama: "${description}"\nLütfen bu bilgilerin ekteki görselle uyuşup uyuşmadığını kontrol et.`;

  try {
    const runLLM = async () => {
      const activeVisionPrompt = await SystemPromptService.getPrompt('LLM_VISION_PROOF', VISION_SYSTEM_PROMPT);
      return await llmProvider.complete(
        activeVisionPrompt,
        [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } }
        ],
        {
          model: 'gpt-4o-mini',
          responseFormat: 'json_object',
          temperature: 0.1,
          maxTokens: 150,
          timeoutMs: 15000,
        }
      );
    };

    const response = await pRetry(runLLM, { retries: 3, minTimeout: 1000, maxTimeout: 4000 });

    if (response.usage) {
      openAITokensTotal.labels('gpt-4o-mini-vision', 'analyze_image').inc(response.usage.totalTokens);
    }

    const result = LLMGuardSchema.parse(JSON.parse(response.content));
    aiModerationDurationHistogram.labels('analyze_image', 'gpt-4o-mini-vision').observe(Date.now() - start);
    
    if (!result.valid) {
      logger.info('Vision AI: görsel reddedildi', { reason: result.reason, title });
    } else {
      logger.info('Vision AI: görsel onaylandı', { title });
    }

    return result;
  } catch (err) {
    logger.error('Vision AI hatası — Fail-Close uygulandı', { error: String(err) });
    return { valid: false, reason: 'Görsel analiz servis hatası veya kota aşımı' };
  }
}
