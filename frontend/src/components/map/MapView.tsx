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
  [25.664, 35.808], // Güneybatı (Ege/Akdeniz açıkları)
  [44.822, 42.104]  // Kuzeydoğu (Artvin/Kars ötesi)
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

  // Kusursuz ve iptal edilemez otomatik eğim (scroll'a bağlı)
  const onMove = useCallback((evt: any) => {
    const nextZoom = evt.viewState.zoom;
    let targetPitch = 0;

    if (nextZoom < 14.5) {
      targetPitch = 0;
    } else if (nextZoom >= 15.5) {
      targetPitch = 60;
    } else {
      // 14.5 ile 15.5 arasında pürüzsüz geçiş (scroll tekerleğine birebir bağlı)
      const ratio = nextZoom - 14.5;
      targetPitch = ratio * 60;
    }

    setViewState({
      ...evt.viewState,
      pitch: targetPitch,
      bearing: 0 // Asla Kuzey'den şaşmasın
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
  }, []);
  const [mapStyle, setMapStyle] = useState<any>('mapbox://styles/mapbox/outdoors-v12');
  
  const { clusters, fetchClusters, selectedIssue, selectIssue, filters } = useAppStore();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      fetch(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`)
        .then(r => r.json())
        .then(style => {
          if (style && style.layers) {
            
            // Mapbox veritabanında eksik olan Türkçe karşılıkları zorla eşleştiriyoruz
            const getTrNameExpr = [
              "match",
              ["get", "name_en"],
              "Mosul", "Musul",
              "Aleppo", "Halep",
              "Damascus", "Şam",
              "Baghdad", "Bağdat",
              "Tehran", "Tahran",
              "Kirkuk", "Kerkük",
              "Basra", "Basra",
              "Tabriz", "Tebriz",
              "Baku", "Bakü",
              "Nicosia", "Lefkoşa",
              "Athens", "Atina",
              "Sofia", "Sofya",
              "Bucharest", "Bükreş",
              "Beirut", "Beyrut",
              "Amman", "Amman",
              "Tbilisi", "Tiflis",
              "Yerevan", "Erivan",
              "Thessaloniki", "Selanik",
              "Batumi", "Batum",
              "Syria", "Suriye",
              "Iraq", "Irak",
              "Iran", "İran",
              "Lebanon", "Lübnan",
              "Greece", "Yunanistan",
              "Bulgaria", "Bulgaristan",
              "Georgia", "Gürcistan",
              "Armenia", "Ermenistan",
              "Cyprus", "Kıbrıs",
              "North Macedonia", "Kuzey Makedonya",
              "Albania", "Arnavutluk",
              "Montenegro", "Karadağ",
              "Kosovo", "Kosova",
              "Serbia", "Sırbistan",
              "Azerbaijan", "Azerbaycan",
              "Russia", "Rusya",
              "Ukraine", "Ukrayna",
              "Urmia", "Urmiye",
              "Sulaymaniyah", "Süleymaniye",
              "Halabja", "Halepçe",
              "Ar-Raqqa", "Rakka",
              "Ramadi", "Ramadi",
              "Kermanshah", "Kirmanşah",
              "Qom", "Kum",
              "Zanjan", "Zencan",
              "Hamadan", "Hemedan",
              "Qazvin", "Kazvin",
              "Shekh Mama", "Şeyh Mama",
              "Corfu", "Korfu",
              "Tirana", "Tiran",
              "Skopje", "Üsküp",
              "Plovdiv", "Filibe",
              "Alexandroupoli", "Dedeağaç",
              "Komotini", "Gümülcine",
              "Xanthi", "İskeçe",
              "Ioannina", "Yanya",
              "Corinth", "Korint",
              "Sochi", "Soçi",
              "Grozny", "Grozni",
              "Makhachkala", "Mahaçkale",
              "Ganja", "Gence",
              "Gyumri", "Gümrü",
              "Garabogaz", "Karaboğaz",
              "Aegean Sea", "Ege Denizi",
              "Ionian Sea", "İyon Denizi",
              "Black Sea", "Karadeniz",
              "Mediterranean Sea", "Akdeniz",
              "Caspian Sea", "Hazar Denizi",
              "Sea of Azov", "Azak Denizi",
              ["coalesce", ["get", "name_tr"], ["get", "name_en"], ["get", "name"]]
            ];

            const localizeTextField = (field: any): any => {
              if (typeof field === 'string') {
                return field.replace(/\{name(_[a-z]+)?\}/g, '{name_tr}').replace(/\{name\}/g, '{name_tr}');
              }
              if (Array.isArray(field)) {
                if (field[0] === 'get' && typeof field[1] === 'string' && (field[1] === 'name' || field[1] === 'name_en')) {
                  return getTrNameExpr;
                }
                return field.map(localizeTextField);
              }
              return field;
            };

            style.layers.forEach((layer: any) => {
              if (layer.layout && layer.layout['text-field']) {
                layer.layout['text-field'] = localizeTextField(layer.layout['text-field']);
              }
            });

            setMapStyle(style);
          }
        })
        .catch(err => console.error("Style fetch error:", err));
    }
  }, []);

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

    // 1. Dil Eklentisini Haritaya Ekle (Bütün dünyayı otomatik Türkçeye zorlar)
    try {
      const language = new MapboxLanguage({ defaultLanguage: 'tr' });
      map.addControl(language);
    } catch (error) {
      console.warn("Language plugin error:", error);
    }

    // Harita ilk açıldığında Türkiye sınırlarına otomatik cuk diye oturur
    try {
      map.fitBounds(TURKEY_BOUNDS, {
        padding: 20,
        duration: 0
      });
      // Tam oturduğu anki zoom seviyesini kaydet ki bu seviyede sağa sola kaydırmayı yasaklayalım
      setInitialZoom(map.getZoom());
    } catch (error) {
      console.warn("fitBounds failed:", error);
    }

    // Gökyüzü (Sky) Katmanı
    if (!map.getLayer('sky')) {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });
    }

    // 3D Binalar
    if (!map.getLayer('3d-buildings')) {
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "height"],
            0, "#ffffff",     // Yer seviyesinde bembeyaz
            20, "#f8fafc",    // Biraz yükseklerde hafif kırık beyaz
            50, "#e0f2fe",    // Orta boy binalarda çok açık gökyüzü mavisi yansıması
            100, "#bae6fd"    // Gökdelenlerde premium açık mavi cam efekti
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.95 // Daha net ve parlak görünüm
        }
      });
    }
  }, []);

  const handleMoveEnd = (e: any) => {
    setViewState(e.viewState);
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;
    
    fetchClusters({
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
      zoom: Math.floor(e.viewState.zoom),
    });
  };

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
    return (clusters ?? []).filter((item: any) => {
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

  const bounds = mapRef.current ? mapRef.current.getMap().getBounds().toArray().flat() as [number, number, number, number] : null;

  const { clusters: superClusters, supercluster } = useSupercluster({
    points,
    bounds,
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
                  } catch (err) {
                    console.error('Sorun detayları yüklenemedi', err);
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
