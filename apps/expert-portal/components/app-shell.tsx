'use client';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen md:flex">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto pb-24 pt-16 md:pb-0 md:pt-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
