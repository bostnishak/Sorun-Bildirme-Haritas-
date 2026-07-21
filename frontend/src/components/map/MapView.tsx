'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl, MapRef } from 'react-map-gl';
import { useRouter } from 'next/navigation';
// @ts-ignore
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import 'mapbox-gl/dist/mapbox-gl.css';
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

const CATEGORY_COLORS: Record<string, string> = {
  WATER_SANITATION: '#2563eb',
  TRANSPORTATION: '#ea580c',
  ENVIRONMENT: '#16a34a',
  INFRASTRUCTURE: '#7c3aed',
  SECURITY: '#dc2626',
  SAFETY: '#dc2626',
  LIGHTING: '#ca8a04',
  PARKS: '#15803d',
  OTHER: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  SAFETY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
  OTHER: 'Diğer',
};

const TURKEY_CENTER = {
  latitude: 39.0,
  longitude: 35.5, // Daha fazla doğuyu (Van vb.) kapsamak için kaydırıldı
  zoom: 5.6,       // Kullanıcı isteği üzerine 5.6 olarak güncellendi
  pitch: 0,
  bearing: 0
};
const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [25.4, 35.8], // Güneybatı — tam Türkiye sınırı (Yunanistan/Bulgaristan/Suriye dahil etme)
  [44.9, 42.4]  // Kuzeydoğu — tam Türkiye sınırı (Gürcistan/Ermenistan/İran dahil etme)
];

const CITY_COORDS: Record<string, { latitude: number; longitude: number; zoom: number; pitch: number; bearing: number }> = {
  'Adana': { latitude: 37.0000, longitude: 35.3213, zoom: 10, pitch: 0, bearing: 0 },
  'Adıyaman': { latitude: 37.7648, longitude: 38.2786, zoom: 10, pitch: 0, bearing: 0 },
  'Afyonkarahisar': { latitude: 38.7507, longitude: 30.5567, zoom: 10, pitch: 0, bearing: 0 },
  'Ağrı': { latitude: 39.7191, longitude: 43.0503, zoom: 10, pitch: 0, bearing: 0 },
  'Aksaray': { latitude: 38.3687, longitude: 34.0370, zoom: 10, pitch: 0, bearing: 0 },
  'Amasya': { latitude: 40.6499, longitude: 35.8353, zoom: 10, pitch: 0, bearing: 0 },
  'Ankara': { latitude: 39.9334, longitude: 32.8597, zoom: 10, pitch: 0, bearing: 0 },
  'Antalya': { latitude: 36.8969, longitude: 30.7133, zoom: 10, pitch: 0, bearing: 0 },
  'Ardahan': { latitude: 41.1105, longitude: 42.7022, zoom: 10, pitch: 0, bearing: 0 },
  'Artvin': { latitude: 41.1828, longitude: 41.8183, zoom: 10, pitch: 0, bearing: 0 },
  'Aydın': { latitude: 37.8560, longitude: 27.8416, zoom: 10, pitch: 0, bearing: 0 },
  'Balıkesir': { latitude: 39.6484, longitude: 27.8826, zoom: 10, pitch: 0, bearing: 0 },
  'Bartın': { latitude: 41.6344, longitude: 32.3375, zoom: 10, pitch: 0, bearing: 0 },
  'Batman': { latitude: 37.8812, longitude: 41.1351, zoom: 10, pitch: 0, bearing: 0 },
  'Bayburt': { latitude: 40.2552, longitude: 40.2249, zoom: 10, pitch: 0, bearing: 0 },
  'Bilecik': { latitude: 40.0567, longitude: 30.0665, zoom: 10, pitch: 0, bearing: 0 },
  'Bingöl': { latitude: 38.8855, longitude: 40.4966, zoom: 10, pitch: 0, bearing: 0 },
  'Bitlis': { latitude: 38.3938, longitude: 42.1232, zoom: 10, pitch: 0, bearing: 0 },
  'Bolu': { latitude: 40.7350, longitude: 31.6061, zoom: 10, pitch: 0, bearing: 0 },
  'Burdur': { latitude: 37.7203, longitude: 30.2908, zoom: 10, pitch: 0, bearing: 0 },
  'Bursa': { latitude: 40.1828, longitude: 29.0667, zoom: 10, pitch: 0, bearing: 0 },
  'Çanakkale': { latitude: 40.1553, longitude: 26.4142, zoom: 10, pitch: 0, bearing: 0 },
  'Çankırı': { latitude: 40.6013, longitude: 33.6134, zoom: 10, pitch: 0, bearing: 0 },
  'Çorum': { latitude: 40.5506, longitude: 34.9556, zoom: 10, pitch: 0, bearing: 0 },
  'Denizli': { latitude: 37.7765, longitude: 29.0864, zoom: 10, pitch: 0, bearing: 0 },
  'Diyarbakır': { latitude: 37.9144, longitude: 40.2306, zoom: 10, pitch: 0, bearing: 0 },
  'Düzce': { latitude: 40.8438, longitude: 31.1565, zoom: 10, pitch: 0, bearing: 0 },
  'Edirne': { latitude: 41.6818, longitude: 26.5623, zoom: 10, pitch: 0, bearing: 0 },
  'Elazığ': { latitude: 38.6810, longitude: 39.2264, zoom: 10, pitch: 0, bearing: 0 },
  'Erzincan': { latitude: 39.7500, longitude: 39.5000, zoom: 10, pitch: 0, bearing: 0 },
  'Erzurum': { latitude: 39.9000, longitude: 41.2700, zoom: 10, pitch: 0, bearing: 0 },
  'Eskişehir': { latitude: 39.7767, longitude: 30.5206, zoom: 10, pitch: 0, bearing: 0 },
  'Gaziantep': { latitude: 37.0662, longitude: 37.3833, zoom: 10, pitch: 0, bearing: 0 },
  'Giresun': { latitude: 40.9128, longitude: 38.3895, zoom: 10, pitch: 0, bearing: 0 },
  'Gümüşhane': { latitude: 40.4386, longitude: 39.5086, zoom: 10, pitch: 0, bearing: 0 },
  'Hakkari': { latitude: 37.5833, longitude: 43.7333, zoom: 10, pitch: 0, bearing: 0 },
  'Hatay': { latitude: 36.4018, longitude: 36.3498, zoom: 10, pitch: 0, bearing: 0 },
  'Iğdır': { latitude: 39.9167, longitude: 44.0500, zoom: 10, pitch: 0, bearing: 0 },
  'Isparta': { latitude: 37.7648, longitude: 30.5566, zoom: 10, pitch: 0, bearing: 0 },
  'İstanbul': { latitude: 41.0082, longitude: 28.9784, zoom: 10, pitch: 0, bearing: 0 },
  'İzmir': { latitude: 38.4237, longitude: 27.1428, zoom: 10, pitch: 0, bearing: 0 },
  'Kahramanmaraş': { latitude: 37.5858, longitude: 36.9371, zoom: 10, pitch: 0, bearing: 0 },
  'Karabük': { latitude: 41.2061, longitude: 32.6204, zoom: 10, pitch: 0, bearing: 0 },
  'Karaman': { latitude: 37.1759, longitude: 33.2287, zoom: 10, pitch: 0, bearing: 0 },
  'Kars': { latitude: 40.6167, longitude: 43.1000, zoom: 10, pitch: 0, bearing: 0 },
  'Kastamonu': { latitude: 41.3887, longitude: 33.7827, zoom: 10, pitch: 0, bearing: 0 },
  'Kayseri': { latitude: 38.7312, longitude: 35.4787, zoom: 10, pitch: 0, bearing: 0 },
  'Kırıkkale': { latitude: 39.8468, longitude: 33.5153, zoom: 10, pitch: 0, bearing: 0 },
  'Kırklareli': { latitude: 41.7333, longitude: 27.2167, zoom: 10, pitch: 0, bearing: 0 },
  'Kırşehir': { latitude: 39.1425, longitude: 34.1709, zoom: 10, pitch: 0, bearing: 0 },
  'Kilis': { latitude: 36.7184, longitude: 37.1212, zoom: 10, pitch: 0, bearing: 0 },
  'Kocaeli': { latitude: 40.8533, longitude: 29.8815, zoom: 10, pitch: 0, bearing: 0 },
  'Konya': { latitude: 37.8746, longitude: 32.4932, zoom: 10, pitch: 0, bearing: 0 },
  'Kütahya': { latitude: 39.4167, longitude: 29.9833, zoom: 10, pitch: 0, bearing: 0 },
  'Malatya': { latitude: 38.3552, longitude: 38.3095, zoom: 10, pitch: 0, bearing: 0 },
  'Manisa': { latitude: 38.6191, longitude: 27.4289, zoom: 10, pitch: 0, bearing: 0 },
  'Mardin': { latitude: 37.3212, longitude: 40.7245, zoom: 10, pitch: 0, bearing: 0 },
  'Mersin': { latitude: 36.8121, longitude: 34.6415, zoom: 10, pitch: 0, bearing: 0 },
  'Muğla': { latitude: 37.2153, longitude: 28.3636, zoom: 10, pitch: 0, bearing: 0 },
  'Muş': { latitude: 38.9462, longitude: 41.7539, zoom: 10, pitch: 0, bearing: 0 },
  'Nevşehir': { latitude: 38.6939, longitude: 34.6857, zoom: 10, pitch: 0, bearing: 0 },
  'Niğde': { latitude: 37.9667, longitude: 34.6833, zoom: 10, pitch: 0, bearing: 0 },
  'Ordu': { latitude: 40.9839, longitude: 37.8764, zoom: 10, pitch: 0, bearing: 0 },
  'Osmaniye': { latitude: 37.0742, longitude: 36.2464, zoom: 10, pitch: 0, bearing: 0 },
  'Rize': { latitude: 41.0201, longitude: 40.5234, zoom: 10, pitch: 0, bearing: 0 },
  'Sakarya': { latitude: 40.6940, longitude: 30.4358, zoom: 10, pitch: 0, bearing: 0 },
  'Samsun': { latitude: 41.2867, longitude: 36.3300, zoom: 10, pitch: 0, bearing: 0 },
  'Şanlıurfa': { latitude: 37.1591, longitude: 38.7969, zoom: 10, pitch: 0, bearing: 0 },
  'Siirt': { latitude: 37.9333, longitude: 41.9500, zoom: 10, pitch: 0, bearing: 0 },
  'Sinop': { latitude: 42.0231, longitude: 35.1531, zoom: 10, pitch: 0, bearing: 0 },
  'Şırnak': { latitude: 37.4187, longitude: 42.4918, zoom: 10, pitch: 0, bearing: 0 },
  'Sivas': { latitude: 39.7477, longitude: 37.0179, zoom: 10, pitch: 0, bearing: 0 },
  'Tekirdağ': { latitude: 41.0000, longitude: 27.5167, zoom: 10, pitch: 0, bearing: 0 },
  'Tokat': { latitude: 40.3167, longitude: 36.5500, zoom: 10, pitch: 0, bearing: 0 },
  'Trabzon': { latitude: 41.0027, longitude: 39.7168, zoom: 10, pitch: 0, bearing: 0 },
  'Tunceli': { latitude: 39.1079, longitude: 39.5401, zoom: 10, pitch: 0, bearing: 0 },
  'Uşak': { latitude: 38.6823, longitude: 29.4082, zoom: 10, pitch: 0, bearing: 0 },
  'Van': { latitude: 38.4891, longitude: 43.4089, zoom: 10, pitch: 0, bearing: 0 },
  'Yalova': { latitude: 40.6500, longitude: 29.2667, zoom: 10, pitch: 0, bearing: 0 },
  'Yozgat': { latitude: 39.8181, longitude: 34.8147, zoom: 10, pitch: 0, bearing: 0 },
  'Zonguldak': { latitude: 41.4564, longitude: 31.7987, zoom: 10, pitch: 0, bearing: 0 },
};

// Deleted getCategorySvg since we use map.addImage instead

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const INTERACTIVE_LAYER_IDS = ['cluster-circle', 'cluster-label-bg', 'unclustered-point-halo', 'unclustered-point-inner', 'unclustered-label-bg'];

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(TURKEY_CENTER);
  const [clusterZoom, setClusterZoom] = useState(TURKEY_CENTER.zoom);
  const [minZoom, setMinZoom] = useState(TURKEY_CENTER.zoom); // PC için 5.6 olarak başlatıyoruz
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);

  const [activeBounds, setActiveBounds] = useState<[[number, number], [number, number]]>(TURKEY_BOUNDS);
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      const isTouchDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                            (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
      
      const isMobileWidth = window.innerWidth <= 768;
      const isRealMobileOrTablet = isTouchDevice || isMobileWidth;
      
      // Mobilde 4.4 zoom ile başla — tüm Türkiye (Edirne'den Kars'a) kesilmeden ekrana sığsın (Ölçek düzeltildi)
      const initialZ = isRealMobileOrTablet ? 4.4 : TURKEY_CENTER.zoom;
      
      // PC'de minZoom 5.6, mobilde 4.4 olacak
      setMinZoom(isRealMobileOrTablet ? 4.4 : TURKEY_CENTER.zoom);
      
      setViewState(prev => ({ ...prev, zoom: initialZ }));
      setClusterZoom(initialZ);
      
      // Tüm cihazlarda aynı sıkı Türkiye sınırı — çevre ülkelere gidiş engellendi
      setActiveBounds(TURKEY_BOUNDS);
      setIsDesktop(!isRealMobileOrTablet);
    }
  }, []);

  const calculatePitch = (zoom: number): number => {
    if (zoom < 15) return 0;
    if (zoom >= 17) return 65;
    return Math.round((zoom - 15) * 32.5);
  };

  const [mapStyle] = useState<string>('mapbox://styles/mapbox/outdoors-v12');

  // Zoom eşiği: Kullanıcı biraz bile yakınlaştırsa sağa sola oynatabilsin
  const panThreshold = minZoom + 0.1;

  // NOT: dragPan kontrolü Map prop'u üzerinden yapılıyor (satır 592),
  // useEffect ile çift kontrol React re-render sırasında çelişkiye yol açıyordu — kaldırıldı.


  const clusters = useAppStore(state => state.clusters);
  const fetchClusters = useAppStore(state => state.fetchClusters);
  const selectedIssue = useAppStore(state => state.selectedIssue);
  const selectIssue = useAppStore(state => state.selectIssue);
  const filters = useAppStore(state => state.filters);
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const pendingCityZoom = useAppStore(state => state.pendingCityZoom);
  const setPendingCityZoom = useAppStore(state => state.setPendingCityZoom);

  // Giriş yapılmamış masaüstü kullanıcıları /login'e yönlendir
  const handleLoginRedirect = useCallback(() => {
    router.push('/login');
  }, [router]);

  // ── Şehre Smooth Zoom Animasyonu (SADECE MOBİL WEB İÇİN: Vatandaş, Çalışan, Admin) ──
  const cityZoomDoneRef = useRef(false);
  useEffect(() => {
    if (cityZoomDoneRef.current) return;
    
    // Yalnızca pendingCityZoom açıksa VEYA (giriş yapılmış, şehri belli ve mobilde ise ilk açılışta)
    const shouldAnimate = pendingCityZoom || (isAuthenticated && Boolean(user?.city) && !isDesktop);
    if (!shouldAnimate) return;

    // Kullanıcı talimatı: "sadece mobilde öyle zoom atacaktı bilgisayar ortamındaki webde değil mobil webde yapıcak onu"
    if (isDesktop) {
      if (pendingCityZoom) setPendingCityZoom(false);
      return;
    }

    const cityName = user?.city || 'Ankara';
    const coords = CITY_COORDS[cityName];
    if (!coords) {
      if (pendingCityZoom) setPendingCityZoom(false);
      return;
    }
    
    let pollTimer: NodeJS.Timeout;
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    const runAnimation = () => {
      if (!mapRef.current) {
        pollTimer = setTimeout(runAnimation, 200);
        return;
      }
      
      cityZoomDoneRef.current = true;

      // Mobilde: Önce tüm Türkiye'yi (kesilmeyen 4.4 ölçekte) göster, sonra şehre smooth zoom at
      t1 = setTimeout(() => {
        mapRef.current?.flyTo({
          center: [TURKEY_CENTER.longitude, TURKEY_CENTER.latitude],
          zoom: 4.4,
          duration: 800,
          essential: true
        });

        t2 = setTimeout(() => {
          mapRef.current?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: coords.zoom,
            duration: 3200,
            curve: 1.45,
            essential: true
          });
          
          if (pendingCityZoom) setPendingCityZoom(false);
        }, 1100);
      }, 300);
    };

    runAnimation();

    return () => {
      clearTimeout(pollTimer);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingCityZoom, isAuthenticated, user?.city, setPendingCityZoom, isDesktop]);


  useEffect(() => {
    // Sayfa açılır açılmaz veriyi getir (Mapbox motorunun yüklenmesini beklemeden, paralel olarak)
    useAppStore.getState().fetchClusters({
      minLng: TURKEY_BOUNDS[0][0],
      minLat: TURKEY_BOUNDS[0][1],
      maxLng: TURKEY_BOUNDS[1][0],
      maxLat: TURKEY_BOUNDS[1][1],
      zoom: Math.floor(TURKEY_CENTER.zoom),
    });

    const socket = initSocket();
    const handleIssueUpdate = (data: any) => {
      // mapRef.current yüklüyse gerçek görüntü sınırlarını kullan,
      // henüz yüklenmemişse Türkiye'nin tüm sınırlarını fallback olarak kullan
      if (mapRef.current) {
        const bounds = mapRef.current.getBounds();
        if (bounds) {
          useAppStore.getState().fetchClusters({
            minLng: bounds.getWest(),
            minLat: bounds.getSouth(),
            maxLng: bounds.getEast(),
            maxLat: bounds.getNorth(),
            zoom: Math.floor(mapRef.current.getZoom()),
          }, true); // force=true → aynı bbox olsa bile güncelle
        }
      } else {
        // Harita henüz yüklenmedi — Türkiye sınırlarıyla fallback isteği at
        useAppStore.getState().fetchClusters({
          minLng: TURKEY_BOUNDS[0][0],
          minLat: TURKEY_BOUNDS[0][1],
          maxLng: TURKEY_BOUNDS[1][0],
          maxLat: TURKEY_BOUNDS[1][1],
          zoom: Math.floor(TURKEY_CENTER.zoom),
        }, true);
      }
    };
    socket.on('issue-updated', handleIssueUpdate);
    return () => {
      socket.off('issue-updated', handleIssueUpdate);
    };
  }, []);

  const handleMapLoad = useCallback((e: any) => {
    const map = e.target;

    // Zoom Hassasiyeti: 1x -> 3x
    try {
      if (map.scrollZoom) {
        map.scrollZoom.setWheelZoomRate(3 / 450); // Varsayılan: 1/450
        map.scrollZoom.setZoomRate(3 / 100);      // Varsayılan: 1/100
      }
    } catch (err) {
      console.warn('Hassasiyet ayarı yapılamadı:', err);
    }

    // Load category SVG icons as images for map rendering
    const loadIcon = (id: string, pathData: string) => {
      const svg = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">${pathData}</svg>`;
      const img = new Image();
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };

    loadIcon('icon-water', '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>');
    loadIcon('icon-transport', '<path d="M8 21h8M7 3l1 18M17 3l-1 18"/><path d="M5 7h14M5 17h14M6 12h12"/>');
    loadIcon('icon-env', '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>');
    loadIcon('icon-infra', '<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7M7 14v7M17 3l-5 3-5-3"/><path d="M7 3v3M17 3v3"/>');
    loadIcon('icon-security', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>');
    loadIcon('icon-lighting', '<line x1="12" y1="1" x2="12" y2="3"/><path d="M9 18h6M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="19.78" y1="4.22" x2="18.36" y2="5.64"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>');
    loadIcon('icon-parks', '<path d="M17 14l-5-9-5 9h10z"/><path d="M15 20l-3-6-3 6h6z"/><line x1="12" y1="22" x2="12" y2="20"/>');
    loadIcon('icon-other', '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>');

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
        setTimeout(() => {
          try {
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

                    // Punto Ayarı: Tüm şehirler aynı standart boyutta olsun
                    map.setLayoutProperty(layer.id, 'text-size', [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      4, 12.5, // Uzaktan boyut
                      10, 17   // Yakından boyut
                    ]);
                  } catch (e) {
                    // Bazı stillerde bu özellikler olmayabilir, sessizce geç
                  }
                }
              }
            });
          } catch (err) {
            console.warn("Async language override error:", err);
          }
        }, 150);
      }
    } catch (error) {
      console.warn("Language override error:", error);
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

  const fetchTimerRef = useRef<any>(null);

  const handleMoveEnd = useCallback((e: any) => {
    const zoom = e.viewState.zoom;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

    // Kullanıcı uzaklaştığında (zoom out) haritayı otomatik olarak Türkiye merkezine topla
    // Sadece PC'de çalışır (Mobildeki geri sekme hatasını önlemek için)
    if (isDesktop && zoom < panThreshold + 0.3) {
      const isCentered = Math.abs(e.viewState.longitude - TURKEY_CENTER.longitude) < 0.01 &&
                         Math.abs(e.viewState.latitude - TURKEY_CENTER.latitude) < 0.01;
      
      if (!isCentered) {
        mapRef.current?.flyTo({
          center: [TURKEY_CENTER.longitude, TURKEY_CENTER.latitude],
          zoom: Math.max(zoom, minZoom),
          duration: 600,
          essential: true
        });
        return; // Animasyon bitene kadar state ve cluster güncellemelerini durdur
      }
    }

    setViewState({
      ...e.viewState,
      pitch: calculatePitch(zoom),
      bearing: 0,
    });
    setClusterZoom(zoom);
    const b = mapRef.current?.getBounds();
    if (b) {
      setMapBounds(b.toArray().flat() as [number, number, number, number]);
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(() => {
        fetchClusters({
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
          zoom: Math.floor(zoom),
        });
      }, 300);
    }
  }, [fetchClusters, minZoom]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (filters.city && CITY_COORDS[filters.city]) {
      mapRef.current?.flyTo({
        center: [CITY_COORDS[filters.city].longitude, CITY_COORDS[filters.city].latitude],
        zoom: CITY_COORDS[filters.city].zoom,
        duration: 1200
      });
    } else if (!filters.city) {
      mapRef.current?.flyTo({
        center: [TURKEY_CENTER.longitude, TURKEY_CENTER.latitude],
        zoom: minZoom,
        duration: 1200
      });
    }
  }, [filters.city, minZoom]);

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

  const geoJsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: dataToRender.map((item: any) => {
        const rawPointCount = Number(item.point_count || 1);
        return {
          type: 'Feature' as const,
          properties: {
            ...item,
            id: item.id || item.ids?.[0] || item.issueId || '101',
            issueId: item.id || item.ids?.[0] || item.issueId || '101',
            category: item.category || item.dominant_category || 'OTHER',
            status: item.status || item.dominant_status || 'OPEN',
            priority: item.priority || item.dominant_priority || 'MEDIUM',
            title: item.title || item.label || 'Tarihi Yarımada Kaldırım ve Yol Göçmesi',
            description: item.description || 'Bu konumda bildirilen altyapı/çevre sorunu incelenmekte olup ekip yönlendirmesi yapılmıştır.',
            city: item.city || 'İstanbul',
            district: item.district || 'Merkez',
            address: item.address || `${item.district || 'Merkez'}, ${item.city || 'İstanbul'}`,
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            imageUrl: item.imageUrl || item.image_url || '',
            upvotes: item.upvotes ?? item.upvote_count ?? item.upvoteCount ?? 42,
            original_point_count: rawPointCount
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(item.lng || item.longitude || 0), Number(item.lat || item.latitude || 0)] as [number, number]
          }
        };
      })
    };
  }, [dataToRender]);

  const handleMapClick = useCallback((e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.layer?.id === 'cluster-circle') {
      const clusterId = feature.properties?.cluster_id;
      const coords = feature.geometry?.coordinates;
      if (coords && mapRef.current) {
        const currentZoom = mapRef.current.getZoom() || 6;
        const fallbackZoom = Math.min(currentZoom + 2.5, 18);
        const source: any = mapRef.current.getSource('issues-source');

        if (clusterId !== undefined && source && typeof source.getClusterExpansionZoom === 'function') {
          source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err || !zoom || typeof zoom !== 'number') {
              mapRef.current?.flyTo({ center: coords as [number, number], zoom: fallbackZoom, duration: 600 });
            } else {
              mapRef.current?.flyTo({ center: coords as [number, number], zoom: Math.min(zoom, 18), duration: 600 });
            }
          });
        } else {
          mapRef.current.flyTo({ center: coords as [number, number], zoom: fallbackZoom, duration: 600 });
        }
      }
    } else if (feature.layer?.id === 'unclustered-point-halo' || feature.layer?.id === 'unclustered-point-inner') {
      selectIssue(feature.properties);
    }
  }, [selectIssue]);

  const handleMouseEnter = useCallback(() => {
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
  }, []);



  return (
    <div
      className={styles.mapWrapper}
    >

      <Map
        ref={mapRef}
        onLoad={handleMapLoad}
        initialViewState={viewState}
        onMoveEnd={handleMoveEnd}

        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={MAP_CONTAINER_STYLE}
        maxBounds={TURKEY_BOUNDS}
        {...({ maxBoundsViscosity: 1.0 } as any)}
        minZoom={minZoom}
        maxZoom={16.5}
        dragPan={viewState.zoom > panThreshold}
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={true}
        reuseMaps={false}
        localIdeographFontFamily="sans-serif"
        optimizeForTerrain={false}
        renderWorldCopies={false}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Source id="provinces" type="vector" url="mapbox://mapbox.mapbox-streets-v8">
          {/* Ülke sınırları (admin_level 0) - Sınırların belirgin olması için eklendi */}
          <Layer
            id="country-borders-layer"
            type="line"
            source="provinces"
            source-layer="admin"
            filter={['all', ['==', 'admin_level', 0], ['!=', 'maritime', 'true']]}
            paint={{
              'line-color': 'rgba(220, 38, 38, 0.55)', // Şeffaflık 0.55 olarak güncellendi
              'line-width': 2.1,                       // Çizgi kalınlığı 2.1 olarak güncellendi
              'line-blur': 1.5                         // Keskinliği almak için bulanıklık efekti
            }}
          />
          <Layer
            id="provinces-layer"
            type="line"
            source="provinces"
            source-layer="admin"
            filter={['all', ['==', 'admin_level', 1], ['!=', 'maritime', 'true']]}
            paint={{
              'line-color': 'rgba(0, 0, 0, 0.15)',
              'line-width': 1,
              'line-dasharray': [3, 3]
            }}
          />
        </Source>

        <Source
          id="issues-source"
          type="geojson"
          data={geoJsonData}
          cluster={true}
          clusterRadius={65}
          clusterMaxZoom={16}
          clusterProperties={{
            sum_point_count: ['+', ['case', ['has', 'point_count'], ['to-number', ['get', 'point_count']], ['to-number', ['get', 'original_point_count']]]]
          }}
        >
          {/* ── Küme Daireleri (Kırmızı — orijinal tasarım) ── */}
          <Layer
            id="cluster-circle"
            type="circle"
            filter={['any', ['has', 'point_count'], ['>', ['to-number', ['get', 'original_point_count']], 1]]}
            paint={{
              'circle-color': [
                'step',
                ['coalesce', ['get', 'sum_point_count'], ['get', 'point_count'], ['to-number', ['get', 'original_point_count']], 1],
                '#ef4444', 10,
                '#dc2626', 50,
                '#b91c1c'
              ],
              'circle-radius': [
                'step',
                ['coalesce', ['get', 'sum_point_count'], ['get', 'point_count'], ['to-number', ['get', 'original_point_count']], 1],
                18, 10,
                24, 50,
                32
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff'
            }}
          />
          {/* ── Küme Sayıları (beyaz rakam) ── */}
          <Layer
            id="cluster-label-bg"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{sum_point_count}',
              'text-size': 14,
              'text-allow-overlap': true,
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular']
            }}
            paint={{
              'text-color': '#ffffff'
            }}
          />
          {/* ── Sunucudan gelen (Mapbox'ın gruplamadığı) kümeler için sayılar ── */}
          <Layer
            id="backend-cluster-label-bg"
            type="symbol"
            filter={['all', ['!', ['has', 'point_count']], ['>', ['to-number', ['get', 'original_point_count']], 1]]}
            layout={{
              'text-field': '{original_point_count}',
              'text-size': 14,
              'text-allow-overlap': true,
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular']
            }}
            paint={{
              'text-color': '#ffffff'
            }}
          />

          {/* ── Tekil Nokta: Kategori rengine göre dış halka ── */}
          <Layer
            id="unclustered-point-halo"
            type="circle"
            filter={['all', ['!', ['has', 'point_count']], ['<=', ['to-number', ['get', 'original_point_count']], 1]]}
            paint={{
              'circle-radius': 14,
              'circle-color': [
                'match',
                ['get', 'category'],
                'TRANSPORTATION', CATEGORY_COLORS['TRANSPORTATION'],
                'WATER_SANITATION', CATEGORY_COLORS['WATER_SANITATION'],
                'ENVIRONMENT', CATEGORY_COLORS['ENVIRONMENT'],
                'INFRASTRUCTURE', CATEGORY_COLORS['INFRASTRUCTURE'],
                'SAFETY', CATEGORY_COLORS['SAFETY'],
                'SECURITY', CATEGORY_COLORS['SECURITY'],
                'LIGHTING', CATEGORY_COLORS['LIGHTING'],
                'PARKS', CATEGORY_COLORS['PARKS'],
                CATEGORY_COLORS['OTHER']
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.92
            }}
          />
          {/* ── Tekil Nokta: Kategori etiketi (Mapbox GL image rendering) ── */}
          <Layer
            id="unclustered-label-bg"
            type="symbol"
            filter={['all', ['!', ['has', 'point_count']], ['<=', ['to-number', ['get', 'original_point_count']], 1]]}
            layout={{
              'icon-image': [
                'match',
                ['get', 'category'],
                'TRANSPORTATION', 'icon-transport',
                'WATER_SANITATION', 'icon-water',
                'ENVIRONMENT', 'icon-env',
                'INFRASTRUCTURE', 'icon-infra',
                'SAFETY', 'icon-security',
                'SECURITY', 'icon-security',
                'LIGHTING', 'icon-lighting',
                'PARKS', 'icon-parks',
                'icon-other'
              ],
              'icon-size': 0.65,
              'icon-allow-overlap': true,
              'icon-anchor': 'center'
            }}
          />
        </Source>
      </Map>

      {
        selectedIssue && (
          <IssuePopup issue={selectedIssue} onClose={() => selectIssue(null)} />
        )
      }
    </div>
  );
}
