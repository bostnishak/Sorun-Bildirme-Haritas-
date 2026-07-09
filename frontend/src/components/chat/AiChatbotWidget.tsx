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
}

export function AiChatbotWidget() {
  const user = useAppStore(state => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Merhaba! Ben ChaosMind AI İhbar Asistanı. Gördüğünüz sorunu tek cümlede (adres, sorun türü ve detay) yazarak saniyeler içinde ihbarınızı oluşturabilirsiniz.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Sadece oturum açmış kullanıcılara göster
  if (!user) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.post('/issues/ai-assistant', { message: userText });
      const data: ExtractionData = res.data?.data;

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
                      <div><b>Adres:</b> {msg.extraction.adres.sokak} No:{msg.extraction.adres.kapiNo}, {msg.extraction.adres.ilce}/{msg.extraction.adres.il}</div>
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
                🤖 Yapay zeka metninizi ve adresleri analiz ediyor...
              </div>
            )}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px 16px',
              backgroundColor: '#1e293b',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Örn: Kadıköy Moda Cad No:15 rögar çökük..."
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
              disabled={loading || !input.trim()}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '0 16px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
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
