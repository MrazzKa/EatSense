'use client';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-dvh md:flex md:h-dvh md:overflow-hidden">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-16 md:h-dvh md:overflow-y-auto md:pb-0 md:pt-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
