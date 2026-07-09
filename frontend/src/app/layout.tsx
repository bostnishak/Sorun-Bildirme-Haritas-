import type { Metadata, Viewport } from 'next';
import { QueryProvider } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ChaosMind — Türkiye Sorun Bildirim Haritası',
  description: 'Şehrinizdeki sorunları harita üzerinde anlık bildirin ve belediye/kurum çözüm sürecini şeffafça takip edin.',
  keywords: ['sorun bildirim', 'belediye', 'harita', 'kentsel sorun', 'türkiye', 'chaosmind'],
  authors: [{ name: 'ChaosMind Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChaosMind',
  },
  openGraph: {
    title: 'ChaosMind — Türkiye Sorun Bildirim Haritası',
    description: 'Şehir sorunlarını anlık bildirin ve takip edin.',
    type: 'website',
    locale: 'tr_TR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
};

import { AiChatbotWidget } from '@/components/chat/AiChatbotWidget';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Favicon & Manifest */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        {/* Register PWA Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.warn('SW register error:', err);
              });
            });
          }
        `}} />
      </head>
      <body>
        <QueryProvider>
          {children}
          <AiChatbotWidget />
        </QueryProvider>
      </body>
    </html>
  );
}
