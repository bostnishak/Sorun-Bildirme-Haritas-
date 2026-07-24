import type { Metadata, Viewport } from 'next';
import { QueryProvider } from './providers';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: 'Etiya Project — Türkiye Sorun Bildirim Haritası',
  description: 'Şehrinizdeki sorunları harita üzerinde anlık bildirin ve belediye/kurum çözüm sürecini şeffafça takip edin.',
  keywords: ['sorun bildirim', 'belediye', 'harita', 'kentsel sorun', 'türkiye', 'etiya-project'],
  authors: [{ name: 'Etiya Project Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Etiya Project',
  },
  openGraph: {
    title: 'Etiya Project — Türkiye Sorun Bildirim Haritası',
    description: 'Şehir sorunlarını anlık bildirin ve takip edin.',
    type: 'website',
    locale: 'tr_TR',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
  viewportFit: 'cover',
};

import { AiChatbotWidget } from '@/components/chat/AiChatbotWidget';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { Footer } from '@/components/layout/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        {/* SORUN-75: Runtime Config Enjeksiyonu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = { API_URL: "${process.env.NEXT_PUBLIC_API_URL || '/api'}" }`,
          }}
        />
      </head>
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
        {/* Force Unregister PWA Service Worker to clear cache */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            window.addEventListener('load', function() {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
              });
            });
          }
        `}} />
      </head>
      <body>
        <QueryProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div style={{ flex: '1 0 auto' }}>
              {children}
            </div>
            <Footer />
          </div>
          <AiChatbotWidget />
          <CookieBanner />
        </QueryProvider>
      </body>
    </html>
  );
}


