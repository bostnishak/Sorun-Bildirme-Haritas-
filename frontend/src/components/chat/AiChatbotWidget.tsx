'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Merhaba! Ben Etiya Project Yapay Zeka İhbar Asistanı. Gördüğünüz sorunu (adres, sorun türü ve detay) yazarak veya fotoğraf yükleyerek bana iletebilirsiniz.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  return (
    <div style={{ position: 'fixed', bottom: '86px', right: '16px', zIndex: 9999 }}>
      {!isOpen && (
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
      )}

      {isOpen && (
        <div
          style={{
            width: '390px',
            height: '540px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
              <span style={{ flexShrink: 0, fontSize: '16px' }}>⚠️</span>
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
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <label
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
              }}
              title="Fotoğraf Ekle"
            >
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Mesajınızı veya sorunu yazın..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imagePreview)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: (loading || (!input.trim() && !imagePreview)) ? 'not-allowed' : 'pointer',
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
