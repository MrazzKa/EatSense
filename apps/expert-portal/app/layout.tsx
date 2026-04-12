import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'EatSense Expert Portal',
  description: 'Manage your expert profile, chat with clients, and view their nutrition data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
