'use client';

import React, { useState } from 'react';
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
      text: 'Merhaba! Ben ChaosMind AI İhbar Asistanı. Gördüğünüz sorunu (adres, sorun türü ve detay) yazarak veya fotoğraf yükleyerek bana iletebilirsiniz.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sadece oturum açmış kullanıcılara göster
  if (!user) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
      text: userText || '📷 Fotoğraf ile bildirim yapıldı.',
      image: imageToSend,
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res: any = await api.post('/issues/ai-assistant', {
        message: userText,
        imageBase64: imageToSend || undefined,
      });
      const data: ExtractionData = res.data || res;

      if (data.guvenlik_ihlari) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `⚠️ Güvenlik Uyarı / Moderasyon: ${data.asistanMesaji}`,
          },
        ]);
      } else if (data.eksikBilgiSoru) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `${data.asistanMesaji}\n\n❓ Eksik Bilgi: ${data.eksikBilgiSoru}`,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: data.asistanMesaji,
            extraction: data,
          },
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Hata: ${err.response?.data?.error?.message || err.message || 'İletişim sırasında bir sorun oluştu.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
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
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🤖</span>
          AI İhbar Asistanı
        </button>
      )}

      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🤖</span>
              <div>
                <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>
                  Tek İstemli AI Asistan
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>● Aktif & Moderasyon Korumalı</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.3rem',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
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
                    backgroundColor: msg.sender === 'user' ? '#2563eb' : '#1e293b',
                    color: 'white',
                    fontSize: '0.88rem',
                    lineHeight: '1.45',
                    whiteSpace: 'pre-wrap',
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
                      }}
                    />
                  )}
                  {msg.text}
                </div>

                {msg.extraction && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#d1fae5',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: '#10b981' }}>
                      ⚡ Çıkarılan İhbar Verisi:
                    </div>
                    <div><b>Kategori:</b> {msg.extraction.kategoriTurkce || msg.extraction.kategori}</div>
                    <div><b>Başlık:</b> {msg.extraction.baslik}</div>
                    {msg.extraction.adres && (
                      <div><b>Adres:</b> {msg.extraction.adres.tamAdres || `${msg.extraction.adres.sokak} No:${msg.extraction.adres.kapiNo}, ${msg.extraction.adres.ilce}/${msg.extraction.adres.il}`}</div>
                    )}
                    <div><b>Öncelik:</b> {msg.extraction.oncelik}</div>
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
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                🤖 Yapay zeka metninizi ve fotoğrafınızı analiz ediyor...
              </div>
            )}
          </div>

          {/* Görsel Önizleme */}
          {imagePreview && (
            <div style={{ padding: '6px 16px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={imagePreview} alt="Preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', flex: 1 }}>Fotoğraf eklendi</span>
              <button type="button" onClick={() => setImagePreview(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}>Kaldır</button>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px 16px',
              backgroundColor: '#1e293b',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
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
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
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
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: '#0f172a',
                color: 'white',
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
                borderRadius: '10px',
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
