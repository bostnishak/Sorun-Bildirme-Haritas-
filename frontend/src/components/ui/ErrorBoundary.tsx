'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — beklenmeyen render hatalarını yakalar.
 * Harita veya karmaşık bileşenler çöktüğünde tüm sayfanın bozulmasını önler.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Hata yakalandı:', error, info);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          minHeight: '200px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          gap: '1rem',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', fontWeight: 600, margin: 0 }}>
              Bu bileşen yüklenirken bir hata oluştu.
            </p>
            {this.state.error && (
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Harita bileşeni için özel fallback
 */
export function MapErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      minHeight: '400px',
      background: 'rgba(15, 23, 42, 0.8)',
      gap: '1rem',
      borderRadius: '12px',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
      <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>
        Harita yüklenemedi
      </p>
      <p style={{ color: '#475569', fontSize: '0.8rem', margin: 0 }}>
        Mapbox token&apos;ınızı veya internet bağlantınızı kontrol edin.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1.25rem',
            background: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Yenile
        </button>
      )}
    </div>
  );
}
