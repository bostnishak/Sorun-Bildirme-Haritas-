'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  IconFilter, IconMenu, CATEGORY_ICON_MAP, CATEGORY_COLORS, CATEGORY_LABELS,
  IconAlertCircle, IconClock, IconCheckCircle,
} from '@/components/ui/Icon';
import styles from './FilterSidebar.module.css';

const TR_CITIES = [
  'Adana', 'Ankara', 'Antalya', 'Bursa', 'Diyarbakır',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya',
  'Mersin', 'Rize', 'Sakarya', 'Samsun', 'Trabzon', 'Van',
];

// Temel ve Genel Sorun Türleri (7 ana kategori - spesifik alt detaylar yerine genel filtreleme)
const MAIN_CATEGORIES = [
  'TRANSPORTATION',    // Yol / Ulaşım
  'WATER_SANITATION',  // Su ve Kanalizasyon
  'ENVIRONMENT',       // Çevre ve Temizlik
  'INFRASTRUCTURE',    // Altyapı
  'SECURITY',          // Güvenlik
  'LIGHTING',          // Aydınlatma
  'PARKS',             // Park ve Yeşil Alan
];

export function FilterSidebar() {
  const { filters, setFilter, clearFilters } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryClick = (key: string) => {
    if (filters.category === key) {
      setFilter('category', undefined);
    } else {
      setFilter('category', key);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}
      
      {/* Mobile Toggle Button */}
      <button 
        className={`${styles.mobileToggle} ${isOpen ? styles.hidden : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Menüyü Aç"
      >
        <IconMenu size={22} />
      </button>

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <IconFilter size={15} />
            <h2 className={styles.title}>Filtreler</h2>
          </div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            &times;
          </button>
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
            {MAIN_CATEGORIES.map(val => (
              <option key={val} value={val}>{CATEGORY_LABELS[val]}</option>
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

      {/* Renk Göstergesi */}
      <div className={styles.legend}>
        <p className={styles.legendTitle}>Durum Göstergesi</p>
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
      </div>

      {/* Birleştirilmiş Temel Sorun Türleri Listesi */}
      <div className={styles.quickSection}>
        <p className={styles.quickTitle}>Sorun Türleri</p>
        <div className={styles.quickGrid}>
          {MAIN_CATEGORIES.map(key => {
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
    </>
  );
}
