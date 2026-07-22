/**
 * NVI Service Unit Tests
 * Gerçek SOAP isteği atılmaz — axios mock'lanır.
 */

import axios from 'axios';
import { validateTCKimlikFormat, verifyWithNVI, verifyWithNVICore } from '../../services/nvi.service';
import { BadRequestError, ServiceUnavailableError } from '../../utils/errors';

jest.mock('axios');
jest.mock('../../config/env', () => ({
  env: {
    NVI_ENDPOINT: 'https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx',
    TC_KIMLIK_PEPPER: 'test_pepper_value_16chars',
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

// ─── TC Kimlik Format Validasyonu ───────────────────────────────────────────

describe('validateTCKimlikFormat()', () => {
  it('11 haneli geçerli TC Kimlik kabul edilir', () => {
    // Matematiksel olarak geçerli bir TC Kimlik
    expect(validateTCKimlikFormat('10000000146')).toBe(true);
  });

  it('0 ile başlayan TC reddedilir', () => {
    expect(validateTCKimlikFormat('01234567890')).toBe(false);
  });

  it('11 haneden az TC reddedilir', () => {
    expect(validateTCKimlikFormat('1234567890')).toBe(false);
  });

  it('harf içeren TC reddedilir', () => {
    expect(validateTCKimlikFormat('1234567890A')).toBe(false);
  });

  it('boş string reddedilir', () => {
    expect(validateTCKimlikFormat('')).toBe(false);
  });

  it('algoritmik olarak geçersiz TC reddedilir', () => {
    expect(validateTCKimlikFormat('12345678901')).toBe(false);
  });
});

// ─── NVI Verification ───────────────────────────────────────────────────────

describe('verifyWithNVI()', () => {
  const validDto = {
    tcKimlik: '10000000146',
    firstName: 'AHMET',
    lastName: 'YILMAZ',
    birthYear: 1990,
  };

  beforeEach(() => jest.clearAllMocks());

  it('NVİ true döndürürse true döner', async () => {
    mockAxios.post.mockResolvedValue({
      data: '<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>',
    });

    const result = await verifyWithNVI(validDto);
    expect(result).toBe(true);
  });

  it('NVİ false döndürürse false döner', async () => {
    mockAxios.post.mockResolvedValue({
      data: '<TCKimlikNoDogrulaResult>false</TCKimlikNoDogrulaResult>',
    });

    const result = await verifyWithNVI(validDto);
    expect(result).toBe(false);
  });

  it('geçersiz TC formatında BadRequestError fırlatır', async () => {
    await expect(verifyWithNVI({ ...validDto, tcKimlik: '123' })).rejects.toThrow(BadRequestError);
  });

  it('ağ zaman aşımında ServiceUnavailableError fırlatır', async () => {
    const timeoutError = new Error('timeout');
    (timeoutError as any).code = 'ECONNABORTED';
    (timeoutError as any).isAxiosError = true;
    mockAxios.post.mockRejectedValue(timeoutError);
    mockAxios.isAxiosError.mockReturnValue(true);

    await expect(verifyWithNVICore(validDto)).rejects.toThrow(ServiceUnavailableError);
  });

  it('parse edilemeyen XML yanıtında ServiceUnavailableError fırlatır', async () => {
    mockAxios.post.mockResolvedValue({ data: '<invalid>xml</invalid>' });

    await expect(verifyWithNVICore(validDto)).rejects.toThrow(ServiceUnavailableError);
  });

  it('XML injection karakterleri sanitize edilir', async () => {
    mockAxios.post.mockResolvedValue({
      data: '<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>',
    });

    await verifyWithNVICore({
      ...validDto,
      firstName: 'AH<MET',
      lastName: 'YIL&MAZ',
    });

    // axios'a gönderilen body'de < ve & escape edilmiş olmalı
    const requestBody = mockAxios.post.mock.calls[0][1] as string;
    expect(requestBody).toContain('&lt;');
    expect(requestBody).toContain('&amp;');
    expect(requestBody).not.toContain('<AHMET');
  });
});
