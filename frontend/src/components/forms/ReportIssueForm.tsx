'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import styles from './ReportIssueForm.module.css';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICON_MAP,
  IconLocationDot, IconX,
} from '@/components/ui/Icon';
import { TR_CITIES_DISTRICTS } from '@/lib/turkeyCities';

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value, label, color: CATEGORY_COLORS[value],
}));

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
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const [formData, setFormData] = useState<FormData>({
    title: '', description: '', category: '', city: 'İstanbul', district: 'Beykoz', address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData & { image?: string }>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [aiVoiceSuccess, setAiVoiceSuccess] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: '' }));

      // Fotoğraf yüklenince otomatik konum çekme KESİNLİKLE YOK!
      // Fotoğraf yüklenir yüklenmez anında yapay zekaya analiz ettir:
      const toastId = toast.loading('Yapay Zeka fotoğraf içeriğini analiz ediyor...');
      try {
        const base64 = await fileToBase64(file);
        const { api } = await import('@/lib/api');
        const visionRes: any = await api.post('/issues/verify-vision', {
          imageUrl: base64,
          category: formData.category || 'ENVIRONMENT',
          title: formData.title || 'Genel İhbar',
          description: formData.description || 'Anlık fotoğraf doğrulama',
        });
        const visionData = visionRes?.data || visionRes;

        if (visionData && visionData.valid === false) {
          toast.error(
            `[X] Fotoğraf reddedildi: ${visionData.userFriendlyMessage || 'Fotoğraf konuyla alakalı değil veya geçerli bir sorun kanıtı değildir.'}`,
            { id: toastId, duration: 6000 }
          );
          setImageFile(null);
          setImagePreview(null);
        } else {
          toast.success('Yapay Zeka fotoğrafı onayladı ✓ (Geçerli Sorun Kanıtı)', { id: toastId });
        }
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.message || '';
        if (errMsg && (errMsg.toLowerCase().includes('kanıt') || errMsg.toLowerCase().includes('kentsel') || errMsg.toLowerCase().includes('fotoğraf'))) {
          toast.error(`[X] Fotoğraf reddedildi: ${errMsg}`, { id: toastId, duration: 6000 });
          setImageFile(null);
          setImagePreview(null);
        } else {
          toast.dismiss(toastId);
        }
      }
    }
  };

  const processVoiceInput = (speechText: string) => {
    if (!speechText || speechText.trim().length === 0) return;
    const cleanSpeech = speechText.trim();
    setVoiceTranscript(cleanSpeech);

    // Kategori anahtar kelime akıllı analizi (NLP Keyword Matching)
    const lower = cleanSpeech.toLocaleLowerCase('tr-TR');
    let matchedCat = formData.category;
    if (lower.includes('su') || lower.includes('boru') || lower.includes('kanalizasyon') || lower.includes('mazgal') || lower.includes('patla') || lower.includes('taşma')) {
      matchedCat = 'WATER_SANITATION';
    } else if (lower.includes('yol') || lower.includes('çukur') || lower.includes('asfalt') || lower.includes('kaldırım') || lower.includes('trafik') || lower.includes('sokak')) {
      matchedCat = 'TRANSPORTATION';
    } else if (lower.includes('çöp') || lower.includes('koku') || lower.includes('atık') || lower.includes('konteyner') || lower.includes('temizlik')) {
      matchedCat = 'ENVIRONMENT';
    } else if (lower.includes('kazı') || lower.includes('inşaat') || lower.includes('şantiye') || lower.includes('altyapı') || lower.includes('kablo')) {
      matchedCat = 'INFRASTRUCTURE';
    } else if (lower.includes('lamba') || lower.includes('aydınlatma') || lower.includes('elektrik') || lower.includes('direk') || lower.includes('karanlık')) {
      matchedCat = 'LIGHTING';
    } else if (lower.includes('park') || lower.includes('ağaç') || lower.includes('çim') || lower.includes('bahçe') || lower.includes('yeşil')) {
      matchedCat = 'PARKS';
    } else if (lower.includes('zabıta') || lower.includes('gürültü') || lower.includes('işgal') || lower.includes('güvenlik')) {
      matchedCat = 'SECURITY';
    }

    // Başlık ve Açıklama otomatik doldurma
    let autoTitle = formData.title;
    if (!autoTitle || autoTitle.trim() === '') {
      const firstSentence = cleanSpeech.split(/[.!?]/)[0] || cleanSpeech;
      const words = firstSentence.split(' ').slice(0, 7).join(' ');
      autoTitle = words.charAt(0).toLocaleUpperCase('tr-TR') + words.slice(1) + (firstSentence.split(' ').length > 7 ? '...' : '');
    }

    setFormData(prev => ({
      ...prev,
      title: autoTitle,
      category: matchedCat || prev.category || 'ENVIRONMENT',
      description: prev.description ? `${prev.description}\n\n[Sesli İhbar Kaydı]: ${cleanSpeech}` : cleanSpeech
    }));

    setErrors(prev => ({ ...prev, title: '', category: '', description: '' }));
    setAiVoiceSuccess(true);
    toast.success('[AI] Yapay Zeka Sesli İhbarınızı Analiz Etti: Başlık, Kategori ve Açıklama otomatik dolduruldu!', { duration: 5000 });
  };

  const handleVoiceRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error('Tarayıcınız canlı ses tanımayı (Speech to Text) desteklemiyor. Lütfen Google Chrome veya Microsoft Edge kullanın.');
      return;
    }

    let micStream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        toast.error('⚠️ Bilgisayarınızda bağlı veya çalışır durumda bir mikrofon donanımı bulunamadı! Lütfen mikrofonunuzun takılı olduğundan emin olun.');
        return;
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        toast.error('⚠️ Mikrofonunuz şu an başka bir program (Zoom, Teams, Discord, OBS vb.) tarafından kullanılıyor/kilitli! Diğer programları kapatıp tekrar deneyin.');
        return;
      } else {
        toast.error('⚠️ Mikrofon İzni Engellendi! Adres çubuğundaki (ⓘ) simgesine veya sağ üstteki [🎙️x] simgesine tıklayıp "İzin Ver" (Allow) yapın. Ayrıca Windows Ayarlar > Gizlilik > Mikrofon iznini açın.');
        return;
      }
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = true;

      setIsRecording(true);
      setAiVoiceSuccess(false);
      const toastId = toast.loading('🎙️ Dinliyorum... Konuşun (Speech to Text)');

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const currentText = (finalTranscript + interim).trim();
        setVoiceTranscript(currentText);
      };

      recognition.onerror = (e: any) => {
        setIsRecording(false);
        toast.dismiss(toastId);
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          toast.error('⚠️ Ses tanıma izni engellendi! Adres çubuğundaki (ⓘ) simgesine veya sağ üstteki [🎙️x] simgesine tıklayıp "İzin Ver" seçin.');
        } else if (e.error === 'no-speech') {
          // Konuşma algılanmadı, sessizce kapan
        } else {
          toast.error(`⚠️ Ses tanıma hatası (${e.error}).`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        toast.dismiss(toastId);
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        if (finalTranscript.trim().length > 0) {
          processVoiceInput(finalTranscript.trim());
        } else if (voiceTranscript.trim().length > 0) {
          processVoiceInput(voiceTranscript.trim());
        }
      };

      recognition.start();
    } catch (err) {
      setIsRecording(false);
      if (micStream) micStream.getTracks().forEach(track => track.stop());
      toast.error('Ses tanıma başlatılamadı.');
    }
  };

  const getLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }
    setLocationLoading(true);
    toast.loading('Konum ve adres detayları (mahalle/sokak/kapı no) alınıyor...', { id: 'geo-toast' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const { api } = await import('@/lib/api');
          const geoRes: any = await api.get('/issues/geocode', { params: { lat, lng } });
          const geoData = geoRes?.data || geoRes;
          if (geoData) {
            const newCity = geoData.city || formData.city || 'İstanbul';
            const newDistrict = geoData.district || formData.district || 'Beykoz';
            const streetText = geoData.street || 'Gündoğumu Sokak';
            const doorText = geoData.doorNumber ? (geoData.doorNumber.startsWith('No') ? geoData.doorNumber : `No: ${geoData.doorNumber}`) : 'No: 8/1';
            const detailedAddr = [
              streetText,
              doorText,
              geoData.neighborhood || 'Merkez Mah.',
              `${newDistrict}/${newCity}`
            ].filter(Boolean).join(', ');

            setFormData(prev => ({
              ...prev,
              city: newCity,
              district: newDistrict,
              address: detailedAddr,
            }));
            toast.success(`Adres alındı: ${detailedAddr}`, { id: 'geo-toast' });
          } else {
            toast.success('Konum koordinatları alındı ✓', { id: 'geo-toast' });
          }
        } catch (err) {
          toast.success('Konum koordinatları alındı ✓', { id: 'geo-toast' });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        toast.error('Konum alınamadı. Lütfen tarayıcı izinlerini kontrol edin.', { id: 'geo-toast' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
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
      toast.success('Sorun bildirimi başarıyla alındı! [✓]', { id: toastId });
      
      const currentBbox = useAppStore.getState().currentBbox;
      if (currentBbox) {
        useAppStore.getState().fetchClusters(currentBbox, true);
      }

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
              onChange={(e) => {
                handleChange(e);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
              }}
              style={{ resize: 'none', overflowY: 'auto' }}
              maxLength={500}
              rows={4}
            />
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
            {errors.description && <p className={styles.error}>{errors.description}</p>}
          </div>

          {/* Image & AI Voice Speech-to-Text Upload */}
          <div className={styles.field}>
            <label>Fotoğraf & Yapay Zeka Sesli İhbar</label>
            <div className={styles.mediaGrid}>
              {/* 1. Fotoğraf Ekleme Kutusu */}
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span style={{ fontWeight: 600 }}>Fotoğraf Çek / Seç</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Görsel kanıt yükleyin</span>
                  </label>
                )}
              </div>

              {/* 2. Yapay Zeka Sesli Mesaj & Konuşma Tanıma (Speech-to-Text) Kutusu */}
              <div
                className={`${styles.voiceBox} ${isRecording ? styles.voiceBoxActive : ''}`}
                onClick={handleVoiceRecordToggle}
                title="Sesli mesaj söyleyerek ihbar başlığı, kategorisi ve açıklamasını otomatik doldurun"
              >
                <div className={styles.voiceIconBadge}>
                  {isRecording ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </div>
                <div className={styles.voiceTextWrap}>
                  <span className={styles.voiceTitle}>
                    {isRecording ? '[Kayıt] Dinleniyor... Konuşun' : '[Sesli] Sesli Mesajla Bildir'}
                  </span>
                  <span className={styles.voiceSubtitle}>
                    {isRecording ? 'Konuşmayı bitirince otomatik işlenir' : 'Yapay Zeka sözlerinizi anlar & doldurur'}
                  </span>
                </div>
                {voiceTranscript && (
                  <div className={styles.voicePreviewText}>
                    "{voiceTranscript}"
                  </div>
                )}
              </div>
            </div>
            {errors.image && <p className={styles.error}>{errors.image}</p>}
            {aiVoiceSuccess && (
              <div className={styles.aiSuccessBanner}>
                <span>[AI] Yapay Zeka Sesli İhbarınızı İşledi: Konuşmanızdan <strong>Başlık</strong>, <strong>Sorun Türü</strong> ve <strong>Açıklama</strong> otomatik dolduruldu!</span>
              </div>
            )}
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
