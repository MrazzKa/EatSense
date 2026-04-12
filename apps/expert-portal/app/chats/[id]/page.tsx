'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const convId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await apiFetch(`/messages/conversation/${convId}`);
      const list = Array.isArray(msgs) ? msgs : msgs?.messages || [];
      const lastId = list[list.length - 1]?.id || '';

      if (lastId !== lastMessageIdRef.current) {
        setMessages(list);
        lastMessageIdRef.current = lastId;
        setTimeout(scrollToBottom, 100);

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

  // Polling
  useEffect(() => {
    pollRef.current = setInterval(loadMessages, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
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
    if (!confirm('Complete this consultation? The client will be able to leave a review.')) return;
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
    if (!confirm('Request access to client nutrition and health data?')) return;
    try {
      await apiFetch(`/messages/conversation/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ content: 'I would like to access your nutrition data and health reports to better assist you. Please grant access if you agree.', type: 'report_request' }),
      });
      await loadMessages();
    } catch (err) {
      console.error('Failed to request data:', err);
    }
  }

  function getClientName() {
    if (!conversation) return 'Client';
    const p = conversation.client?.userProfile;
    if (p?.firstName || p?.lastName) {
      return [p.firstName, p.lastName].filter(Boolean).join(' ');
    }
    return conversation.client?.email || 'Client';
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
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <span className="text-xs text-[var(--text2)] bg-[var(--surface2)] px-3 py-1 rounded-full">
            {msg.type === 'report_grant' ? '🔓 Client granted data access' : '🔒 Client revoked data access'}
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
            <img src={msg.content} alt="Photo" className="max-w-full rounded-lg mb-1" style={{ maxHeight: 300 }} />
          )}
          {msg.type === 'meal_share' && (
            <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">🍽 Shared meals</div>
          )}
          {msg.type === 'report_request' && (
            <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">🔐 Data access request</div>
          )}

          {msg.type !== 'photo' && <p>{msg.content}</p>}

          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'opacity-70' : 'text-[var(--text2)]'}`}>
            <span>{formatTime(msg.createdAt)}</span>
            {isMe && msg.isRead && <span>✓✓</span>}
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
            <Link href="/chats" className="text-[var(--text2)] hover:text-[var(--text)] transition mr-1">
              ←
            </Link>
            <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
              {getClientName().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm">{getClientName()}</div>
              <div className="text-xs text-[var(--text2)] capitalize">{conversation?.status || ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation?.reportsShared && (
              <Link
                href={`/clients/${convId}`}
                className="px-3 py-1.5 text-xs font-medium bg-[#22c55e22] text-[var(--green)] rounded-lg hover:bg-[#22c55e33] transition"
              >
                View Data
              </Link>
            )}
            {conversation?.status === 'active' && (
              <>
                {!conversation.reportsShared && (
                  <button
                    onClick={handleRequestData}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--surface2)] text-[var(--text2)] rounded-lg hover:bg-[var(--border)] transition cursor-pointer"
                  >
                    Request Data
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-xs font-medium bg-[#ef444422] text-[var(--red)] rounded-lg hover:bg-[#ef444433] transition cursor-pointer"
                >
                  Complete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--bg)]">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[var(--text2)]">No messages yet. Start the conversation!</p>
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
            This consultation has been completed.
          </div>
        )}

        {/* Input */}
        {conversation?.status === 'active' && (
          <form onSubmit={handleSend} className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
