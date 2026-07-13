/**
 * PII Masker Utility
 * 
 * Verilerin LLM servislerine (örn. OpenAI) gitmeden önce lokal olarak maskelenmesini sağlar.
 * KVKK (GDPR) uyumluluğu için kritik bir güvenlik katmanıdır.
 */

const PII_REGEXES = [
  // 11 haneli sayısal değerler (TCKN benzeri)
  { regex: /\b[1-9]\d{10}\b/g, replacement: '[GİZLENMİŞ_TCKN]' },
  
  // Telefon (05xx xxx xx xx vb.)
  { regex: /(?:\+?90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g, replacement: '[GİZLENMİŞ_TELEFON]' },
  
  // Kredi Kartı (4 haneli bloklar)
  { regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12})\b/g, replacement: '[GİZLENMİŞ_KREDİ_KARTI]' },
  
  // TR IBAN
  { regex: /\bTR\d{2}\s*(?:\d{4}\s*){5}\d{2}\b/gi, replacement: '[GİZLENMİŞ_IBAN]' }
];

export function maskPII(text: string): string {
  if (!text) return text;
  
  let maskedText = text;
  
  for (const { regex, replacement } of PII_REGEXES) {
    maskedText = maskedText.replace(regex, replacement);
  }
  
  return maskedText;
}
