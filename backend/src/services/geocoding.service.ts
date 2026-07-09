import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface StructuredAddress {
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  doorNumber: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  provider: 'MAPBOX' | 'GOOGLE' | 'NOMINATIM' | 'FALLBACK';
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
    const response = await axios.get(url, { timeout: 4000 });
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
      city: city || 'İstanbul',
      district: district || 'Merkez',
      neighborhood: parsed.neighborhood || neighborhood || 'Merkez Mah.',
      street: parsed.street || street || 'Ana Cadde',
      doorNumber: parsed.doorNumber || doorNumber || 'No: 1',
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
    const response = await axios.get(url, { timeout: 4000 });
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
      city: city || 'İstanbul',
      district: district || 'Merkez',
      neighborhood: neighborhood || 'Merkez Mah.',
      street: street || 'Ana Cadde',
      doorNumber: doorNumber || '1',
      fullAddress: bestResult.formatted_address || `${street} No:${doorNumber}, ${neighborhood}, ${district}/${city}`,
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
 * 3. OPENSTREETMAP NOMINATIM API (Ücretsiz Yüksek Doğruluklu Fallback)
 */
async function geocodeWithNominatim(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr&addressdetails=1`;
    const response = await axios.get(url, {
      timeout: 4500,
      headers: { 'User-Agent': 'ChaosMind-TR-Issue-Reporter/1.0' },
    });

    const addr = response.data?.address;
    if (!addr) return null;

    const doorNumber = addr.house_number || addr.building || '1';
    const street = addr.road || addr.pedestrian || addr.street || 'Merkez Sokak';
    const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || 'Merkez Mahallesi';
    const district = addr.town || addr.district || addr.county || 'Merkez İlçe';
    const city = addr.city || addr.province || addr.state || 'İstanbul';

    const fullAddress = `${street} No:${doorNumber}, ${neighborhood}, ${district}/${city}`;

    return {
      city,
      district,
      neighborhood,
      street,
      doorNumber,
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
  // 1. Mapbox'ı dene
  const mapboxRes = await geocodeWithMapbox(lat, lng);
  if (mapboxRes) return mapboxRes;

  // 2. Google Maps'i dene
  const googleRes = await geocodeWithGoogle(lat, lng);
  if (googleRes) return googleRes;

  // 3. Nominatim'i dene
  const nominatimRes = await geocodeWithNominatim(lat, lng);
  if (nominatimRes) return nominatimRes;

  // 4. Son çare varsayılan yapılandırılmış adres
  return {
    city: 'İstanbul',
    district: 'Merkez',
    neighborhood: 'Merkez Mahallesi',
    street: 'Atatürk Caddesi',
    doorNumber: '1',
    fullAddress: `Atatürk Caddesi No:1, Merkez Mahallesi, Merkez/İstanbul (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    latitude: lat,
    longitude: lng,
    provider: 'FALLBACK',
  };
}
