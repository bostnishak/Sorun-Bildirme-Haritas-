import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ServiceUnavailableError, BadRequestError } from '../utils/errors';

const NVI_SOAP_ACTION = 'https://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula';

export interface NVIVerifyDto {
  tcKimlik: string;
  firstName: string;
  lastName: string;
  birthYear: number;
}

/**
 * T.C. Kimlik numarasının matematiksel geçerliliğini kontrol eder
 * (NVİ'ye istek atmadan önce temel validasyon)
 */
export function validateTCKimlikFormat(tcKimlik: string): boolean {
  if (!/^\d{11}$/.test(tcKimlik)) return false;
  if (tcKimlik[0] === '0') return false;

  const digits = tcKimlik.split('').map(Number);

  // Algoritma: 1,3,5,7,9. haneler toplamının 7 katı - 2,4,6,8. haneler toplamından
  // 10'a bölümünün kalanı = 10. hane
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const d10 = ((oddSum * 7) - evenSum) % 10;

  if (d10 !== digits[9]) return false;

  // 11. hane: ilk 10 hanenin toplamının 10'a bölümünün kalanı
  const total = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (total % 10 !== digits[10]) return false;

  return true;
}

/**
 * NVİ SOAP servisi üzerinden TC Kimlik doğrulama
 * Returns true if verified, throws error otherwise
 */
export async function verifyWithNVI(dto: NVIVerifyDto): Promise<boolean> {
  // Format validasyonu
  if (!validateTCKimlikFormat(dto.tcKimlik)) {
    throw new BadRequestError('Geçersiz T.C. Kimlik numarası formatı.');
  }

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${dto.tcKimlik}</TCKimlikNo>
      <Ad>${sanitizeForXml(dto.firstName.toUpperCase().trim())}</Ad>
      <Soyad>${sanitizeForXml(dto.lastName.toUpperCase().trim())}</Soyad>
      <DogumYili>${dto.birthYear}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await axios.post(env.NVI_ENDPOINT, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': NVI_SOAP_ACTION,
      },
      timeout: 10000, // 10 saniye timeout
    });

    return parseNVIResponse(response.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.error('NVİ servis hatası', {
        status: err.response?.status,
        message: err.message,
      });

      if (err.code === 'ECONNABORTED') {
        throw new ServiceUnavailableError('NVİ Kimlik Doğrulama');
      }
    }
    throw new ServiceUnavailableError('NVİ Kimlik Doğrulama');
  }
}

/**
 * SOAP response'undan boolean sonucu parse eder
 */
function parseNVIResponse(xmlData: string): boolean {
  // <TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>
  const match = xmlData.match(/<TCKimlikNoDogrulaResult>(true|false)<\/TCKimlikNoDogrulaResult>/i);
  if (!match) {
    logger.error('NVİ yanıtı parse edilemedi', { xmlData: xmlData.substring(0, 200) });
    throw new ServiceUnavailableError('NVİ Kimlik Doğrulama');
  }
  return match[1].toLowerCase() === 'true';
}

/**
 * XML injection koruması
 */
function sanitizeForXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * TC Kimlik'i SHA-256 ile hash'le — plaintext saklanmaz
 * KVKK gereği: TC_KIMLIK_PEPPER JWT_SECRET'tan bağımsız tutulur;
 * JWT rotation, mevcut kullanıcı hash'lerini geçersiz kılmaz.
 */
export function hashTCKimlik(tcKimlik: string): string {
  return crypto
    .createHash('sha256')
    .update(tcKimlik + env.TC_KIMLIK_PEPPER)
    .digest('hex');
}
