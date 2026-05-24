'use client';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="h-dvh overflow-hidden md:flex">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-24 pt-16 md:h-dvh md:pb-0 md:pt-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
