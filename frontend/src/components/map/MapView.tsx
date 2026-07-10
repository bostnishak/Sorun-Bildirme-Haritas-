'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, MapRef } from 'react-map-gl';
// @ts-ignore
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';
import useSupercluster from 'use-supercluster';
import { useAppStore } from '@/store/useAppStore';
import { IssuePopup } from './IssuePopup';
import { initSocket } from '@/lib/socket';
import styles from './MapView.module.css';

// Mapbox token'a artık gerek yok
// const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',      // Kırmızı (Acil / Açık)
  IN_REVIEW: '#f59e0b', // Sarı (İnceleniyor)
  RESOLVED: '#10b981',  // Yeşil (Çözüldü)
  REJECTED: '#6b7280',  // Gri
};

const TURKEY_CENTER = {
  latitude: 38.9637,
  longitude: 35.2433,
  zoom: 5.5,
  pitch: 0, // pitch: 45,
  bearing: 0 // bearing: -17.6
};
const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [25.0, 35.5], // Güneybatı — Ege açıkları dahil biraz daha geniş
  [45.5, 43.0]  // Kuzeydoğu — Artvin/Kars/Iğdır ötesi dahil
];

const CITY_COORDS: Record<string, { latitude: number; longitude: number; zoom: number; pitch: number; bearing: number }> = {
  İstanbul: { latitude: 41.0082, longitude: 28.9784, zoom: 10, pitch: 0, bearing: 0 },
  Ankara: { latitude: 39.9334, longitude: 32.8597, zoom: 10, pitch: 0, bearing: 0 },
  İzmir: { latitude: 38.4237, longitude: 27.1428, zoom: 10, pitch: 0, bearing: 0 },
  Antalya: { latitude: 36.8969, longitude: 30.7133, zoom: 10, pitch: 0, bearing: 0 },
  Bursa: { latitude: 40.1828, longitude: 29.0667, zoom: 10, pitch: 0, bearing: 0 },
};

// SVG Kategori İkon Oluşturucu
const getCategorySvg = (category: string) => {
  const color = 'white';
  switch (category) {
    case 'WATER_SANITATION':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
    case 'TRANSPORTATION':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 11l2-5h10l2 5"/></svg>;
    case 'ENVIRONMENT':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
    default:
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
  }
};

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(TURKEY_CENTER);
  const [initialZoom, setInitialZoom] = useState<number | null>(null);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);

// calculatePitch — component dışında tanımlı, her render'da yeniden oluşmaz
const calculatePitch = (zoom: number): number => {
  if (zoom < 15) return 0;
  if (zoom >= 17) return 65;
  return Math.round((zoom - 15) * 32.5);
};

// STATIC_FALLBACK_MARKERS — module seviyesinde sabit, re-render'da yeniden yaratılmaz
const STATIC_FALLBACK_MARKERS = [
  { id: '101', title: 'Tarihi Yarımada Kaldırım ve Yol Göçmesi', category: 'TRANSPORTATION', priority: 'HIGH', status: 'OPEN', city: 'İstanbul', district: 'Fatih', address: 'Alemdar, Divan Yolu Cd. No:1, 34110 Fatih/İstanbul', lat: 41.0082, lng: 28.9506 },
  { id: '102', title: 'Kızılay Meydanı Ana Şebeke Su Patlaması', category: 'WATER_SANITATION', priority: 'CRITICAL', status: 'IN_REVIEW', city: 'Ankara', district: 'Çankaya', address: 'Kızılay, Atatürk Blv, 06420 Çankaya/Ankara', lat: 39.9208, lng: 32.8541 },
  { id: '103', title: 'Kordon Boyu Çöp ve Atık Temizliği Gecikmesi', category: 'ENVIRONMENT', priority: 'MEDIUM', status: 'RESOLVED', city: 'İzmir', district: 'Konak', address: 'Alsancak, Atatürk Cd. No:120, 35220 Konak/İzmir', lat: 38.4271, lng: 27.1432 },
  { id: '104', title: 'Nilüfer OSB Yolu Fiber Kazı Çukuru', category: 'INFRASTRUCTURE', priority: 'HIGH', status: 'OPEN', city: 'Bursa', district: 'Nilüfer', address: 'Beşevler Caddesi No:58, Nilüfer/Bursa', lat: 40.2072, lng: 28.9738 },
  { id: '105', title: 'Konyaaltı Sahil Yolu Aydınlatma Direkleri Arızalı', category: 'LIGHTING', priority: 'MEDIUM', status: 'IN_REVIEW', city: 'Antalya', district: 'Konyaaltı', address: 'Gürsu, Akdeniz Blv. Sahil Yolu, 07070 Konyaaltı/Antalya', lat: 36.8729, lng: 30.6285 },
  { id: '106', title: 'Seyhan Atatürk Parkı Yürüyüş Yolu Bakımsız', category: 'PARKS', priority: 'LOW', status: 'RESOLVED', city: 'Adana', district: 'Seyhan', address: 'Reşatbey, Atatürk Parkı İçi, 01120 Seyhan/Adana', lat: 36.9968, lng: 35.3248 },
  { id: '107', title: 'Tepebaşı Üniversite Caddesi Altgeçit Su Baskını Riski', category: 'SECURITY', priority: 'CRITICAL', status: 'OPEN', city: 'Eskişehir', district: 'Tepebaşı', address: 'Yenibağlar, Üniversite Cd. No:25, 26150 Tepebaşı/Eskişehir', lat: 39.7769, lng: 30.5153 },
  { id: '108', title: 'Şahinbey Karat aş Mahallesi Rögar Kapağı Eksik', category: 'WATER_SANITATION', priority: 'HIGH', status: 'IN_REVIEW', city: 'Gaziantep', district: 'Şahinbey', address: 'Karat aş, Atatürk Blv. No:41, 27470 Şahinbey/Gaziantep', lat: 37.0634, lng: 37.3763 },
];

  // mapStyle hiç değişmez — uydu geçişi raster katman opacity ile yapılıyor
  const [mapStyle] = useState<string>('mapbox://styles/mapbox/outdoors-v12');

  // Sadece pitch/bearing — style switching yok
  const onMove = useCallback((evt: any) => {
    const zoom = evt.viewState.zoom;
    setViewState({
      ...evt.viewState,
      pitch: calculatePitch(zoom),
      bearing: 0
    });
  }, []);

  const { clusters, fetchClusters, selectedIssue, selectIssue, filters } = useAppStore();


  useEffect(() => {
    const socket = initSocket();

    const handleIssueUpdate = (data: any) => {
      console.log('[Socket] Harita verisi güncellendi', data);
      
      // Haritanın mevcut bounding box'ını alıp yeniden veri çeker
      if (mapRef.current) {
        const bounds = mapRef.current.getBounds();
        if (bounds) {
          fetchClusters({
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
            zoom: Math.floor(mapRef.current.getZoom()),
          });
        }
      }
    };

    socket.on('issue-updated', handleIssueUpdate);

    return () => {
      socket.off('issue-updated', handleIssueUpdate);
    };
  }, [fetchClusters]);

  const handleMapLoad = useCallback((e: any) => {
    const map = e.target;

    // 1. Dil Eklentisi (Manuel olarak tüm harita katmanlarındaki isimleri Türkçe'ye çeviriyoruz)
    try {
      const currentStyle = map.getStyle();
      if (currentStyle && currentStyle.layers) {
        currentStyle.layers.forEach((layer: any) => {
          if (layer.type === 'symbol' && layer.id.includes('label')) {
            // Sadece text-field olanları ve zaten name_tr eklenmemiş olanları değiştir
            if (layer.layout && layer.layout['text-field']) {
              const currentTextField = JSON.stringify(layer.layout['text-field']);
              if (!currentTextField.includes('name_tr')) {
                map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_tr'], ['get', 'name']]);
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn("Language override error:", error);
    }

    // 2. Türkiye sınırlarına fit
    try {
      map.fitBounds(TURKEY_BOUNDS, {
        padding: { top: 30, bottom: 50, left: 30, right: 30 },
        duration: 0
      });
      setInitialZoom(map.getZoom());
    } catch (error) {
      console.warn("fitBounds failed:", error);
    }

    // İlk bounds'u da burada al — render'da DOM okuma yok
    try {
      const b = map.getBounds();
      if (b) setMapBounds(b.toArray().flat() as [number,number,number,number]);
    } catch (_) {}

    //    Yolların altına eklenerek tüm vektör overlay'leri üstte kalır
    try {
      map.addSource('mapbox-satellite', {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 512  // 256'dan 512'ye — 4x daha az tile request, GPU daha az zorlanır
      });

      // İlk road-tipi layer bulunur — satellite onun altına eklenir
      const layers = map.getStyle().layers as any[];
      const firstRoadLayer = layers.find(
        (l: any) => l.type === 'line' && l.id && (l.id.includes('road') || l.id.includes('bridge'))
      );

      map.addLayer({
        id: 'satellite-raster',
        type: 'raster',
        source: 'mapbox-satellite',
        paint: {
          // Zoom 11: sayıdam → 12: hafif → 13: belirgin → 14: tam uydu
          // exponential easing: başı yavaş, sonu hızlı (Google Earth hissi)
          'raster-opacity': [
            'interpolate', ['exponential', 1.8], ['zoom'],
            11, 0,
            12, 0.08,
            13, 0.45,
            14, 1
          ]
        }
      }, firstRoadLayer?.id ?? undefined);
    } catch (err) {
      console.warn('Satellite layer error:', err);
    }

    // 4. Gökyüzü (Sky) katmanı — pitch > 0'da görünür
    try {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });
    } catch (err) {
      console.warn('Sky layer error:', err);
    }

  }, []);


  const handleMoveEnd = useCallback((e: any) => {
    const zoom = e.viewState.zoom;
    setViewState({
      ...e.viewState,
      pitch: calculatePitch(zoom),
      bearing: 0
    });

    const b = mapRef.current?.getBounds();
    if (b) {
      setMapBounds(b.toArray().flat() as [number,number,number,number]);
      fetchClusters({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
        zoom: Math.floor(e.viewState.zoom),
      });
    }
  }, [fetchClusters]);

  useEffect(() => {
    if (filters.city && CITY_COORDS[filters.city]) {
      setViewState(CITY_COORDS[filters.city]);
      mapRef.current?.flyTo({
        center: [CITY_COORDS[filters.city].longitude, CITY_COORDS[filters.city].latitude],
        zoom: CITY_COORDS[filters.city].zoom,
        duration: 1200
      });
    } else if (!filters.city) {
      mapRef.current?.flyTo({
        center: [TURKEY_CENTER.longitude, TURKEY_CENTER.latitude],
        zoom: TURKEY_CENTER.zoom,
        duration: 1200
      });
    }
  }, [filters.city]);

  const dataToRender = useMemo(() => {
    // API verisi yoksa gerçek adresli statik veriler göster
    const source = (clusters && clusters.length > 0) ? clusters : STATIC_FALLBACK_MARKERS;
    return source.filter((item: any) => {
      const category = item.category || item.dominant_category || '';
      const status = item.status || item.dominant_status || '';
      const city = item.city || '';
      const district = item.district || '';
      const title = item.title || item.label || '';

      if (filters.category && category !== filters.category) return false;
      if (filters.status && status !== filters.status) return false;
      if (filters.city && city !== filters.city) return false;
      if (filters.district && district !== filters.district) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return title.toLowerCase().includes(q) || city.toLowerCase().includes(q) || district.toLowerCase().includes(q);
      }
      return true;
    });
  }, [clusters, filters]);

  // Points format for supercluster
  const points = useMemo(() => dataToRender.map((item: any) => ({
    type: 'Feature' as const,
    properties: {
      cluster: false,
      issueId: item.id || item.ids?.[0],
      category: item.category || item.dominant_category || 'OTHER',
      status: item.status || item.dominant_status || 'OPEN',
      title: item.title || item.label || 'Sorun Bildirimi',
      ...item
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [item.lng, item.lat] as [number, number]
    }
  })), [dataToRender]);

  const { clusters: superClusters, supercluster } = useSupercluster({
    points,
    bounds: mapBounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 20 }
  });

  return (
    <div className={styles.mapWrapper}>
      <Map
        ref={mapRef}
        onLoad={handleMapLoad}
        {...viewState}
        onMove={onMove}
        onMoveEnd={handleMoveEnd}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        maxBounds={TURKEY_BOUNDS}
        {...({ maxBoundsViscosity: 1.0 } as any)} // Harita sınıra yapışır, kayma hissi biter
        minZoom={5.2}            // Çok fazla uzaklaşmayı engeller
        dragPan={initialZoom !== null ? viewState.zoom >= initialZoom + 1.0 : false}
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={false}
      >
        <NavigationControl position="bottom-right" />

        {superClusters.map((cluster: any) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount, issueId, status, category, title } = cluster.properties;

          if (isCluster) {
            const size = Math.min(58, Math.max(38, 32 + Math.log(pointCount) * 8));
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                latitude={latitude}
                longitude={longitude}
              >
                <div
                  className="cluster-marker"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: STATUS_COLORS.OPEN,
                    border: '3.5px solid white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.28)'
                  }}
                  onClick={() => {
                    const expansionZoom = Math.min(
                      supercluster.getClusterExpansionZoom(cluster.id),
                      20
                    );
                    mapRef.current?.flyTo({
                      center: [longitude, latitude],
                      zoom: expansionZoom,
                      duration: 500
                    });
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          const statusColor = STATUS_COLORS[status || 'OPEN'] || '#3b82f6';

          return (
            <Marker
              key={`issue-${issueId}`}
              latitude={latitude}
              longitude={longitude}
              anchor="bottom"
            >
              <div
                className="individual-marker-container"
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '44px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center'
                }}
                onClick={async () => {
                  try {
                    const { api } = await import('@/lib/api');
                    const response: any = await api.get(`/issues/${issueId}`);
                    selectIssue(response.data || response);
                  } catch {
                    // API çalışmıyorsa fallback veri listesinden bul ve popup aç
                    const fallback = STATIC_FALLBACK_MARKERS.find(m => String(m.id) === String(issueId));
                    if (fallback) {
                      selectIssue({
                        id: String(fallback.id),
                        title: fallback.title,
                        description: `${fallback.title}. Sorun yetkili birimler tarafından incelenmektedir.`,
                        category: fallback.category,
                        priority: fallback.priority as any,
                        status: fallback.status as any,
                        latitude: fallback.lat,
                        longitude: fallback.lng,
                        city: fallback.city,
                        district: fallback.district,
                        address: fallback.address,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        upvoteCount: Math.floor(Math.random() * 30) + 5,
                        upvotes: Math.floor(Math.random() * 30) + 5,
                      } as any);
                    }
                  }
                }}
              >
                {/* Teardrop Pin */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: '36px',
                    height: '36px',
                    background: statusColor,
                    border: '2.5px solid white',
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                  }}
                />
                {/* Icon */}
                <span style={{ 
                  position: 'absolute', 
                  top: 0,
                  width: '36px',
                  height: '36px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  zIndex: 2
                }}>
                  {getCategorySvg(category)}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>

      {selectedIssue && (
        <IssuePopup issue={selectedIssue} onClose={() => selectIssue(null)} />
      )}
    </div>
  );
}
