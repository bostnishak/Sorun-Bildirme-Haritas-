import OpenAI from 'openai';
import { env } from '../config/env';
import { BadRequestError, ServiceUnavailableError } from '../utils/errors';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

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

/**
 * OpenAI ile içerik denetimi yapar
 * Geçersizse BadRequestError fırlatır
 */
export async function guardContent(
  title: string,
  description: string,
): Promise<LLMGuardResult> {
  const userMessage = `Başlık: "${title.substring(0, 200)}"\nAçıklama: "${description.substring(0, 1000)}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,      // Tutarlı kararlar için düşük temperature
      max_tokens: 100,
    }, { timeout: 10000 });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Boş LLM yanıtı');
    }

    const result: LLMGuardResult = JSON.parse(rawContent);

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

    // OpenAI API hatası — servisi kullanılamaz diye reddetme
    // Yedek: içeriği kabul et ama logla
    logger.error('LLM Guard API hatası — içerik atlandı', { error: String(err) });
    return { valid: true, reason: 'LLM servis hatası — atlandı' };
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
  const base64Image = imageBuffer.toString('base64');
  const userMessage = `Bildirilen Kategori: ${category}\nBaşlık: "${title}"\nAçıklama: "${description}"\nLütfen bu bilgilerin ekteki görselle uyuşup uyuşmadığını kontrol et.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 150,
    }, { timeout: 15000 });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Boş Vision LLM yanıtı');
    }

    const result: LLMGuardResult = JSON.parse(rawContent);
    
    if (!result.valid) {
      logger.info('Vision AI: görsel reddedildi', { reason: result.reason, title });
    } else {
      logger.info('Vision AI: görsel onaylandı', { title });
    }

    return result;
  } catch (err) {
    logger.error('Vision AI hatası — atlandı', { error: String(err) });
    return { valid: true, reason: 'Görsel analiz servis hatası — atlandı' };
  }
}
