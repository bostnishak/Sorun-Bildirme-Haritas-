'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, MapRef } from 'react-map-gl';
// @ts-ignore
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';
import useSupercluster from 'use-supercluster';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_ISSUES } from '@/lib/mockData';
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

  const calculatePitch = (zoom: number): number => {
    if (zoom < 15) return 0;
    if (zoom >= 17) return 65;
    return Math.round((zoom - 15) * 32.5);
  };

  const [mapStyle] = useState<string>('mapbox://styles/mapbox/outdoors-v12');

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
    try {
      const currentStyle = map.getStyle();
      if (currentStyle && currentStyle.layers) {
        currentStyle.layers.forEach((layer: any) => {
          if (layer.type === 'symbol' && layer.id.includes('label')) {
            if (layer.layout && layer.layout['text-field']) {
              const currentTextField = JSON.stringify(layer.layout['text-field']);
              if (!currentTextField.includes('name_tr')) {
                map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_tr'], ['get', 'name_en'], ['get', 'name']]);
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn("Language override error:", error);
    }
    try {
      map.fitBounds(TURKEY_BOUNDS, {
        padding: { top: 30, bottom: 50, left: 30, right: 30 },
        duration: 0
      });
      setInitialZoom(map.getZoom());
    } catch (error) {
      console.warn("fitBounds failed:", error);
    }
    try {
      const b = map.getBounds();
      if (b) setMapBounds(b.toArray().flat() as [number,number,number,number]);
    } catch (_) {}
    try {
      map.addSource('mapbox-satellite', {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 512
      });
      const layers = map.getStyle().layers as any[];
      const firstRoadLayer = layers.find(
        (l: any) => l.type === 'line' && l.id && (l.id.includes('road') || l.id.includes('bridge'))
      );
      map.addLayer({
        id: 'satellite-raster',
        type: 'raster',
        source: 'mapbox-satellite',
        paint: {
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
    const source = (clusters && clusters.length > 0) ? clusters : MOCK_ISSUES;
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
      coordinates: [item.lng || item.longitude || 0, item.lat || item.latitude || 0] as [number, number]
    }
  })), [dataToRender]);

  const { clusters: superClusters, supercluster } = useSupercluster({
    points,
    bounds: mapBounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 16 }
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
        {...({ maxBoundsViscosity: 1.0 } as any)}
        minZoom={5.2}
        dragPan={true}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
      >
        <NavigationControl position="bottom-right" />
        {superClusters.map((cluster: any) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount, issueId, status, category } = cluster.properties;
          if (isCluster) {
            const size = Math.min(58, Math.max(38, 32 + Math.log(pointCount) * 8));
            return (
              <Marker key={`cluster-${cluster.id}`} latitude={latitude} longitude={longitude}>
                <div
                  className="cluster-marker"
                  style={{
                    width: `${size}px`, height: `${size}px`, background: STATUS_COLORS.OPEN,
                    border: '3.5px solid white', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'white',
                    fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.28)'
                  }}
                  onClick={() => {
                    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
                    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: expansionZoom, duration: 500 });
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
              onClick={async (e) => {
                e.originalEvent.stopPropagation();
                try {
                  const { api } = await import('@/lib/api');
                  const response: any = await api.get(`/issues/${issueId}`);
                  selectIssue(response.data || response);
                } catch {
                  const fallback = MOCK_ISSUES.find(m => String(m.id) === String(issueId));
                  if (fallback) selectIssue(fallback as any);
                }
              }}
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
