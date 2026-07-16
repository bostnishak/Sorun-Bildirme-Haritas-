/**
 * Spatial utility functions for geographic calculations
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Haversine formula — iki koordinat arasındaki metre cinsinden mesafeyi hesaplar
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Verilen bir noktanın bir bounding box içinde olup olmadığını kontrol eder
 */
export function isWithinBoundingBox(
  point: LatLng,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): boolean {
  return (
    point.lat >= bbox.minLat &&
    point.lat <= bbox.maxLat &&
    point.lng >= bbox.minLng &&
    point.lng <= bbox.maxLng
  );
}

/**
 * Zoom seviyesine göre cluster grid boyutu belirler
 */
export function getClusterGridSize(zoom: number): number {
  if (zoom <= 5) return 1.5;
  if (zoom <= 7) return 0.8;
  if (zoom <= 9) return 0.3;
  if (zoom <= 10) return 0.08;
  return 0.0001; // zoom > 10 (şehir içi zoom): Her bildirimi tam koordinatında göster
}

/**
 * PostGIS için ST_MakePoint formatı (longitude önce gelir!)
 */
export function toPostGISPoint(lat: number, lng: number): string {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
}

/**
 * Koordinatların Türkiye sınırları içinde olup olmadığını kontrol eder (kaba filtre)
 */
export function isWithinTurkey(lat: number, lng: number): boolean {
  // Türkiye kabaca: 35.8-42.1 kuzey, 25.6-44.8 doğu
  return lat >= 35.8 && lat <= 42.1 && lng >= 25.6 && lng <= 44.8;
}

/**
 * Koordinat validasyonu
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}
