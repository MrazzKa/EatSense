'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, Languages, Lock, LockOpen, ShieldAlert, Utensils } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';
import Image from 'next/image';

interface Message {
  id: string;
  content: string;
  type: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: string;
  reportsShared: boolean;
  shareMeals?: boolean;
  shareAnalyses?: boolean;
  shareMedications?: boolean;
  client: {
    id: string;
    email: string;
    userProfile?: { firstName?: string; lastName?: string };
  };
  expert: {
    id: string;
    displayName: string;
  };
}

const POLL_INTERVAL = 4000;

const TEMPLATE_KEYS = [
  { label: 'templateGreetingLabel', body: 'templateGreeting' },
  { label: 'templateGoalsLabel', body: 'templateGoals' },
  { label: 'templateAllergiesLabel', body: 'templateAllergies' },
  { label: 'templateTypicalDayLabel', body: 'templateTypicalDay' },
  { label: 'templateNextStepsLabel', body: 'templateNextSteps' },
  { label: 'templateFollowUpLabel', body: 'templateFollowUp' },
] as const;

export default function ChatPage() {
  const params = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const convId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);

  async function toggleTranslate(messageId: string) {
    if (translations[messageId]) {
      setTranslations((t) => {
        const next = { ...t };
        delete next[messageId];
        return next;
      });
      return;
    }
    setTranslating(messageId);
    try {
      const target = (typeof navigator !== 'undefined' && navigator.language?.slice(0, 2)) || 'en';
      const res = await apiFetch(`/messages/${messageId}/translate`, {
        method: 'POST',
        body: JSON.stringify({ targetLocale: target }),
      });
      if (res?.translation) {
        setTranslations((t) => ({ ...t, [messageId]: res.translation }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTranslating(null);
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAtBottomRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    isAtBottomRef.current = distance < 80;
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await apiFetch(`/messages/conversation/${convId}`);
      if (!isMountedRef.current) return;
      const list = Array.isArray(msgs)
        ? msgs
        : Array.isArray(msgs?.messages)
          ? msgs.messages
          : [];
      const lastId = list[list.length - 1]?.id || '';

      if (lastId !== lastMessageIdRef.current) {
        const wasAtBottom = isAtBottomRef.current;
        setMessages(list);
        lastMessageIdRef.current = lastId;
        if (wasAtBottom) {
          setTimeout(() => { if (isMountedRef.current) scrollToBottom(); }, 100);
        }

        // Mark as read
        apiFetch(`/messages/conversation/${convId}/read`, { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to load messages:', err);
    }
  }, [convId, scrollToBottom]);

  useEffect(() => {
    (async () => {
      try {
        const conv = await apiFetch(`/conversations/${convId}`);
        setConversation(conv);
        await loadMessages();
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [convId, loadMessages]);

  // Polling — pause while tab is hidden, resume on focus
  useEffect(() => {
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(loadMessages, POLL_INTERVAL);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadMessages();
        startPolling();
      } else {
        stopPolling();
      }
    };
    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [loadMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    // Optimistic insert so the user sees instant feedback.
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      content: body,
      type: 'text',
      senderId: 'me',
      createdAt: new Date().toISOString(),
      isRead: false,
    } as any;
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setTimeout(scrollToBottom, 50);
    try {
      await apiFetch(`/messages/conversation/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ content: body, type: 'text' }),
      });
      // Replace optimistic by reloading server state.
      await loadMessages();
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // On 5xx the message may have been persisted server-side; keep optimistic
      // and let next poll reconcile. On other errors, roll back and restore input.
      const status = err?.status || err?.response?.status;
      if (typeof status === 'number' && status >= 500) {
        alert(t('common', 'error'));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(body);
        alert(t('common', 'error'));
      }
    } finally {
      setSending(false);
    }
  }

  async function handleComplete() {
    if (!confirm(t('chats', 'confirmComplete'))) return;
    try {
      await apiFetch(`/conversations/${convId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      setConversation((prev) => prev ? { ...prev, status: 'completed' } : prev);
    } catch (err) {
      console.error('Failed to complete:', err);
    }
  }

  async function handleRequestData() {
    if (!confirm(t('chats', 'confirmRequestData'))) return;
    try {
      await apiFetch(`/messages/conversation/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ content: t('chats', 'requestDataMessage'), type: 'report_request' }),
      });
      await loadMessages();
    } catch (err) {
      console.error('Failed to request data:', err);
    }
  }

  function getClientName() {
    if (!conversation) return t('chats', 'clientFallback');
    const p = conversation.client?.userProfile;
    if (p?.firstName || p?.lastName) {
      return [p.firstName, p.lastName].filter(Boolean).join(' ');
    }
    return conversation.client?.email || t('chats', 'clientFallback');
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function renderMessage(msg: Message) {
    const isMe = msg.senderId === user?.id;

    // System messages
    if (['report_grant', 'report_revoke'].includes(msg.type)) {
      const granted = msg.type === 'report_grant';
      const Icon = granted ? LockOpen : Lock;
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text2)] bg-[var(--surface2)] px-3 py-1 rounded-full">
            <Icon size={12} />
            {granted ? t('chats', 'grantedDataAccess') : t('chats', 'revokedDataAccess')}
          </span>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[86%] px-4 py-2.5 rounded-2xl text-sm sm:max-w-[70%] ${
          isMe
            ? 'bg-[var(--primary)] text-white rounded-br-md'
            : 'bg-[var(--surface2)] text-[var(--text)] rounded-bl-md'
        }`}>
          {/* Special message types */}
          {msg.type === 'photo' && (
            <div className="relative mb-1 h-[min(300px,60vw)] w-[min(420px,70vw)] max-w-full overflow-hidden rounded-lg">
              <Image
                src={msg.content}
                alt={t('chats', 'photo')}
                fill
                sizes="(max-width: 640px) 70vw, 420px"
                className="object-contain"
              />
            </div>
          )}
          {msg.type === 'meal_share' && (
            <div className="flex items-center gap-1.5 mb-1 opacity-80 text-xs">
              <Utensils size={12} />
              <span>{t('chats', 'sharedMeals')}</span>
            </div>
          )}
          {msg.type === 'report_request' && (
            <div className="flex items-center gap-1.5 mb-1 opacity-80 text-xs">
              <ShieldAlert size={12} />
              <span>{t('chats', 'dataAccessRequest')}</span>
            </div>
          )}

          {msg.type !== 'photo' && <p>{translations[msg.id] || msg.content}</p>}
          {translations[msg.id] && (
            <p className={`mt-1 text-[10px] italic ${isMe ? 'opacity-70' : 'text-[var(--text2)]'}`}>
              {t('chats', 'translated') || 'Translated'}
            </p>
          )}

          <div className={`flex items-center justify-end gap-2 mt-1 text-[10px] ${isMe ? 'opacity-70' : 'text-[var(--text2)]'}`}>
            {!isMe && msg.type === 'text' && msg.content && (
              <button
                onClick={() => toggleTranslate(msg.id)}
                className="inline-flex items-center gap-0.5 opacity-70 hover:opacity-100"
                disabled={translating === msg.id}
                title={translations[msg.id] ? 'Show original' : 'Translate'}
              >
                <Languages size={11} />
                {translating === msg.id ? '…' : translations[msg.id] ? 'orig' : ''}
              </button>
            )}
            <span>{formatTime(msg.createdAt)}</span>
            {isMe && msg.isRead && <CheckCheck size={12} />}
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  function renderMessages() {
    let lastDate = '';
    const elements: React.ReactNode[] = [];

    for (const msg of messages) {
      const dateStr = formatDate(msg.createdAt);
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        elements.push(
          <div key={`date-${dateStr}`} className="flex justify-center my-4">
            <span className="text-xs text-[var(--text2)] bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--border)]">
              {dateStr}
            </span>
          </div>
        );
      }
      elements.push(renderMessage(msg));
    }

    return elements;
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-8.75rem)] min-h-0 flex-col overflow-hidden md:h-dvh">
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/chats" className="text-[var(--text2)] hover:text-[var(--text)] transition mr-1" aria-label={t('common', 'back')}>
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
              {getClientName().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{getClientName()}</div>
              <div className="text-xs text-[var(--text2)]">
                {conversation?.status === 'completed' && t('chats', 'complete')}
                {conversation?.status === 'cancelled' && t('chats', 'cancelled')}
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {conversation?.reportsShared && (
              <Link
                href={`/clients/${convId}`}
                className="px-3 py-1.5 text-xs font-medium bg-[#22c55e22] text-[var(--green)] rounded-lg hover:bg-[#22c55e33] transition"
              >
                {t('chats', 'viewData')}
              </Link>
            )}
            {conversation?.status === 'active' && (
              <>
                {!conversation.reportsShared && (
                <button
                  onClick={handleRequestData}
                    className="min-h-9 rounded-lg bg-[var(--surface2)] px-3 py-1.5 text-xs font-medium text-[var(--text2)] transition hover:bg-[var(--border)]"
                  >
                    {t('chats', 'requestData')}
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  className="hidden min-h-9 rounded-lg bg-[#ef444422] px-3 py-1.5 text-xs font-medium text-[var(--red)] transition hover:bg-[#ef444433] sm:inline-flex sm:items-center"
                >
                  {t('chats', 'completeBtn')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--bg)] px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[var(--text2)]">{t('chats', 'startConversation')}</p>
            </div>
          ) : (
            <>
              {renderMessages()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Completed banner */}
        {conversation?.status === 'completed' && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-sm text-[var(--text2)] sm:px-6">
            {t('chats', 'completedBanner')}
          </div>
        )}

        {/* Input */}
        {conversation?.status === 'active' && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
            {/* Quick-action templates */}
            <div className="hidden gap-2 overflow-x-auto px-4 pt-3 sm:flex sm:px-6">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text2)] self-center shrink-0 pr-1">
                {t('chats', 'templates')}
              </span>
              {TEMPLATE_KEYS.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => setInput(t('chats', tpl.body))}
                  className="shrink-0 px-3 py-1 text-xs rounded-full bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)] transition cursor-pointer"
                >
                  {t('chats', tpl.label)}
                </button>
              ))}
            </div>
            <form onSubmit={handleSend} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chats', 'typeMessage')}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text2)] focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="min-h-11 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
              >
                {t('chats', 'send')}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
