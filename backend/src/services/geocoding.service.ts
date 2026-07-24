import axios from 'axios';
import pRetry from 'p-retry';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { isWithinTurkey } from '../utils/spatial.utils';
import { BadRequestError } from '../utils/errors';

export interface StructuredAddress {
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  doorNumber: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  provider: 'MAPBOX' | 'GOOGLE' | 'NOMINATIM' | 'PHOTON' | 'FALLBACK';
}

/**
 * Türk adres standartlarına göre ayrıştırıcı yardımcı fonksiyonu
 */
function parseTurkishAddressComponents(rawText: string, context: any = {}): Partial<StructuredAddress> {
  let neighborhood = context.neighborhood || '';
  let street = context.street || '';
  let doorNumber = context.doorNumber || '';

  // Kapı numarası ayrıştırma: "No: 14", "No:14/A", "14/B" vb.
  const doorMatch = rawText.match(/(?:No|Kapı No|Numara)[:\s]*(\d+[\/\-A-Za-z]*)/i) ||
                    rawText.match(/\b(\d+[A-Z]?)\s*(?:numara|no)\b/i);
  if (doorMatch && !doorNumber) {
    doorNumber = doorMatch[1];
  }

  // Mahalle bulma: "... Mahallesi" veya "... Mah."
  const mahMatch = rawText.match(/([A-ZÇĞİÖŞÜa-zçğıöşü\s]+(?:Mahallesi|Mah\.|Mhl\.))/i);
  if (mahMatch && !neighborhood) {
    neighborhood = mahMatch[1].trim();
  }

  // Sokak / Cadde bulma: "... Caddesi", "... Sokak", "... Bulvarı"
  const sokakMatch = rawText.match(/([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s]+(?:Caddesi|Cad\.|Sokak|Sok\.|Sk\.|Bulvarı|Blv\.))/i);
  if (sokakMatch && !street) {
    street = sokakMatch[1].trim();
  }

  return {
    neighborhood,
    street,
    doorNumber: doorNumber || 'Belirtilmemiş',
  };
}

/**
 * 1. MAPBOX Reverse Geocoding API
 */
async function geocodeWithMapbox(lat: number, lng: number): Promise<StructuredAddress | null> {
  if (!env.MAPBOX_TOKEN) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${env.MAPBOX_TOKEN}&language=tr&types=address,poi,neighborhood,locality,place`;
    
    const runRequest = async () => axios.get(url, { timeout: 4000 });
    const response = await pRetry(runRequest, { retries: 2, minTimeout: 1000, maxTimeout: 3000 });
    
    const features = response.data?.features;

    if (!features || features.length === 0) return null;

    const bestFeature = features[0];
    const fullAddress = bestFeature.place_name || '';

    let city = '';
    let district = '';
    let neighborhood = '';
    let street = bestFeature.text || '';
    let doorNumber = bestFeature.address || '';

    for (const ctx of bestFeature.context || []) {
      const id = ctx.id || '';
      if (id.startsWith('place') || id.startsWith('region')) {
        city = ctx.text;
      } else if (id.startsWith('district') || id.startsWith('locality')) {
        district = ctx.text;
      } else if (id.startsWith('neighborhood')) {
        neighborhood = ctx.text;
      }
    }

    const parsed = parseTurkishAddressComponents(fullAddress, { neighborhood, street, doorNumber });

    return {
      city: city || 'Bilinmiyor',
      district: district || 'Bilinmiyor',
      neighborhood: parsed.neighborhood || neighborhood || '',
      street: parsed.street || street || '',
      doorNumber: parsed.doorNumber || doorNumber || '',
      fullAddress,
      latitude: lat,
      longitude: lng,
      provider: 'MAPBOX',
    };
  } catch (error) {
    logger.warn('Mapbox Reverse Geocoding hatası:', { error: String(error) });
    return null;
  }
}

/**
 * 2. GOOGLE MAPS Geocoding API (Fallback 1)
 */
async function geocodeWithGoogle(lat: number, lng: number): Promise<StructuredAddress | null> {
  const googleKey = env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}&language=tr`;
    
    const runRequest = async () => axios.get(url, { timeout: 4000 });
    const response = await pRetry(runRequest, { retries: 2, minTimeout: 1000, maxTimeout: 3000 });
    
    const results = response.data?.results;

    if (!results || results.length === 0) return null;

    const bestResult = results[0];
    let city = '';
    let district = '';
    let neighborhood = '';
    let street = '';
    let doorNumber = '';

    for (const comp of bestResult.address_components || []) {
      const types = comp.types || [];
      if (types.includes('street_number')) {
        doorNumber = comp.long_name;
      } else if (types.includes('route')) {
        street = comp.long_name;
      } else if (types.includes('administrative_area_level_4') || types.includes('sublocality_level_1')) {
        neighborhood = comp.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        district = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        city = comp.long_name;
      }
    }

    return {
      city: city || 'Bilinmiyor',
      district: district || 'Bilinmiyor',
      neighborhood: neighborhood || '',
      street: street || '',
      doorNumber: doorNumber || '',
      fullAddress: bestResult.formatted_address || [street, doorNumber ? `No:${doorNumber}` : '', neighborhood, district, city].filter(Boolean).join(', '),
      latitude: lat,
      longitude: lng,
      provider: 'GOOGLE',
    };
  } catch (error) {
    logger.warn('Google Reverse Geocoding hatası:', { error: String(error) });
    return null;
  }
}

/**
 * 3. KOMOOT PHOTON API (Yüksek Hassasiyetli OSM Bina/Sokak İnterpolasyonu)
 */
async function geocodeWithPhoton(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=tr`;
    
    const runRequest = async () => axios.get(url, { timeout: 4000 });
    const response = await pRetry(runRequest, { retries: 2, minTimeout: 1000, maxTimeout: 3000 });
    
    const feat = response.data?.features?.[0]?.properties;
    if (!feat) return null;

    let doorNumber = feat.housenumber || '';
    let street = feat.street || feat.name || '';
    let neighborhood = feat.district || feat.locality || '';
    const district = feat.county || feat.city || '';
    const city = feat.state || feat.city || 'İstanbul';

    const parsed = parseTurkishAddressComponents(`${street} ${doorNumber} ${neighborhood}`);
    if (!street && parsed.street) street = parsed.street;
    if (!doorNumber && parsed.doorNumber !== 'Belirtilmemiş') doorNumber = parsed.doorNumber;

    const fullAddress = [
      street,
      doorNumber ? `No: ${doorNumber}` : '',
      neighborhood,
      district && city ? `${district}/${city}` : city,
    ].filter(Boolean).join(', ');

    return {
      city: city || 'Bilinmiyor',
      district: district || 'Bilinmiyor',
      neighborhood,
      street: street || '',
      doorNumber: doorNumber || '',
      fullAddress,
      latitude: lat,
      longitude: lng,
      provider: 'PHOTON',
    };
  } catch (error) {
    return null;
  }
}

// SORUN-70: Nominatim Rate-Limit (1 req/sec) yönetimi
let lastNominatimRequestTime = 0;

/**
 * 4. OPENSTREETMAP NOMINATIM API (Yüksek Doğruluklu Zoom=18 Bina Seviyesi)
 */
async function geocodeWithNominatim(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastNominatimRequestTime;
    if (timeSinceLastRequest < 1100) {
      await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastRequest));
    }
    lastNominatimRequestTime = Date.now();

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr&addressdetails=1&zoom=18`;
    
    const runRequest = async () => axios.get(url, {
      timeout: 4500,
      headers: { 'User-Agent': 'Etiya Project-TR-Issue-Reporter/1.0' },
    });
    const response = await pRetry(runRequest, { retries: 2, minTimeout: 1000, maxTimeout: 3000 });

    const addr = response.data?.address;
    const displayName = response.data?.display_name || '';
    if (!addr && !displayName) return null;

    let doorNumber = addr?.house_number || addr?.building || '';
    let street = addr?.road || addr?.pedestrian || addr?.street || '';
    let neighborhood = addr?.neighbourhood || addr?.suburb || addr?.quarter || '';
    const district = addr?.town || addr?.district || addr?.county || '';
    const city = addr?.city || addr?.province || addr?.state || 'İstanbul';

    const parsed = parseTurkishAddressComponents(displayName);
    if (!street && parsed.street) street = parsed.street;
    if (!doorNumber && parsed.doorNumber !== 'Belirtilmemiş') doorNumber = parsed.doorNumber;

    const fullAddress = [
      street || '',
      doorNumber ? `No: ${doorNumber}` : '',
      neighborhood || '',
      district && city ? `${district}/${city}` : city,
    ].filter(Boolean).join(', ');

    return {
      city: city || 'Bilinmiyor',
      district: district || 'Bilinmiyor',
      neighborhood,
      street: street || '',
      doorNumber: doorNumber || '',
      fullAddress,
      latitude: lat,
      longitude: lng,
      provider: 'NOMINATIM',
    };
  } catch (error) {
    logger.warn('Nominatim Reverse Geocoding hatası:', { error: String(error) });
    return null;
  }
}

/**
 * Çoklu sağlayıcılı (Fallback destekli) Yüksek Hassasiyetli Tersine Konum Bulma servisi
 */
export async function reverseGeocodeHighPrecision(lat: number, lng: number): Promise<StructuredAddress> {
  // 3.1. Türkiye coğrafi ön kontrolü
  if (!isWithinTurkey(lat, lng)) {
    throw new BadRequestError('Konsolide coğrafi kodlama sadece Türkiye coğrafi sınırları içindeki koordinatlar için çalışır.');
  }

  // 1. Mapbox'ı dene
  try {
    const mapboxRes = await geocodeWithMapbox(lat, lng);
    if (mapboxRes) return mapboxRes;
  } catch (err) {
    logger.warn('Mapbox geocoding başarısız oldu, Google Maps\'e geçiliyor.', { error: String(err) });
  }

  // 2. Google Maps'i dene
  try {
    const googleRes = await geocodeWithGoogle(lat, lng);
    if (googleRes) return googleRes;
  } catch (err) {
    logger.warn('Google Maps geocoding başarısız oldu, Photon\'a geçiliyor.', { error: String(err) });
  }

  // 3. Photon (Komoot / OSM Yüksek Bina Çözünürlüğü) dene
  try {
    const photonRes = await geocodeWithPhoton(lat, lng);
    if (photonRes) return photonRes;
  } catch (err) {
    logger.warn('Photon geocoding başarısız oldu, Nominatim\'e geçiliyor.', { error: String(err) });
  }

  // 4. Nominatim (Zoom 18) dene
  try {
    const nominatimRes = await geocodeWithNominatim(lat, lng);
    if (nominatimRes) return nominatimRes;
  } catch (err) {
    logger.warn('Nominatim geocoding başarısız oldu, tam fallback uygulanıyor.', { error: String(err) });
  }

  // 5. Son çare koordinat tabanlı adres
  logger.warn('Tüm geocoding servisleri başarısız oldu, tam fallback uygulanıyor.', { lat, lng });
  return {
    city: 'Bilinmiyor',
    district: 'Bilinmiyor',
    neighborhood: '',
    street: '',
    doorNumber: '',
    fullAddress: `GPS Konumu (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
    latitude: lat,
    longitude: lng,
    provider: 'FALLBACK',
  };
}

/**
 * İleri Yönde Hassas Adres Arama (Adresten Enlem/Boylam Çözümleme)
 */
export async function searchAddressForward(query: string): Promise<{ lat: number; lng: number; fullAddress: string; city: string; district: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=tr&limit=1&addressdetails=1`;
    
    const runRequest = async () => axios.get(url, {
      timeout: 4500,
      headers: { 'User-Agent': 'Etiya Project-TR-Issue-Reporter/1.0' },
    });
    const response = await pRetry(runRequest, { retries: 2, minTimeout: 1000, maxTimeout: 3000 });

    if (response.data && response.data.length > 0) {
      const first = response.data[0];
      const addr = first.address || {};
      const city = addr.city || addr.province || addr.state || 'İstanbul';
      const district = addr.town || addr.district || addr.county || 'Merkez';
      return {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
        fullAddress: first.display_name,
        city,
        district,
      };
    }
    return null;
  } catch (err) {
    logger.warn('Forward Geocoding hatası:', { error: String(err) });
    return null;
  }
}
