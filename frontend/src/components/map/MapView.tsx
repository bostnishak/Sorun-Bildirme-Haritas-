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
  latitude: 39.0,
  longitude: 34.85, // Tam denge noktası (ortalanmış)
  zoom: 5.7,        // Boşluğun tam yarısı kadar olması için zoom bir tık artırıldı
  pitch: 0,
  bearing: 0
};
const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [24.5, 35.5], // Güneybatı (Ege'ye biraz daha boşluk)
  [45.5, 42.5]  // Kuzeydoğu
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
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>;
    case 'TRANSPORTATION':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /><path d="M5 11l2-5h10l2 5" /></svg>;
    case 'ENVIRONMENT':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>;
    default:
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
  }
};

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(TURKEY_CENTER);
  const [clusterZoom, setClusterZoom] = useState(TURKEY_CENTER.zoom);
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
    // Sayfa açılır açılmaz veriyi getir (Mapbox motorunun yüklenmesini beklemeden, paralel olarak)
    fetchClusters({
      minLng: TURKEY_BOUNDS[0][0],
      minLat: TURKEY_BOUNDS[0][1],
      maxLng: TURKEY_BOUNDS[1][0],
      maxLat: TURKEY_BOUNDS[1][1],
      zoom: Math.floor(TURKEY_CENTER.zoom),
    });

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
      const TRANSLATIONS: Record<string, string> = {
        "Georgia": "Gürcistan",
        "Syria": "Suriye",
        "Iraq": "Irak",
        "Iran": "İran",
        "Bulgaria": "Bulgaristan",
        "Greece": "Yunanistan",
        "Armenia": "Ermenistan",
        "Cyprus": "Kıbrıs",
        "Mosul": "Musul",
        "Aleppo": "Halep",
        "Erbil": "Erbil",
        "Damascus": "Şam",
        "Batumi": "Batum",
        "Tbilisi": "Tiflis",
        "Thessaloniki": "Selanik",
        "Athens": "Atina",
        "Sofia": "Sofya",
        "Nicosia": "Lefkoşa",
        "Tehran": "Tahran",
        "Tabriz": "Tebriz",
        "Baku": "Bakü",
        "Azerbaijan": "Azerbaycan",
        "Lebanon": "Lübnan",
        "Beirut": "Beyrut",
        "Amman": "Amman",
        "Jordan": "Ürdün",
        "Israel": "İsrail",
        "Palestine": "Filistin",
        "Jerusalem": "Kudüs",
        "Cairo": "Kahire",
        "Egypt": "Mısır",
        "Black Sea": "Karadeniz",
        "Mediterranean Sea": "Akdeniz",
        "Aegean Sea": "Ege Denizi",
        "Sea of Marmara": "Marmara Denizi",
        "Al-Hasaka": "Haseke",
        "Al-Raqqa": "Rakka",
        "Sinjar": "Sincar",
        "Al Baaj": "Baac",
        "Tal Afar": "Telafer",
        "Zakho": "Zaho",
        "Shekh Mama": "Şeyh Mama",
        "Akhalkalaki": "Ahılkelek",
        "Gyumri": "Gümrü",
        "Yerevan": "Erivan",
        "Plovdiv": "Filibe",
        "Haskovo": "Hasköy",
        "Kardzhali": "Kırcaali",
        "Komotini": "Gümülcine",
        "Xanthi": "İskeçe",
        "Smolyan": "Paşmaklı",
        "Stara Zagora": "Eski Zağra",
        "Sliven": "İslimye",
        "Burgas": "Burgaz",
        "Varna": "Varna",
        "Aleksandroupoli": "Dedeağaç",
        "Kavala": "Kavala",
        "Ruse": "Rusçuk"
      };

      const fallbackName = ['coalesce', ['get', 'name_en'], ['get', 'name']];
      const matchExpr: any[] = ['match', fallbackName];
      Object.entries(TRANSLATIONS).forEach(([en, tr]) => {
        matchExpr.push(en, tr);
      });
      matchExpr.push(fallbackName);

      const baseTextField = ['coalesce', ['get', 'name_tr'], matchExpr];
      const finalTextField = [
        'match',
        baseTextField,
        'Kahramanmaraş', 'K.Maraş',
        'Gaziantep', 'G.Antep',
        'Şanlıurfa', 'Ş.Urfa',
        baseTextField
      ];

      const currentStyle = map.getStyle();
      if (currentStyle && currentStyle.layers) {
        currentStyle.layers.forEach((layer: any) => {
          // 'Türkiye' yazısını (ve diğer ülke isimlerini) gizle
          if (layer.id === 'country-label') {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }

          if (layer.type === 'symbol' && layer.id.includes('label')) {
            // Dil ayarı (Türkçe) ve Kısaltmalar
            if (layer.layout && layer.layout['text-field']) {
              const currentTextField = JSON.stringify(layer.layout['text-field']);
              if (!currentTextField.includes('name_tr') || !currentTextField.includes('K.Maraş')) {
                map.setLayoutProperty(layer.id, 'text-field', finalTextField);
              }
            }

            // Şehir isimlerinin (Mardin gibi) daha sık ve daha görünür olmasını sağlayan performans/çarpışma ayarı
            if (layer.id.includes('settlement-major-label') || layer.id.includes('settlement-minor-label') || layer.id === 'place-city-label') {
              try {
                // Yazı etrafındaki görünmez çarpışma kutusunu sıfırla ki daha çok şehir sığsın
                map.setLayoutProperty(layer.id, 'text-padding', 0);

                // Büyükşehirlerin her koşulda (diğer yazılarla hafif üst üste gelse bile) görünmesini zorunlu kıl
                if (layer.id.includes('major') || layer.id.includes('city')) {
                  map.setLayoutProperty(layer.id, 'text-allow-overlap', true);
                  map.setLayoutProperty(layer.id, 'text-ignore-placement', false);
                }

                // Punto Ayarı: İstanbul, Ankara, İzmir mega kalsın, diğer hepsi Adana (standart) boyutunda olsun
                map.setLayoutProperty(layer.id, 'text-size', [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  4, [
                    'match',
                    ['get', 'name_en'],
                    ['Istanbul', 'Ankara', 'Izmir', 'İstanbul', 'İzmir'], 15.5, // Uzaktan mega kentler
                    12.5 // Uzaktan diğer şehirler (Adana boyutu)
                  ],
                  10, [
                    'match',
                    ['get', 'name_en'],
                    ['Istanbul', 'Ankara', 'Izmir', 'İstanbul', 'İzmir'], 24, // Yakından mega kentler
                    17 // Yakından diğer şehirler
                  ]
                ]);
              } catch (e) {
                // Bazı stillerde bu özellikler olmayabilir, sessizce geç
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn("Language override error:", error);
    }

    try {
      setInitialZoom(map.getZoom());
    } catch (error) {
      console.warn("zoom check failed:", error);
    }
    try {
      const b = map.getBounds();
      if (b) setMapBounds(b.toArray().flat() as [number, number, number, number]);
    } catch (_) { }
    try {
      map.addSource('mapbox-satellite', {
        type: 'raster',
        url: 'mapbox://mapbox.satellite'
      });
      const layers = map.getStyle().layers as any[];
      const firstRoadLayer = layers.find(
        (l: any) => l.type === 'line' && l.id && (l.id.includes('road') || l.id.includes('bridge'))
      );
      map.addLayer({
        id: 'satellite-raster',
        type: 'raster',
        source: 'mapbox-satellite',
        minzoom: 11, // HAYATİ PERFORMANS DOKUNUŞU: Başlangıçta görünmeyen uydu haritası boş yere indirilmez!
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

    if (zoom <= TURKEY_CENTER.zoom + 0.05) {
      const isCentered = Math.abs(e.viewState.longitude - TURKEY_CENTER.longitude) < 0.05 &&
        Math.abs(e.viewState.latitude - TURKEY_CENTER.latitude) < 0.05;
      if (!isCentered) {
        setViewState({
          ...e.viewState,
          pitch: calculatePitch(zoom),
          bearing: 0
        });
        setTimeout(() => {
          mapRef.current?.easeTo({
            center: [TURKEY_CENTER.longitude, TURKEY_CENTER.latitude],
            duration: 1200,
            essential: true
          });
        }, 10);
        return; 
      }
    }

    setViewState({
      ...e.viewState,
      pitch: calculatePitch(zoom),
      bearing: 0
    });
    setClusterZoom(zoom);
    const b = mapRef.current?.getBounds();
    if (b) {
      setMapBounds(b.toArray().flat() as [number, number, number, number]);
      fetchClusters({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
        zoom: Math.floor(zoom),
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
    zoom: Math.round(clusterZoom),
    options: { radius: 75, maxZoom: 16 }
  });

  const renderedMarkers = useMemo(() => {
    return superClusters.map((cluster: any) => {
      const [longitude, latitude] = cluster.geometry.coordinates;
      const {
        cluster: isCluster,
        point_count: pointCount,
        category,
        status,
        issueId,
      } = cluster.properties;

      if (isCluster) {
        const size = Math.min(45 + (pointCount / points.length) * 40, 80);
        return (
          <Marker
            key={`cluster-${cluster.id}`}
            longitude={longitude}
            latitude={latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              const expansionZoom = Math.min(
                supercluster.getClusterExpansionZoom(cluster.id),
                20
              );
              setViewState(prev => ({
                ...prev,
                longitude,
                latitude,
                zoom: expansionZoom,
                transitionDuration: 500
              }));
              mapRef.current?.flyTo({
                center: [longitude, latitude],
                zoom: expansionZoom,
                duration: 500
              });
            }}
          >
            <div
              className="custom-leaflet-cluster"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                backgroundColor: 'rgba(37, 99, 235, 0.95)',
                border: '3px solid white',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${Math.max(12, size / 3)}px`,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(4px)'
              }}
            >
              {pointCount}
            </div>
          </Marker>
        );
      }

      const statusColor = STATUS_COLORS[status] || STATUS_COLORS.OPEN;

      return (
        <Marker
          key={`issue-${issueId}`}
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            selectIssue(cluster.properties);
          }}
        >
          <div
            className="custom-individual-marker"
            style={{
              width: '32px',
              height: '40px',
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transformOrigin: 'bottom center',
              zIndex: 1
            }}
          >
            <svg viewBox="0 0 24 24" fill={statusColor} style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            </svg>
            
            <span style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
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
    });
  }, [superClusters, supercluster, selectIssue]);

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
        minZoom={TURKEY_CENTER.zoom}
        maxZoom={17}
        dragPan={initialZoom !== null ? viewState.zoom >= initialZoom + 1.0 : false}
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={false}
        reuseMaps={true}
        localIdeographFontFamily="sans-serif"
        optimizeForTerrain={false}
      >
        {renderedMarkers}
      </Map>

      {
        selectedIssue && (
          <IssuePopup issue={selectedIssue} onClose={() => selectIssue(null)} />
        )
      }
    </div>
  );
}
