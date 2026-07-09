import OpenAI from 'openai';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface VisionProofResult {
  valid: boolean;
  confidenceScore: number; // 0.0 - 1.0 arası
  reason: string;
  detectedLabels: string[];
  userFriendlyMessage?: string;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  WATER_SANITATION: 'Su kaçağı, boru patlaması, rögar taşması, kanalizasyon sızıntısı veya içme suyu arızası.',
  TRANSPORTATION: 'Yol çukuru, asfalt çökmesi, kırık kaldırım, hasarlı trafik levhası veya yol çizgisi sorunu.',
  ENVIRONMENT: 'Yığılmış çöp, kaçak hafriyat/moloz dökümü, hava/su kirliliği, yangın veya duman.',
  INFRASTRUCTURE: 'Çökmüş rögar kapağı, açık kablolar, tehlikeli inşaat/kazı çukuru veya doğalgaz/elektrik kutusu arızası.',
  SECURITY: 'Devrilme riski olan duvar/direk, tehlike yaratan başıboş yapı, kırık korkuluk veya kaza tehlikesi.',
  LIGHTING: 'Yanmayan sokak lambası, devrilmiş veya hasar görmüş aydınlatma direği.',
  PARKS: 'Kırık park bankı/oyuncakları, kurumuş/devrilmiş ağaçlar veya zarar görmüş yeşil alan.',
};

const VISION_SYSTEM_PROMPT = `Sen Türkiye Sorun Bildirim Haritası (ChaosMind) platformunun yüksek hassasiyetli Bilgisayarlı Görü (Computer Vision) kanıt denetçisisin.
Görevin, kullanıcının yüklediği fotoğrafı analiz ederek, bildirilen sorun kategorisi ve başlığıyla eşleşip eşleşmediğini ve gerçekten bir belediye/altyapı/çevre sorunu kanıtı olup olmadığını doğrulamaktır.

REDDETMEN GEREKEN DURUMLAR (confidenceScore < 0.65):
1. Selfie, kişi portresi, oda içi mobilya, evcil hayvan, ekran görüntüsü (screenshot), meme, oyun görüntüsü.
2. Bildirilen kategoriyle tamamen çelişen görseller (Örn: "Yangın/Çevre" seçilip temiz bir sahil veya düzgün bir bina atılması).
3. Çok bulanık, tamamen karanlık veya ne olduğu anlaşılamayan fotoğraflar.

KABUL ETME KURALI:
Fotoğrafta bildirilen kentsel arıza veya tehlike (çukur, çöp, su kaçağı, bozuk rögar, kırık lamba vb.) net veya makul bir kanıt olarak seçilebiliyorsa kabul et (confidenceScore >= 0.65).

YANIT FORMATI (SADECE geçerli JSON döndür):
{
  "valid": boolean,
  "confidenceScore": number (0.0 ile 1.0 arası sayı, örn: 0.88),
  "reason": "Tespit edilen durum hakkında kısa analiz",
  "detectedLabels": ["asfalt", "çukur", "su", ...],
  "userFriendlyMessage": "Reddedildiyse kullanıcıya gösterilecek kibar Türkçe açıklama"
}`;

/**
 * Görseli analiz eder ve kanıt geçerliliğini denetler.
 * Senkron modda çalışır (anında ret gerekiyorsa).
 */
export async function verifyIssuePhotoProof(
  base64ImageOrUrl: string,
  category: string,
  title: string,
  description: string
): Promise<VisionProofResult> {
  const categoryDesc = CATEGORY_DESCRIPTIONS[category] || category;
  const promptContext = `Bildirilen Kategori: ${category} (${categoryDesc})\nBaşlık: "${title}"\nAçıklama: "${description}"\nLütfen ekteki fotoğrafın bu kentsel sorunu kanıtlayacak nitelikte olup olmadığını değerlendir.`;

  try {
    const imageUrlPayload = base64ImageOrUrl.startsWith('http') || base64ImageOrUrl.startsWith('data:')
      ? base64ImageOrUrl
      : `data:image/jpeg;base64,${base64ImageOrUrl}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptContext },
            { type: 'image_url', image_url: { url: imageUrlPayload, detail: 'auto' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 200,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{"valid":true,"confidenceScore":0.85,"detectedLabels":[]}');
    const score = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.85;
    const isValid = parsed.valid !== false && score >= 0.65;

    const result: VisionProofResult = {
      valid: isValid,
      confidenceScore: score,
      reason: parsed.reason || (isValid ? 'Görsel bildirilen arıza ile eşleşiyor.' : 'Görsel bildirilen arızayı doğrulamak için yetersiz.'),
      detectedLabels: Array.isArray(parsed.detectedLabels) ? parsed.detectedLabels : [],
      userFriendlyMessage: isValid
        ? undefined
        : parsed.userFriendlyMessage || 'Yüklediğiniz fotoğraf seçilen sorun türünü kanıtlar nitelikte değildir. Lütfen sorunu net gösteren bir fotoğraf yükleyiniz.',
    };

    logger.info('Vision AI Kanıt Doğrulama Sonucu:', {
      category,
      valid: result.valid,
      score: result.confidenceScore,
      reason: result.reason,
    });

    return result;
  } catch (error) {
    logger.warn('Vision AI Doğrulama servisi hatası — fail-open kabul edildi:', { error: String(error) });
    return {
      valid: true,
      confidenceScore: 0.8,
      reason: 'Servis yanıt vermedi (fallback onay).',
      detectedLabels: ['fallback'],
    };
  }
}

/**
 * Eşik değer altında kalan görsellerde doğrudan BadRequestError fırlatır.
 */
export async function enforceVisionProofOrThrow(
  base64ImageOrUrl: string,
  category: string,
  title: string,
  description: string
): Promise<VisionProofResult> {
  const result = await verifyIssuePhotoProof(base64ImageOrUrl, category, title, description);
  if (!result.valid) {
    throw new BadRequestError(result.userFriendlyMessage || result.reason);
  }
  return result;
}
