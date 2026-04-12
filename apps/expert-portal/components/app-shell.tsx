'use client';

import { ProtectedRoute } from './protected-route';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
