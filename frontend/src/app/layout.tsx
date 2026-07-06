import type { Metadata, Viewport } from 'next';
import { QueryProvider } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Türkiye Sorun Bildirim Haritası',
  description: 'şehrinizde sorunları harita üzerinde bildirin ve takip edin.',
  keywords: ['sorun bildirim', 'belediye', 'harita', 'şikayet', 'türkiye'],
  authors: [{ name: 'TSBH Team' }],
  openGraph: {
    title: 'Türkiye Sorun Bildirim Haritası',
    description: 'şehir sorunlarını anlık olarak bildirin ve takip edin.',
    type: 'website',
    locale: 'tr_TR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f62fe',
};

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
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        {/* Unregister old service workers */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for (let registration of registrations) { registration.unregister(); }
            });
          }
        `}} />
      </head>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
