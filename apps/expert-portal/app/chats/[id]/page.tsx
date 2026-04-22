'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCheck, Lock, LockOpen, ShieldAlert, Utensils } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAtBottomRef = useRef(true);

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
      const list = Array.isArray(msgs) ? msgs : msgs?.messages || [];
      const lastId = list[list.length - 1]?.id || '';

      if (lastId !== lastMessageIdRef.current) {
        const wasAtBottom = isAtBottomRef.current;
        setMessages(list);
        lastMessageIdRef.current = lastId;
        if (wasAtBottom) {
          setTimeout(scrollToBottom, 100);
        }

        // Mark as read
        apiFetch(`/messages/conversation/${convId}/read`, { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
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
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await apiFetch(`/messages/conversation/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ content: input.trim(), type: 'text' }),
      });
      setInput('');
      await loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
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
        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
          isMe
            ? 'bg-[var(--primary)] text-white rounded-br-md'
            : 'bg-[var(--surface2)] text-[var(--text)] rounded-bl-md'
        }`}>
          {/* Special message types */}
          {msg.type === 'photo' && (
            <img src={msg.content} alt={t('chats', 'photo')} className="max-w-full rounded-lg mb-1" style={{ maxHeight: 300 }} />
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

          {msg.type !== 'photo' && <p>{msg.content}</p>}

          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'opacity-70' : 'text-[var(--text2)]'}`}>
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
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/chats" className="text-[var(--text2)] hover:text-[var(--text)] transition mr-1" aria-label={t('common', 'back')}>
              <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
              {getClientName().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm">{getClientName()}</div>
              <div className="text-xs text-[var(--text2)]">
                {conversation?.status === 'completed' && t('chats', 'complete')}
                {conversation?.status === 'cancelled' && t('chats', 'cancelled')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--surface2)] text-[var(--text2)] rounded-lg hover:bg-[var(--border)] transition cursor-pointer"
                  >
                    {t('chats', 'requestData')}
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-xs font-medium bg-[#ef444422] text-[var(--red)] rounded-lg hover:bg-[#ef444433] transition cursor-pointer"
                >
                  {t('chats', 'completeBtn')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--bg)]">
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
          <div className="px-6 py-3 bg-[var(--surface)] border-t border-[var(--border)] text-center text-sm text-[var(--text2)]">
            {t('chats', 'completedBanner')}
          </div>
        )}

        {/* Input */}
        {conversation?.status === 'active' && (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
            {/* Quick-action templates */}
            <div className="flex gap-2 px-6 pt-3 overflow-x-auto scrollbar-none">
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
            <form onSubmit={handleSend} className="flex items-center gap-3 px-6 py-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chats', 'typeMessage')}
                className="flex-1 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
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
