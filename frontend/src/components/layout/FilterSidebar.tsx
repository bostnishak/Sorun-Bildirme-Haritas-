'use client';

import { useAppStore } from '@/store/useAppStore';
import {
  IconFilter, CATEGORY_ICON_MAP, CATEGORY_COLORS, CATEGORY_LABELS,
  IconAlertCircle, IconClock, IconCheckCircle,
} from '@/components/ui/Icon';
import styles from './FilterSidebar.module.css';

const TR_CITIES = [
  'Adana', 'Ankara', 'Antalya', 'Bursa', 'Diyarbakır',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya',
  'Mersin', 'Rize', 'Sakarya', 'Samsun', 'Trabzon', 'Van',
];

// Öne Çıkan Acil / Popüler Sorun Türleri (6 adet) - Boşluğu dengelemek ve hızlı seçim için
const QUICK_CATEGORIES = [
  'TRAFFIC_ACCIDENT',
  'PUBLIC_TRANSIT',
  'STRAY_ANIMALS',
  'URBAN_HAZARD',
  'WATER_SANITATION',
  'TRANSPORTATION',
];

// Diğer Sorun Türleri (5 adet) - Alt kısımda orantılı görünüm için
const OTHER_CATEGORIES = [
  'ENVIRONMENT',
  'INFRASTRUCTURE',
  'SECURITY',
  'LIGHTING',
  'PARKS',
];

export function FilterSidebar() {
  const { filters, setFilter, clearFilters } = useAppStore();

  const handleCategoryClick = (key: string) => {
    if (filters.category === key) {
      setFilter('category', undefined);
    } else {
      setFilter('category', key);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <IconFilter size={15} />
        <h2 className={styles.title}>Filtreler</h2>
      </div>

      <div className={styles.filters}>
        {/* Kategori */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>Sorun Türü</label>
          <select
            className={styles.select}
            value={filters.category || ''}
            onChange={e => setFilter('category', e.target.value || undefined)}
          >
            <option value="">Tümü</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Durum */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>Durum</label>
          <select
            className={styles.select}
            value={filters.status || ''}
            onChange={e => setFilter('status', e.target.value || undefined)}
          >
            <option value="">Tümü</option>
            <option value="OPEN">Açık</option>
            <option value="IN_REVIEW">İnceleniyor</option>
            <option value="RESOLVED">Çözüldü</option>
            <option value="REJECTED">Reddedildi</option>
          </select>
        </div>

        {/* Şehir */}
        <div className={styles.filterGroup}>
          <label className={styles.label}>Şehir</label>
          <select
            className={styles.select}
            value={filters.city || ''}
            onChange={e => setFilter('city', e.target.value || undefined)}
          >
            <option value="">Tümü</option>
            {TR_CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Temizle */}
        <button className={styles.clearBtn} onClick={clearFilters}>
          Filtreleri Temizle
        </button>
      </div>

      {/* Hızlı Kategori Seçimi (Öne Çıkan Sorunlar - Orta Boşluğu Dengeleme) */}
      <div className={styles.quickSection}>
        <p className={styles.quickTitle}>Öne Çıkan İhbar Türleri</p>
        <div className={styles.quickGrid}>
          {QUICK_CATEGORIES.map(key => {
            const CatIcon = CATEGORY_ICON_MAP[key];
            const color = CATEGORY_COLORS[key];
            const label = CATEGORY_LABELS[key];
            const isActive = filters.category === key;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
                style={{ '--cat-color': color, '--cat-bg': `${color}14` } as any}
                onClick={() => handleCategoryClick(key)}
              >
                <div className={styles.legendIconWrap} style={{ color: isActive ? '#fff' : color, background: isActive ? color : `${color}18` }}>
                  {CatIcon && <CatIcon size={13} />}
                </div>
                <span>{label}</span>
                {isActive && <span className={styles.activeIndicator} style={{ background: color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Harita Göstergesi ve Diğer Kategoriler */}
      <div className={styles.legend}>
        <p className={styles.legendTitle}>Renk Göstergesi</p>
        <div className={styles.legendItems}>
          {[
            { color: 'var(--color-open)',      Icon: IconAlertCircle, label: 'Açık' },
            { color: 'var(--color-in-review)', Icon: IconClock,        label: 'İnceleniyor' },
            { color: 'var(--color-resolved)',  Icon: IconCheckCircle,  label: 'Çözüldü' },
          ].map(item => (
            <div key={item.label} className={styles.legendItem}>
              <div className={styles.legendIconWrap} style={{ color: item.color, background: `${item.color}18` }}>
                <item.Icon size={13} />
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <p className={styles.legendTitle} style={{ marginTop: 14 }}>Diğer Sorun Türleri</p>
        <div className={styles.quickGrid}>
          {OTHER_CATEGORIES.map(key => {
            const CatIcon = CATEGORY_ICON_MAP[key];
            const color = CATEGORY_COLORS[key];
            const label = CATEGORY_LABELS[key];
            const isActive = filters.category === key;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
                style={{ '--cat-color': color, '--cat-bg': `${color}14` } as any}
                onClick={() => handleCategoryClick(key)}
              >
                <div className={styles.legendIconWrap} style={{ color: isActive ? '#fff' : color, background: isActive ? color : `${color}18` }}>
                  {CatIcon && <CatIcon size={13} />}
                </div>
                <span>{label}</span>
                {isActive && <span className={styles.activeIndicator} style={{ background: color }} />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
