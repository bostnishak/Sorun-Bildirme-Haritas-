'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import styles from './ReportIssueForm.module.css';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICON_MAP,
  IconLocationDot, IconX,
} from '@/components/ui/Icon';

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value, label, color: CATEGORY_COLORS[value],
}));

const TR_CITIES_DISTRICTS: Record<string, string[]> = {
  'Ankara': ['Çankaya', 'Keçiören', 'Mamak', 'Yenimahalle', 'Altındağ', 'Etimesgut', 'Sincan', 'Gölbaşı', 'Pursaklar'],
  'İstanbul': ['Beşiktaş', 'Şişli', 'Beyoğlu', 'Kadıköy', 'Üsküdar', 'Ataşehir', 'Maltepe', 'Fatih', 'Bakırköy', 'Zeytinburnu', 'Eyüpsultan', 'Sarıyer', 'Beykoz', 'Pendik', 'Tuzla', 'Avcılar', 'Küçükçekmece', 'Beylikdüzü', 'Büyükçekmece', 'Başakşehir', 'Sancaktepe', 'Ümraniye', 'Esenler'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Karabağlar', 'Balçova', 'Narlıdere', 'Urla', 'Çeşme', 'Bayraklı', 'Çiğli'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'İnegöl', 'Gemlik'],
  'Antalya': ['Konyaaltı', 'Muratpaşa', 'Kepez', 'Alanya', 'Manavgat', 'Kemer'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan'],
  'Mersin': ['Yenişehir', 'Mezitli', 'Tarsus', 'Toroslar', 'Akdeniz'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip'],
  'Samsun': ['Atakum', 'İlkadım', 'Canik', 'Bafra'],
  'Diyarbakır': ['Kayapınar', 'Bağlar', 'Yenişehir', 'Sur'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Yomra'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas'],
  'Eskişehir': ['Odunpazarı', 'Tepebaşı'],
  'Kocaeli': ['İzmit', 'Gebze', 'Gölcük', 'Darıca', 'Kartepe'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Erenler', 'Sapanca'],
  'Kahramanmaraş': ['Dulkadiroğlu', 'Onikişubat', 'Elbistan'],
  'Malatya': ['Battalgazi', 'Yeşilyurt'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit'],
  'Rize': ['Merkez', 'Çayeli', 'Ardeşen'],
};

interface FormData {
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  address: string;
  image?: string;
}

export function ReportIssueForm({ onClose }: { onClose: () => void }) {
  const { isAuthenticated } = useAppStore();
  const [formData, setFormData] = useState<FormData>({
    title: '', description: '', category: '', city: 'Ankara', district: 'Çankaya', address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const districts = formData.city ? (TR_CITIES_DISTRICTS[formData.city] || []) : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      const firstDistrict = TR_CITIES_DISTRICTS[value]?.[0] || '';
      setFormData(prev => ({ ...prev, city: value, district: firstDistrict }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: '' }));
      
      // Attempt to get location automatically if not yet set
      if (!coords) getLocation();
    }
  };

  const getLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        toast.success('Konumunuz alındı ✓');
      },
      () => {
        setLocationLoading(false);
        toast.error('Konum alınamadı. Lütfen tarayıcı izinlerini kontrol edin.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // XSS ve Zararlı Script Koruması (Sanitization Helper)
  const sanitizeInput = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>?/gm, '') // HTML etiketlerini temizle
      .trim();
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData & { image?: string }> = {};
    const title = formData.title.trim();
    const desc = formData.description.trim();

    if (!title || title.length < 5) {
      newErrors.title = 'Başlık en az 5 karakter olmalı.';
    } else if (title.length > 150) {
      newErrors.title = 'Başlık en fazla 150 karakter olabilir.';
    } else if (/(<script|javascript:|onload=|onerror=)/i.test(title)) {
      newErrors.title = 'Güvenlik ihlali: Geçersiz karakterler tespit edildi.';
    }

    if (!desc || desc.length < 20) {
      newErrors.description = 'Açıklama en az 20 karakter olmalı.';
    } else if (desc.length > 1000) {
      newErrors.description = 'Açıklama en fazla 1000 karakter olabilir.';
    } else if (/(<script|javascript:|onload=|onerror=)/i.test(desc)) {
      newErrors.description = 'Güvenlik ihlali: Geçersiz karakterler tespit edildi.';
    }

    if (!formData.category) newErrors.category = 'Sorun türü seçiniz.';
    if (!formData.city) newErrors.city = 'Şehir seçiniz.';
    if (!formData.district) newErrors.district = 'İlçe seçiniz.';
    if (!imageFile) newErrors.image = 'Anlık doğrulama için fotoğraf yüklemek zorunludur.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Sorun bildirmek için giriş yapmalısınız.');
      return;
    }
    if (!validate()) return;

    // Spam / Rate-Limit Koruması (30 Saniye Bekleme Süresi)
    const lastSubmit = localStorage.getItem('last_issue_submit_time');
    if (lastSubmit && Date.now() - Number(lastSubmit) < 30000) {
      const remainingSec = Math.ceil((30000 - (Date.now() - Number(lastSubmit))) / 1000);
      toast.error(`Spam Koruması: Lütfen yeni bir ihbar oluşturmadan önce ${remainingSec} saniye bekleyin.`);
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Sorun bildiriminiz güvenli bir şekilde işleniyor...');

    try {
      const { api } = await import('@/lib/api');
      const data = new FormData();
      data.append('title', sanitizeInput(formData.title));
      data.append('description', sanitizeInput(formData.description));
      data.append('category', formData.category);
      if (coords) {
        data.append('latitude', String(coords.lat));
        data.append('longitude', String(coords.lng));
      }
      data.append('city', formData.city);
      data.append('district', formData.district);
      if (formData.address) data.append('address', sanitizeInput(formData.address));
      if (imageFile) data.append('image', imageFile);

      await api.post('/issues', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      localStorage.setItem('last_issue_submit_time', String(Date.now()));
      toast.success('Sorun bildirimi Yapay Zeka incelemesine alındı! 🎉', { id: toastId });
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Bildirim gönderilirken bir hata oluştu.';
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === formData.category);
  const SelectedCatIcon = formData.category ? CATEGORY_ICON_MAP[formData.category] : null;
  const selectedColor = formData.category ? CATEGORY_COLORS[formData.category] : null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-elevated animate-fade-in`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleRow}>
            <div
              className={styles.modalTitleIcon}
              style={selectedColor ? { background: `${selectedColor}15`, color: selectedColor } : {}}
            >
              {SelectedCatIcon
                ? <SelectedCatIcon size={18} />
                : <span style={{ opacity: 0 }}><IconX size={18} /></span>}
            </div>
            <h2 className={styles.modalTitle}>Sorun Bildir</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
            <IconX size={15} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="issue-title">Başlık</label>
            <input
              id="issue-title"
              name="title"
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="Bozuk yol – asfalt hasarlı"
              value={formData.title}
              onChange={handleChange}
              maxLength={200}
            />
            {errors.title && <p className={styles.error}>{errors.title}</p>}
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label htmlFor="issue-category">Sorun Türü</label>
            <div className={styles.categorySelectWrap}>
              {selectedCategory && (
                <span className={styles.categoryDot} style={{ color: selectedCategory.color }}>
                  {selectedCategory.label.split(' ')[0]}
                </span>
              )}
              <select
                id="issue-category"
                name="category"
                className={`input ${styles.categorySelect} ${errors.category ? 'input-error' : ''}`}
                value={formData.category}
                onChange={handleChange}
                style={selectedCategory ? { paddingLeft: '36px' } : {}}
              >
                <option value="">Kategori seçin...</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {errors.category && <p className={styles.error}>{errors.category}</p>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="issue-desc">Açıklama</label>
            <textarea
              id="issue-desc"
              name="description"
              className={`input ${styles.textarea} ${errors.description ? 'input-error' : ''}`}
              placeholder="Uzun süredir bu bölgede yol bozuk durumda. Araçlar zorlanıyor, kazaya sebebiyet verebilir."
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
              rows={4}
            />
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
            {errors.description && <p className={styles.error}>{errors.description}</p>}
          </div>

          {/* Image Upload */}
          <div className={styles.field}>
            <label>Fotoğraf (Zorunlu)</label>
            <div className={`${styles.imageUploadBox} ${errors.image ? 'input-error' : ''}`}>
              {imagePreview ? (
                <div className={styles.imagePreviewWrap}>
                  <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                  <button type="button" className={styles.removeImageBtn} onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    <IconX size={14} />
                  </button>
                </div>
              ) : (
                <label className={styles.uploadLabel}>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className={styles.fileInput} />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Anlık fotoğraf çekin veya seçin</span>
                </label>
              )}
            </div>
            {errors.image && <p className={styles.error}>{errors.image}</p>}
          </div>

          {/* Address with GPS */}
          <div className={styles.field}>
            <label htmlFor="issue-address">Adres</label>
            <div className={styles.addressRow}>
              <input
                id="issue-address"
                name="address"
                className="input"
                placeholder="Atatürk Cd. No:45, 06570 Çankaya/Ankara"
                value={formData.address}
                onChange={handleChange}
              />
              <button
                type="button"
                id="btn-get-location"
                className={styles.locationBtn}
                onClick={getLocation}
                disabled={locationLoading}
                title="GPS konumumu al"
              >
                {locationLoading ? (
                  <span className={styles.locationSpinner} />
                ) : coords ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                )}
              </button>
            </div>
            {!coords && <p className={styles.hint} style={{ marginTop: '4px', fontSize: '11px', color: '#fbbf24' }}>
              Yapay Zeka onayı için GPS konumunuzu almanız önerilir.
            </p>}
          </div>

          {/* City + District */}
          <div className={styles.locationRow}>
            <div className={styles.field} style={{ flex: 1 }}>
              <label htmlFor="issue-city">İl</label>
              <select
                id="issue-city"
                name="city"
                className={`input ${errors.city ? 'input-error' : ''}`}
                value={formData.city}
                onChange={handleChange}
              >
                <option value="">Şehir seçin...</option>
                {Object.keys(TR_CITIES_DISTRICTS).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label htmlFor="issue-district">İlçe</label>
              <select
                id="issue-district"
                name="district"
                className={`input ${errors.district ? 'input-error' : ''}`}
                value={formData.district}
                onChange={handleChange}
              >
                <option value="">İlçe seçin...</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hint */}
          <p className={styles.hint}>
            Yeni bir sorun ekliyorsanız <strong>Kaydet</strong>'e, düzenleme yapıyorsanız <strong>Güncelle</strong>'ye tıklayın.
          </p>

          {/* Submit */}
          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              İptal
            </button>
            <button
              type="submit"
              id="btn-submit-issue"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              className={styles.updateBtn}
              disabled={isSubmitting}
            >
              Güncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
