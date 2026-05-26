'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setItems((arr) => [...arr, { id, kind, message }]);
    // Auto-dismiss after 4s (errors stay slightly longer)
    const ttl = kind === 'error' ? 6000 : 4000;
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : Info;
  const tone =
    item.kind === 'success'
      ? 'border-[var(--green)] text-[var(--green)]'
      : item.kind === 'error'
        ? 'border-[var(--red)] text-[var(--red)]'
        : 'border-[var(--primary)] text-[var(--primary)]';

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-[var(--surface)] p-3 shadow-lg ring-1 ring-[var(--border)] transition-all duration-200 ${tone} ${show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
      role={item.kind === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm leading-snug text-[var(--text)]">{item.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-[var(--text2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: log to console + native alert if provider not mounted (should never happen in app).
    return {
      toast: (msg: string) => {
        if (typeof window !== 'undefined') alert(msg);
      },
    };
  }
  return ctx;
}
