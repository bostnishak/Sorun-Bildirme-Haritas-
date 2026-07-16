'use client';

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

interface ExtractionData {
  kategori: string | null;
  kategoriTurkce: string | null;
  baslik: string | null;
  aciklama: string | null;
  adres: {
    tamAdres: string;
    il: string;
    ilce: string;
    mahalle: string;
    sokak: string;
    kapiNo: string;
  } | null;
  oncelik: string;
  guvenlik_ihlari: boolean;
  siteDisiKonu?: boolean;
  eksikBilgiSoru: string | null;
  asistanMesaji: string;
  onayBekliyor: boolean;
  ihbarOlusturuldu: boolean;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  extraction?: ExtractionData;
  image?: string | null;
}

export function AiChatbotWidget() {
  const user = useAppStore(state => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: user
        ? 'Merhaba! Ben Türkiye Sorun Bildirim Haritası platformunun yapay zeka asistanıyım. Sorun bildirimi yapmak veya platform hakkında bilgi almak için mesaj yazabilirsiniz.'
        : 'Merhaba! Sorun Bildirim Haritası platformu hakkında bilgi alabilir veya platform kullanımı konusunda yardım isteyebilirsiniz. Bildirim oluşturmak için giriş yapmanız gerekmektedir.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const loadingStates = [
    'Metin ve bağlam inceleniyor...', 
    'Güvenlik ve kurallar analiz ediliyor...', 
    'Kategori eşleştiriliyor...', 
    'İhbar detayları hazırlanıyor...'
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingStates.length);
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setLoadingTextIndex(0);
    }
  }, [loading]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Task 2A+: Auto-scroll — yeni mesaj gelince otomatik aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Mobil tespiti
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 38), 110)}px`;
    }
  }, [input]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = true;

        setIsRecording(true);
        const toastId = toast.loading('🎙️ Mikrofon aktif: Sesli mesajınızı söyleyin...');

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
          setInput(currentText);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          toast.dismiss(toastId);
          simulateVoiceInput();
        };

        recognition.onend = () => {
          setIsRecording(false);
          toast.dismiss(toastId);
          if (finalTranscript.trim()) {
            setInput(finalTranscript.trim());
          }
        };

        recognition.start();
        return;
      } catch (err) {
        setIsRecording(false);
      }
    }

    simulateVoiceInput();
  };

  const simulateVoiceInput = () => {
    setIsRecording(true);
    toast.loading('🔴 Sesli Mesaj Modülü Dinliyor (Mikrofon & Akıllı Ses Girişi)...', { id: 'voice-sim' });
    setTimeout(() => {
      const spoken = window.prompt(
        '🎙️ Yapay Zeka Sesli İhbar Asistanı:\nLütfen sesli olarak iletmek istediğiniz sorunu yazın/okuyun:',
        'Kadıköy Moda caddesinde su borusu patladı sular sokağa taşıyor acil müdahale gerekiyor'
      );
      setIsRecording(false);
      toast.dismiss('voice-sim');
      if (spoken && spoken.trim()) {
        setInput(prev => (prev ? prev + ' ' + spoken.trim() : spoken.trim()));
      }
    }, 400);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imagePreview) || loading) return;

    const userText = input.trim();
    const imageToSend = imagePreview;
    setInput('');
    setImagePreview(null);

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText || 'Fotoğraf ile bildirim yapıldı.',
      image: imageToSend,
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res: any = await api.post('/issues/ai-assistant', {
        message: userText,
        imageBase64: imageToSend || undefined,
        history: messages.slice(-6).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
      });
      const data: ExtractionData = res.data || res;

      if (data.guvenlik_ihlari) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `Güvenlik Uyarı / Moderasyon: ${data.asistanMesaji}`,
          },
        ]);
      } else if (data.eksikBilgiSoru) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `${data.asistanMesaji}\n\nEksik Bilgi: ${data.eksikBilgiSoru}`,
          },
        ]);
      } else if (data.kategori) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: data.asistanMesaji,
            extraction: data,
          },
        ]);

        if (data.ihbarOlusturuldu && data.adres) {
          try {
            const formData = new FormData();
            formData.append('title', data.baslik || 'AI Bildirimi');
            formData.append('description', data.aciklama || 'AI tarafından oluşturuldu.');
            formData.append('category', data.kategori);
            formData.append('city', data.adres.il || 'İstanbul');
            formData.append('district', data.adres.ilce || 'Beykoz');
            formData.append('address', data.adres.tamAdres);
            
            // Eğer resim varsa blob'a çevirip ekle
            if (imageToSend) {
              const res = await fetch(imageToSend);
              const blob = await res.blob();
              formData.append('image', blob, 'ai-upload.jpg');
            }

            await api.post('/issues', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            const currentBbox = useAppStore.getState().currentBbox;
            if (currentBbox) {
              useAppStore.getState().fetchClusters(currentBbox, true);
            }
          } catch (createErr) {
            console.error("AI Issue creation failed:", createErr);
          }
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: data.asistanMesaji,
          },
        ]);
      }
    } catch (err: any) {
      const isRateLimit = err.response?.status === 429;
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: isRateLimit 
            ? 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin veya hesabınıza giriş yapın.' 
            : `Hata: ${err.response?.data?.error?.message || err.message || 'İletişim sırasında bir sorun oluştu.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Task 2A: Mobil → küçük yuvarlak ikon, Masaüstü → yazılı pill buton
  const triggerButton = !isOpen && (
    isMobile ? (
      // MOBİL: Sadece ikon, metin yok
      <button
        onClick={() => setIsOpen(true)}
        aria-label="AI Asistanı Aç"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.5)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    ) : (
      // MASAÜSTÜ: Mevcut pill buton
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
          border: 'none',
          padding: '14px 22px',
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.95rem',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        AI İhbar Asistanı
      </button>
    )
  );

  return (
    <div style={{ position: 'fixed', bottom: '86px', right: '16px', zIndex: 9999 }}>
      {triggerButton}

      {isOpen && (
        <div
          style={{
            // Mobil: tam ekran, Masaüstü: sabit boyut
            width: isMobile ? '100vw' : '410px',
            height: isMobile ? '100dvh' : '540px',
            position: isMobile ? 'fixed' : 'relative',
            bottom: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            top: isMobile ? 0 : undefined,
            left: isMobile ? 0 : undefined,
            backgroundColor: '#ffffff',
            border: isMobile ? 'none' : '1px solid #e2e8f0',
            borderRadius: isMobile ? 0 : '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: isMobile ? 99999 : undefined,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                AI
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: 600 }}>
                  Yapay Zeka İhbar Asistanı
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
                  Akıllı Konuşma & Doğrulama Destekli
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Kapat"
            >
              ✕
            </button>
          </div>

          {!user && (
            <div style={{
              background: '#fffbeb',
              borderBottom: '1px solid #fde68a',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500
            }}>
              <span style={{ flexShrink: 0, fontSize: '16px' }}>!</span>
              <span>Sadece giriş yapanlar ihbar oluşturabilir. Şu an sadece bilgi alabilirsiniz.</span>
            </div>
          )}

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#ffffff',
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: msg.sender === 'user' ? '#2563eb' : '#f1f5f9',
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    boxShadow: msg.sender === 'user'
                      ? '0 4px 12px rgba(37, 99, 235, 0.2)'
                      : '0 1px 2px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Yüklenen görsel"
                      style={{
                        width: '100%',
                        maxHeight: '160px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  )}
                  {msg.text}
                </div>

                {/* siteDisiKonu: Platform dışı konu — farklı stil */}
                {msg.extraction?.siteDisiKonu && (
                  <div style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '14px' }}>ℹ</span>
                    <span>Yalnızca platform konularında yardımcı olabilirim.</span>
                  </div>
                )}

                {msg.extraction && msg.extraction.kategori && !msg.extraction.eksikBilgiSoru && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: '#047857' }}>
                      Çıkarılan İhbar Verisi:
                    </div>
                    <div><b>Kategori:</b> {msg.extraction.kategoriTurkce || msg.extraction.kategori}</div>
                    <div><b>Başlık:</b> {msg.extraction.baslik}</div>
                    {msg.extraction.adres && (
                      <div><b>Adres:</b> {msg.extraction.adres.tamAdres || `${msg.extraction.adres.sokak} No:${msg.extraction.adres.kapiNo}, ${msg.extraction.adres.ilce}/${msg.extraction.adres.il}`}</div>
                    )}
                    <div><b>Öncelik:</b> {msg.extraction.oncelik}</div>
                    {msg.extraction.onayBekliyor && (
                      <div style={{ marginTop: '8px', padding: '6px', background: '#d1fae5', borderRadius: '6px', textAlign: 'center', fontWeight: 600, color: '#065f46' }}>
                        Lütfen onaylamak için "evet" yazınız.
                      </div>
                    )}
                    {msg.extraction.ihbarOlusturuldu && (
                      <div style={{ marginTop: '8px', padding: '6px', background: '#dcfce7', borderRadius: '6px', textAlign: 'center', fontWeight: 700, color: '#166534' }}>
                        ✓ İhbar Başarıyla Kaydedildi
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <span style={{ fontSize: '16px' }}>⏳</span>
                  {loadingStates[loadingTextIndex]}
                </div>
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #cbd5e1' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#475569', flex: 1 }}>Fotoğraf eklendi</span>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Kaldır
              </button>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-end',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => {
                const fileInput = document.getElementById('ai-chatbot-file-input');
                fileInput?.click();
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
                flexShrink: 0,
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
              }}
              title="Fotoğraf Ekle"
            >
              <input
                id="ai-chatbot-file-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={handleVoiceRecordToggle}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
                flexShrink: 0,
                borderRadius: '8px',
                backgroundColor: isRecording ? '#dc2626' : '#ffffff',
                border: isRecording ? '1px solid #dc2626' : '1px solid #cbd5e1',
                color: isRecording ? '#ffffff' : '#2563eb',
                transition: 'all 0.2s ease',
                boxShadow: isRecording ? '0 0 0 3px rgba(220, 38, 38, 0.2)' : 'none',
              }}
              title={isRecording ? 'Dinleniyor... Konuşmayı bitirmek için tıklayın' : 'Sesli Mesajla Söyle (Yapay Zeka Konuşmadan Metne)'}
            >
              {isRecording ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 38), 110)}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isRecording ? '🔴 Dinleniyor... Konuşun' : 'Mesajınızı yazın...'}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: '38px',
                maxHeight: '110px',
                padding: '9px 10px',
                margin: 0,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.85rem',
                lineHeight: '1.35',
                outline: 'none',
                resize: 'none',
                overflowY: 'auto',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imagePreview)}
              style={{
                height: '38px',
                margin: 0,
                boxSizing: 'border-box',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '0 14px',
                borderRadius: '8px',
                fontWeight: 600,
                flexShrink: 0,
                cursor: (loading || (!input.trim() && !imagePreview)) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Gönder
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
