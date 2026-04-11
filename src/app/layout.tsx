// OnlyBae user frontend
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/lib/Fontawesome';
import PWARegister from '@/components/PWARegister';
import InstallPrompt from '@/components/InstallPrompt';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'OnlyBae',
  description: 'Premium content, reels, and manga from your favorite creators.',
  applicationName: 'OnlyBae',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OnlyBae',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className}`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <PWARegister />
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
