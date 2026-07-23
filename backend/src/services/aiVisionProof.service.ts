import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { OpenAIProvider } from './llm/openai.provider';
import { SystemPromptService } from './systemPrompt.service';
import { z } from 'zod';
import pRetry from 'p-retry';

const llmProvider = new OpenAIProvider();

const VisionProofSchema = z.object({
  valid: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  reason: z.string().optional(),
  detectedLabels: z.array(z.string()).optional(),
  userFriendlyMessage: z.string().optional()
});

export interface VisionProofResult {
  valid: boolean;
  confidenceScore: number; // 0.0 - 1.0 arası
  reason: string;
  detectedLabels: string[];
  userFriendlyMessage?: string;
  latencyMs?: number;
  isQuarantined?: boolean;
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

const VISION_SYSTEM_PROMPT = `Sen Türkiye Sorun Bildirim Haritası (Etiya Project) platformunun yüksek hassasiyetli Bilgisayarlı Görü (Computer Vision) kanıt denetçisi ve sahte/manipüle görüntü uzmanısın.
Görevin, kullanıcının yüklediği fotoğrafı analiz ederek, bildirilen sorun kategorisi ve başlığıyla eşleşip eşleşmediğini, gerçek dünyada çekilmiş canlı bir kentsel/belediye arızası olup olmadığını denetlemektir.

KESİNLİKLE REDDETMEN GEREKEN SAHTE VEYA UYGUNSUZ DURUMLAR (valid: false, confidenceScore < 0.40):
1. Ekran Çekimleri ve Dijital Kopya: Bir bilgisayar/telefon ekranından çekilmiş fotoğraflar (moire deseni, piksel ızgarası), internetten indirilmiş stok fotoğraflar (watermark/filigran), meme'ler, oyun içi görüntüler, yapay zeka (AI) üretimi görseller.
2. Alakasız ve Kişisel Görseller: Tarihi fotoğraflar, asker/şahıs portreleri, selfie, ev içi mobilya/dekorasyon, evcil hayvan, yemek tabakları, belgeler veya kentsel altyapı ile ilgisi olmayan manzaralar.
3. Kategori-Görsel Uyuşmazlığı: Bildirilen kategoriyle (Örn: SU_KANALİZASYON) tamamen çelişen görseller (Örn: sadece sağlam bir asfalt yokuşu) veya hiçbir arıza, kırık, çukur, taşkın, çöp vb. barındırmayan normal ve sorunsuz kentsel manzaralar.
4. Aşırı Bulanık veya Karartılmış: Ne olduğu anlaşılamayacak kadar bulanık, simsiyah veya parlamış fotoğraflar.

KABUL ETME KURALI:
Sadece ve sadece fotoğrafta bildirilen kentsel arıza veya tehlike (çukur, çöp yığını, su kaçağı, bozuk rögar, kırık lamba, yangın, hasarlı park aleti vb.) net bir şekilde ve gerçek dünya ortamında görülüyorsa kabul et (valid: true, confidenceScore >= 0.70).

YANIT FORMATI (SADECE geçerli JSON döndür):
{
  "valid": boolean,
  "confidenceScore": number (0.0 ile 1.0 arası sayı),
  "reason": "Tespit edilen durum, sahte/gerçek olma durumu ve kategori eşleşmesi hakkında net teknik analiz",
  "detectedLabels": ["asfalt", "çukur", "gerçek-fotoğraf", ...],
  "userFriendlyMessage": "Reddedildiyse kullanıcıya gösterilecek net Türkçe açıklama: Örn: Yüklediğiniz fotoğraf bir ekran görüntüsü veya kentsel sorun kanıtı değildir. Lütfen sorunu yerinde ve net gösteren orijinal bir fotoğraf yükleyiniz."
}`;

/**
 * Görseli analiz eder ve kanıt geçerliliğini denetler.
 */
export async function verifyIssuePhotoProof(
  base64ImageOrUrl: string,
  category: string,
  title: string,
  description: string
): Promise<VisionProofResult> {
  const categoryDesc = CATEGORY_DESCRIPTIONS[category] || category;
  const promptContext = `Bildirilen Kategori: ${category} (${categoryDesc})\nBaşlık: "${title}"\nAçıklama: "${description}"\nLütfen ekteki fotoğrafın bu kentsel sorunu kanıtlayacak nitelikte olup olmadığını değerlendir.`;

  const start = Date.now();

  // Temel veriyi kontrol et (Çok kısa veya boş base64 verisi)
  if (!base64ImageOrUrl || base64ImageOrUrl.length < 100) {
    return {
      valid: false,
      confidenceScore: 0.0,
      reason: 'Görsel verisi boş veya bozuk.',
      detectedLabels: [],
      userFriendlyMessage: 'Yüklediğiniz fotoğraf verisi bozuk veya boş görünüyor. Lütfen geçerli bir fotoğraf yükleyin.',
    };
  }

  try {
    const imageUrlPayload = base64ImageOrUrl.startsWith('http') || base64ImageOrUrl.startsWith('data:')
      ? base64ImageOrUrl
      : `data:image/jpeg;base64,${base64ImageOrUrl}`;

    const runVision = async () => {
      const activePrompt = await SystemPromptService.getPrompt('LLM_VISION_PROOF', VISION_SYSTEM_PROMPT);
      return await llmProvider.complete(
        activePrompt,
        [
          { type: 'text', text: promptContext },
          { type: 'image_url', image_url: { url: imageUrlPayload, detail: 'low' } }
        ],
        {
          model: 'gpt-4o-mini',
          responseFormat: 'json_object',
          temperature: 0.1,
          maxTokens: 250,
        }
      );
    };

    const response = await pRetry(
      async () => {
        return await Promise.race([
          runVision(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('OpenAI API Zaman Aşımı / Kota')), 3500))
        ]);
      },
      { retries: 0 }
    );

    const parsed = VisionProofSchema.parse(JSON.parse(response.content || '{"valid":false,"confidenceScore":0.3,"detectedLabels":[]}'));
    const score = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.3;
    const isValid = parsed.valid === true && score >= 0.65;

    const result: VisionProofResult = {
      valid: isValid,
      confidenceScore: score,
      reason: parsed.reason || (isValid ? 'Görsel bildirilen arıza ile eşleşiyor.' : 'Görsel bildirilen arızayı doğrulamak için yetersiz.'),
      detectedLabels: parsed.detectedLabels || [],
      userFriendlyMessage: isValid
        ? undefined
        : parsed.userFriendlyMessage || 'Yüklediğiniz fotoğraf seçilen sorun türünü kanıtlar nitelikte değildir. Lütfen sorunu net gösteren bir fotoğraf yükleyiniz.',
      latencyMs: Date.now() - (start || Date.now()),
    };

    logger.info('Vision AI Kanıt Doğrulama Sonucu:', {
      category,
      valid: result.valid,
      score: result.confidenceScore,
      reason: result.reason,
    });

    return result;
  } catch (error) {
    logger.warn('Vision AI Doğrulama servisi API hatası veya kota aşımı (429), fail-open kabul ancak IN_REVIEW karantinaya alınıyor:', { error: String(error) });
    return {
      valid: true,
      confidenceScore: 0.75,
      isQuarantined: true,
      reason: 'OpenAI API veya kota yoğunluğu (429) nedeniyle otomatik karantina (İnsan/Yetkili onayı bekliyor - IN_REVIEW).',
      detectedLabels: ['otomatik-karantina'],
      userFriendlyMessage: undefined,
      latencyMs: Date.now() - (start || Date.now()),
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
  
  try {
    const { prisma } = await import('../config/database');
    await prisma.aiModerationLog.create({
      data: {
        layer: 'vision',
        passed: result.valid,
        code: result.valid ? 'OK' : 'TROLL_OR_IRRELEVANT',
        reason: result.reason,
        latencyMs: result.latencyMs || 0,
        model: 'gpt-4o-mini',
      }
    });
  } catch (err) {
    logger.error('Failed to save AiModerationLog for vision', { error: String(err) });
  }

  if (!result.valid) {
    throw new BadRequestError(result.userFriendlyMessage || result.reason);
  }
  return result;
}
