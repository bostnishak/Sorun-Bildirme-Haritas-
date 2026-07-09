import OpenAI from 'openai';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { z } from 'zod';
import pRetry from 'p-retry';
import { aiModerationDurationHistogram, openAITokensTotal } from '../utils/metrics';
import { OpenAIProvider } from './llm/openai.provider';
import { SystemPromptService } from './systemPrompt.service';
import { SemanticCache } from './semanticCache';

const llmProvider = new OpenAIProvider();

export interface ModerationResult {
  passed: boolean;
  code: 'OK' | 'PII_DETECTED' | 'HATE_SPEECH_VIOLENCE' | 'TROLL_OR_IRRELEVANT' | 'POLITICAL_RELIGIOUS_JOKE';
  reason?: string;
  userFriendlyMessage?: string;
  latencyMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// KATMAN 1: Yerel Milisaniyelik PII & Regex Ön Filtresi (< 2ms)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * T.C. Kimlik Numarası Algoritma Kontrolü (11 hane, algoritma doğrulaması)
 */
function containsValidTCKN(text: string): boolean {
  const matches = text.match(/\b[1-9]\d{10}\b/g);
  if (!matches) return false;

  for (const tckn of matches) {
    const digits = tckn.split('').map(Number);
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const digit10 = ((oddSum * 7) - evenSum) % 10;
    const digit11 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;

    if (digits[9] === digit10 && digits[10] === digit11) {
      return true;
    }
  }
  return false;
}

/**
 * Telefon, Kredi Kartı ve IBAN Kalıpları
 */
const PII_PATTERNS = [
  // Telefon (05xx xxx xx xx vb.)
  /(?:\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/,
  // Kredi Kartı (4 haneli bloklar)
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12})\b/,
  // TR IBAN
  /\bTR\d{2}\s*(?:\d{4}\s*){5}\d{2}\b/i,
];

/**
 * Hızlı Hakaret / Küfür Ön Listesi (Sıfır Gecikmeli)
 */
const QUICK_PROFANITY_REGEX = /\b(amk|aq|sik|siktir|o\.?ç|göt|pezevenk|ibne|kahpe|orospu|piç|yarak|yarr|yarrak|amcık|am|meme|döl|sürtük|puşt|kaltak|fahişe)\b/i;

export function fastLocalSecurityCheck(text: string): ModerationResult | null {
  const start = Date.now();

  // 1. TCKN Kontrolü
  if (containsValidTCKN(text)) {
    return {
      passed: false,
      code: 'PII_DETECTED',
      reason: 'Metin içerisinde T.C. Kimlik Numarası tespit edildi.',
      userFriendlyMessage: 'Güvenliğiniz için ihbar metninde T.C. Kimlik Numarası veya kişisel veri paylaşmayınız.',
      latencyMs: Date.now() - start,
    };
  }

  // 2. Diğer PII (Telefon, IBAN vb.)
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: false,
        code: 'PII_DETECTED',
        reason: 'Metin içerisinde telefon numarası, kredi kartı veya IBAN verisi tespit edildi.',
        userFriendlyMessage: 'Lütfen ihbar açıklamanızda özel kişisel bilgilerinizi (telefon, IBAN vb.) paylaşmayınız.',
        latencyMs: Date.now() - start,
      };
    }
  }

  // 3. Hızlı Küfür / Hakaret Kontrolü
  if (QUICK_PROFANITY_REGEX.test(text)) {
    return {
      passed: false,
      code: 'HATE_SPEECH_VIOLENCE',
      reason: 'Temel hakaret/küfür kelimesi algılandı.',
      userFriendlyMessage: 'Lütfen bildirimlerinizde genel ahlak kurallarına uygun, saygılı bir dil kullanınız.',
      latencyMs: Date.now() - start,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// KATMAN 2: OpenAI Moderation API (< 80ms) - Ücretsiz & Özel Güvenlik Duvarı
// ─────────────────────────────────────────────────────────────────────────────

export async function checkOpenAIModerationAPI(text: string): Promise<ModerationResult | null> {
  const start = Date.now();
  try {
    const runModeration = async () => {
      return await llmProvider.moderate(text);
    };

    const response = await pRetry(runModeration, { retries: 3, minTimeout: 1000, maxTimeout: 3000 });

    if (response.flagged) {
      let reason = 'OpenAI Moderation API ihlal bayrağı kaldırdı.';
      
      if (response.categories['harassment'] || response.categories['harassment/threatening']) {
        reason = 'Kişisel saldırı, taciz veya tehdit barındıran içerik.';
      } else if (response.categories['self-harm'] || response.categories['self-harm/intent']) {
        reason = 'Kendine zarar verme, intihar vb. bildirimleri sisteme girilemez.';
      } else if (response.categories['sexual'] || response.categories['sexual/minors']) {
        reason = 'Cinsel veya müstehcen içerik.';
      }

      return {
        passed: false,
        code: 'HATE_SPEECH_VIOLENCE',
        reason: reason,
        userFriendlyMessage: 'Bildiriminize nefret söylemi, şiddet veya saldırganlık içeren ifadeler tespit edildiği için işleminiz reddedildi.',
        latencyMs: Date.now() - start,
      };
    }
    return null;
  } catch (error) {
    logger.warn('OpenAI Moderation API çağrısı başarısız, LLM Guardrail katmanına geçiliyor.', { error: String(error) });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KATMAN 3: Semantik LLM Guardrail (Troller, Siyasi/Dini Şakalar, Sahte İhbarlar)
// ─────────────────────────────────────────────────────────────────────────────

const GUARDRAIL_SYSTEM_PROMPT = `Sen Türkiye Sorun Bildirim Haritası (ChaosMind) platformunun sıfır toleranslı AI güvenlik denetçisisin.
Görevin, kullanıcının girdiği ihbar metnini (form veya chatbot) inceleyerek geçerli bir kentsel/altyapı/çevre sorunu olup olmadığını doğrulamaktır.

REDDETMEN GEREKEN DURUMLAR:
1. Siyasi, ideolojik veya dini şakalar/propaganda ("belediye başkanı istifa", "partiler", dini söylemler vb.).
2. Troller, mizah girişimleri veya sahte acil durumlar ("gökyüzünden uzaylı düştü", "mahallede ejderha var").
3. Alakasız kişisel şikayetler veya ifşa girişimleri ("Ahmet bana borcunu ödemedi", "bakkal çok pahalı").
4. Kapsam dışı anlamsız metinler ("asdfghjk", "test test 123").

KABUL EDİLMESİ GEREKENLER:
- Yol, kaldırım, su kaçağı, elektrik arızası, çöp, çevre kirliliği, trafik güvenliği, park hasarları, kaza riskleri.

ÇIKTI FORMATI (Sadece geçerli JSON döndür):
{
  "passed": boolean,
  "code": "OK" | "TROLL_OR_IRRELEVANT" | "POLITICAL_RELIGIOUS_JOKE",
  "reason": "Reddetme sebebi (kısa)",
  "userFriendlyMessage": "Kullanıcıya gösterilecek kibar, profesyonel Türkçe açıklama"
}`;

const GuardrailSchema = z.object({
  passed: z.boolean().default(true),
  code: z.enum(['OK', 'TROLL_OR_IRRELEVANT', 'POLITICAL_RELIGIOUS_JOKE']).default('OK'),
  reason: z.string().optional(),
  userFriendlyMessage: z.string().optional()
});

export async function checkSemanticGuardrail(text: string): Promise<ModerationResult> {
  const start = Date.now();
  try {
    // Semantic Cache Lookup
    const cachedResult = await SemanticCache.get(text);
    if (cachedResult) {
      return cachedResult;
    }

    const runGuardrail = async () => {
      const activePrompt = await SystemPromptService.getPrompt('LLM_GUARDRAIL', GUARDRAIL_SYSTEM_PROMPT);
      return await llmProvider.complete(
        activePrompt,
        `İncelenecek Bildirim Metni:\n"${text.substring(0, 1500)}"`,
        {
          model: 'gpt-4o-mini',
          responseFormat: 'json_object',
          temperature: 0.0,
          maxTokens: 150,
        }
      );
    };

    const response = await pRetry(runGuardrail, { retries: 3, minTimeout: 1000, maxTimeout: 4000 });

    const parsed = GuardrailSchema.parse(JSON.parse(response.content || '{"passed":true,"code":"OK"}'));
    
    // Log Prometheus metrics
    if (response.usage) {
      openAITokensTotal.labels('gpt-4o-mini', 'semantic_guardrail').inc(response.usage.totalTokens);
    }

    const finalResult = {
      passed: parsed.passed,
      code: parsed.code as any,
      reason: parsed.reason,
      userFriendlyMessage: parsed.passed
        ? undefined
        : 'Bildiriminiz moderasyon politikalarımıza uymadığı için reddedildi.',
      latencyMs: Date.now() - start,
    };

    // Store in semantic cache (run asynchronously)
    SemanticCache.set(text, finalResult).catch(() => {});

    return finalResult;
  } catch (error) {
    logger.error('Semantic Guardrail hatası — fail-open prensibiyle kabul ediliyor.', { error: String(error) });
    return {
      passed: true,
      code: 'OK',
      latencyMs: Date.now() - start,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANA ENDPOINT ORKESTRATÖRÜ: Multi-Layer Dynamic Moderation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gelen ihbar metnini (başlık, açıklama veya chatbot mesajı) 3 katmanlı güvenlik duvarından geçirir.
 * Eğer ihlal varsa anında BadRequestError fırlatarak veritabanı işlemini durdurur.
 */
export async function enforceDynamicModeration(text: string, issueId?: string): Promise<ModerationResult> {
  const totalStart = Date.now();
  
  const logEntry = async (layer: string, result: ModerationResult, model: string) => {
    try {
      await prisma.aiModerationLog.create({
        data: {
          issueId: issueId || null,
          layer,
          passed: result.passed,
          code: result.code,
          reason: result.reason,
          latencyMs: result.latencyMs,
          model,
        }
      });
      aiModerationDurationHistogram.labels(layer, model).observe(result.latencyMs);
    } catch (e) {
      logger.error('Failed to save AiModerationLog', { error: String(e) });
    }
  };

  // 1. Katman: Yerel Milisaniyelik Kontrol
  const localResult = fastLocalSecurityCheck(text);
  if (localResult) {
    await logEntry('local', localResult, 'regex');
    if (!localResult.passed) {
      logger.warn('AI Moderasyon [Katman 1 - Local Regex/PII] ihlali yakaladı.', {
        code: localResult.code,
        reason: localResult.reason,
      });
      throw new BadRequestError(localResult.userFriendlyMessage || localResult.reason || 'İçerik güvenlik filtresine takıldı.');
    }
  }

  // 2. Katman: OpenAI Moderation API
  const moderationApiResult = await checkOpenAIModerationAPI(text);
  if (moderationApiResult) {
    await logEntry('openai_moderation', moderationApiResult, 'text-moderation-latest');
    if (!moderationApiResult.passed) {
      logger.warn('AI Moderasyon [Katman 2 - OpenAI Moderation API] ihlali yakaladı.', {
        code: moderationApiResult.code,
        reason: moderationApiResult.reason,
      });
      throw new BadRequestError(moderationApiResult.userFriendlyMessage || 'İçerik güvenlik ilkelerini ihlal etmektedir.');
    }
  }

  // Optimize: Kısa metinler için Semantic Layer'ı atla
  if (text.length < 50) {
    logger.info('Metin 50 karakterden kısa, Semantic Guardrail atlanıyor.', { length: text.length });
    return { passed: true, code: 'OK', latencyMs: Date.now() - totalStart };
  }

  // 3. Katman: Semantik LLM Guardrail
  const semanticResult = await checkSemanticGuardrail(text);
  await logEntry('llm_guardrail', semanticResult, 'gpt-4o-mini');
  if (!semanticResult.passed) {
    logger.warn('AI Moderasyon [Katman 3 - LLM Semantic Guardrail] ihlali yakaladı.', {
      code: semanticResult.code,
      reason: semanticResult.reason,
    });
    throw new BadRequestError(semanticResult.userFriendlyMessage || 'Girdiğiniz bildirim platform kurallarına uygun değildir.');
  }

  return {
    passed: true,
    code: 'OK',
    latencyMs: Date.now() - totalStart,
  };
}
