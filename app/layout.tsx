import type { Metadata, Viewport } from 'next';
import { Fraunces, Noto_Sans_Devanagari, Noto_Sans_JP, Source_Sans_3 } from 'next/font/google';
import { THEME_BOOT } from '@/lib/theme';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// Fraunces and Source Sans have no Devanagari or Japanese glyphs. These fill in (per character) when the app is in Nepali or Japanese.
const nepali = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '600', '700'], variable: '--font-ne', display: 'swap' });
const japanese = Noto_Sans_JP({ weight: ['400', '600', '700'], variable: '--font-ja', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'Aaiya Pain Guide',
  description: 'Click or describe where it hurts. Learn what the part does, why it might hurt, and what to try. Education, not diagnosis.',
};

// Never disable zoom. viewport-fit=cover lets the layout use the notch area; CSS pads it with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1a17' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the boot script below sets data-theme before React hydrates
    <html lang="en" className={`${display.variable} ${body.variable} ${nepali.variable} ${japanese.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
