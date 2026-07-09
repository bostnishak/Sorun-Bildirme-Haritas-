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
 * 3. KOMOOT PHOTON API (Yüksek Hassasiyetli OSM Bina/Sokak İnterpolasyonu)
 */
async function geocodeWithPhoton(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=tr`;
    const response = await axios.get(url, { timeout: 4000 });
    const feat = response.data?.features?.[0]?.properties;
    if (!feat) return null;

    const doorNumber = feat.housenumber || '';
    const street = feat.street || feat.name || '';
    const neighborhood = feat.district || feat.locality || '';
    const district = feat.county || feat.city || '';
    const city = feat.state || feat.city || 'İstanbul';

    const fullAddress = [
      street,
      doorNumber ? `No:${doorNumber}` : '',
      neighborhood,
      district && city ? `${district}/${city}` : city,
    ].filter(Boolean).join(', ');

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
    return null;
  }
}

/**
 * 4. OPENSTREETMAP NOMINATIM API (Yüksek Doğruluklu Zoom=18 Bina Seviyesi)
 */
async function geocodeWithNominatim(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr&addressdetails=1&zoom=18`;
    const response = await axios.get(url, {
      timeout: 4500,
      headers: { 'User-Agent': 'ChaosMind-TR-Issue-Reporter/1.0' },
    });

    const addr = response.data?.address;
    if (!addr) return null;

    const doorNumber = addr.house_number || addr.building || '';
    const street = addr.road || addr.pedestrian || addr.street || '';
    const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || '';
    const district = addr.town || addr.district || addr.county || '';
    const city = addr.city || addr.province || addr.state || 'İstanbul';

    const fullAddress = [
      street,
      doorNumber ? `No:${doorNumber}` : '',
      neighborhood,
      district && city ? `${district}/${city}` : city,
    ].filter(Boolean).join(', ');

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

  // 3. Photon (Komoot / OSM Yüksek Bina Çözünürlüğü) dene
  const photonRes = await geocodeWithPhoton(lat, lng);
  if (photonRes) return photonRes;

  // 4. Nominatim (Zoom 18) dene
  const nominatimRes = await geocodeWithNominatim(lat, lng);
  if (nominatimRes) return nominatimRes;

  // 5. Son çare koordinat tabanlı adres
  return {
    city: 'İstanbul',
    district: 'Merkez',
    neighborhood: '',
    street: '',
    doorNumber: '',
    fullAddress: `Koordinat Konumu (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
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
    const response = await axios.get(url, {
      timeout: 4500,
      headers: { 'User-Agent': 'ChaosMind-TR-Issue-Reporter/1.0' },
    });

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
