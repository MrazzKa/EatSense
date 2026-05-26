import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n/context';
import { ToastProvider } from '@/components/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'EatSense Expert Portal',
  description: 'Manage your expert profile, chat with clients, and view their nutrition data.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'EatSense Expert',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#3aa385',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
