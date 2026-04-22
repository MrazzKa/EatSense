'use client';

import { useEffect, useState } from 'react';
import {
  Camera,
  CircleCheck,
  FileBarChart,
  Lock,
  LockOpen,
  MessageSquare,
  ShieldAlert,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';

const MESSAGE_TYPE_ICON: Record<string, LucideIcon> = {
  photo: Camera,
  meal_share: Utensils,
  report_share: FileBarChart,
  report_request: ShieldAlert,
  report_grant: CircleCheck,
  report_revoke: Lock,
};

interface Conversation {
  id: string;
  status: string;
  reportsShared: boolean;
  lastMessage?: {
    content: string;
    type: string;
    createdAt: string;
  };
  client: {
    id: string;
    email: string;
    userProfile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  };
  _count?: {
    messages: number;
  };
}

export default function ChatsPage() {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const previewLabel = (type: string): string => {
    switch (type) {
      case 'photo': return t('chats', 'photo');
      case 'meal_share': return t('chats', 'sharedMeals');
      case 'report_share': return t('chats', 'sharedReport');
      case 'report_request': return t('chats', 'reportRequest');
      case 'report_grant': return t('chats', 'reportGrant');
      case 'report_revoke': return t('chats', 'reportRevoke');
      default:
        return '';
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const data = await apiFetch('/conversations');
      const list = data?.asExpert || data || [];
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  function getClientName(conv: Conversation) {
    const p = conv.client?.userProfile;
    if (p?.firstName || p?.lastName) {
      return [p.firstName, p.lastName].filter(Boolean).join(' ');
    }
    return conv.client?.email || t('chats', 'clientFallback');
  }

  function renderLastMessagePreview(conv: Conversation) {
    if (!conv.lastMessage) return <span className="truncate">{t('chats', 'noMessages')}</span>;
    const Icon = MESSAGE_TYPE_ICON[conv.lastMessage.type];
    const label = previewLabel(conv.lastMessage.type);
    if (Icon && label) {
      return (
        <span className="inline-flex items-center gap-1.5 truncate">
          <Icon size={14} className="shrink-0" />
          <span className="truncate">{label}</span>
        </span>
      );
    }
    return <span className="truncate">{conv.lastMessage.content?.slice(0, 60) || ''}</span>;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return t('chats', 'yesterday');
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t('chats', 'title')}</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={48} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--text2)]" />
            <p className="text-[var(--text2)]">{t('chats', 'empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chats/${conv.id}`}
                className="flex items-center gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface2)] transition"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getClientName(conv).charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm truncate">
                      {getClientName(conv)}
                      {conv.status === 'completed' && (
                        <span className="ml-2 text-xs text-[var(--text2)]">{t('chats', 'complete')}</span>
                      )}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-[var(--text2)] shrink-0 ml-2">
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text2)] truncate min-w-0">
                      {renderLastMessagePreview(conv)}
                    </p>
                    {(conv._count?.messages || 0) > 0 && (
                      <span className="ml-2 shrink-0 bg-[var(--primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {conv._count!.messages}
                      </span>
                    )}
                  </div>
                </div>

                {/* Data access indicator */}
                {conv.reportsShared && (
                  <LockOpen size={16} className="text-[var(--green)]" aria-label={t('chats', 'dataAccessGranted')} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
