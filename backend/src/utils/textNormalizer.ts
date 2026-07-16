/**
 * textNormalizer.ts — Türkçe'ye Özel Metin Normalizer
 *
 * Amaç:
 *  1. Homoglyph saldırılarını engelle (Kiril, Unicode confusables → ASCII)
 *  2. Leet speak varyantları normalize et (4→a, 1→i, 0→o vb.)
 *  3. Araçımlı yazımları normalize et (a.m.k → amk, a m k → amk)
 *  4. Normalize edilmiş metin üzerinde genişletilmiş profanity listesi uygula
 *
 * Dikkat: Bu normalizer SADECE güvenlik tespiti için kullanılır.
 * Kullanıcıya gösterilecek veya loglara yazılacak metni değiştirmez.
 */

// ─── Homoglyph Haritası ────────────────────────────────────────────────────────
// Yaygın Kiril, Yunan ve Unicode confusable karakterleri Latin/ASCII karşılıklarına çevirir
const HOMOGLYPH_MAP: Record<string, string> = {
  // Kiril → Latin
  'а': 'a', 'е': 'e', 'і': 'i', 'о': 'o', 'р': 'p', 'с': 'c',
  'у': 'y', 'х': 'x', 'ь': 'b', 'А': 'A', 'В': 'B', 'Е': 'E',
  'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C',
  'Т': 'T', 'У': 'Y', 'Х': 'X',
  // Yunan → Latin
  'α': 'a', 'ε': 'e', 'ι': 'i', 'ο': 'o', 'υ': 'u', 'κ': 'k',
  'ν': 'v', 'ρ': 'p', 'τ': 't', 'χ': 'x', 'ω': 'w',
  // Fullwidth → ASCII
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
  // Unicode subscript/superscript
  'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ᵢ': 'i', 'ᵤ': 'u',
  // IPA ve fonetik semboller
  'ɑ': 'a', 'ɐ': 'a', 'ᴀ': 'a', 'ᴋ': 'k', 'ᴍ': 'm',
  // Özel semboller
  '@': 'a', '$': 's', '!': 'i', '|': 'i', '0': 'o', '1': 'i',
  '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
};

/**
 * Homoglyph karakterleri ASCII karşılıklarına dönüştürür
 */
export function normalizeHomoglyphs(text: string): string {
  if (!text) return text;

  let normalized = '';
  for (const char of text) {
    normalized += HOMOGLYPH_MAP[char] ?? char;
  }
  return normalized;
}

/**
 * Araçımlı / boşluklu yazımları temizler
 * Örn: "a.m.k" → "amk", "a m k" → "amk", "a-m-k" → "amk"
 */
export function removeInterstitials(text: string): string {
  // Tek karakterler arasındaki nokta, tire, boşluk, altçizgi, slash
  return text.replace(/(?<=\b[a-zA-ZğüşıöçĞÜŞİÖÇ0-9])[.\-_/\\ ]+(?=[a-zA-ZğüşıöçĞÜŞİÖÇ0-9]\b)/g, '');
}

/**
 * Ardışık tekrarlayan karakterleri teke indirir
 * Örn: "aammkk" → "amk", "occccc" → "oc"
 */
export function deduplicateChars(text: string): string {
  return text.replace(/(.)\1{2,}/g, '$1$1');
}

/**
 * Tam normalizasyon pipeline'ı: homoglyph → leet → araçım → dedup → lowercase
 */
export function fullyNormalize(text: string): string {
  if (!text) return text;
  let t = normalizeHomoglyphs(text);
  t = removeInterstitials(t);
  t = deduplicateChars(t);
  t = t.toLowerCase();
  return t;
}

// ─── Genişletilmiş Profanity Listesi ──────────────────────────────────────────
// Normalize edilmiş metin üzerinde çalışır (homoglyph sonrası)
// Türkçe'ye özel, fonetik varyantlar dahil

const PROFANITY_PATTERNS: RegExp[] = [
  // Temel küfürler ve varyantlar
  /amk|amc|amq/i,
  /sik|s1k|syk/i,
  /bok|b0k/i,
  /got|g0t|göt/i,
  /oc|occ|oç/i,
  /pic|piç|p1c|p1ç/i,
  /kahpe|kxhpe/i,
  /orospu|0r0spu|orosp/i,
  /ibne|i8ne|1bne/i,
  /pezevenk|pezeveng/i,
  /serefsiz|şerefsiz|s3r3fsiz/i,
  /ananı|ananizi|ananın/i,
  /bacını|bacınızı/i,
  // Hakaret kombinasyonları
  /aptal(?:lar)?/i,
  /gerizekalı|geri.zekali/i,
  /salak(?:lar)?/i,
  /mal(?:lar)?\s+(?:gibi|mısın)/i,
  // İngilizce yaygın küfürler (platform Türkçe ama girdi mixed olabilir)
  /\bf+u+c+k+\b/i,
  /\bsh+i+t+\b/i,
  /\bb+i+t+c+h+\b/i,
  /\bass+h+o+l+e+\b/i,
  /\bb+a+s+t+a+r+d+\b/i,
];

/**
 * Normalize edilmiş metin üzerinde profanity tespiti yapar
 * @returns true eğer profanity tespit edildiyse
 */
export function detectProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = fullyNormalize(text);
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

/**
 * Metni hem orijinal hem normalize edilmiş haliyle kontrol eder
 * Güvenlik katmanı için ana giriş noktası
 */
export function hasProfanityOrHomoglyphs(text: string): boolean {
  // 1. Orijinal metni kontrol et
  if (detectProfanity(text)) return true;
  // 2. Normalize edilmiş metni kontrol et (homoglyph, leet, araçım sonrası)
  const normalized = fullyNormalize(text);
  if (detectProfanity(normalized)) return true;
  return false;
}
