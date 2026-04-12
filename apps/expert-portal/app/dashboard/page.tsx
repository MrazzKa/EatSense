'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ExpertProfile {
  id: string;
  displayName: string;
  isPublished: boolean;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  type: string;
  bio: string;
}

interface Stats {
  activeChats: number;
  totalClients: number;
  unreadMessages: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ activeChats: 0, totalClients: 0, unreadMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, conversationsData] = await Promise.all([
          apiFetch('/experts/me/profile'),
          apiFetch('/conversations?role=expert'),
        ]);

        setProfile(profileData);

        const conversations = conversationsData?.asExpert || conversationsData || [];
        const active = conversations.filter((c: any) => c.status === 'active');
        const unread = conversations.reduce((sum: number, c: any) => sum + (c._count?.messages || 0), 0);

        setStats({
          activeChats: active.length,
          totalClients: conversations.length,
          unreadMessages: unread,
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function getStatusBadge() {
    if (!profile) return null;

    if (profile.isPublished && profile.isVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#22c55e22] text-[var(--green)]">
          <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
          Published & Verified
        </span>
      );
    }

    if (!profile.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#ef444422] text-[var(--red)]">
          <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#f59e0b22] text-[var(--yellow)]">
        <span className="w-2 h-2 rounded-full bg-[var(--yellow)]" />
        Pending Review
      </span>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Profile status */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{profile?.displayName || 'Your Profile'}</h2>
                  <p className="text-sm text-[var(--text2)] capitalize">{profile?.type?.toLowerCase()}</p>
                </div>
                {getStatusBadge()}
              </div>

              {profile && !profile.isPublished && !profile.isActive && (
                <div className="bg-[#ef444411] border border-[#ef444433] rounded-lg p-4 text-sm">
                  <strong className="text-[var(--red)]">Profile rejected.</strong>{' '}
                  <span className="text-[var(--text2)]">
                    Please update your profile in the EatSense app and resubmit for review.
                  </span>
                </div>
              )}

              {profile && !profile.isPublished && profile.isActive && (
                <div className="bg-[#f59e0b11] border border-[#f59e0b33] rounded-lg p-4 text-sm">
                  <strong className="text-[var(--yellow)]">Under review.</strong>{' '}
                  <span className="text-[var(--text2)]">
                    Your profile is being reviewed by our team. You will receive a notification once it is approved.
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon="💬" label="Active Chats" value={stats.activeChats} />
              <StatCard icon="👥" label="Total Clients" value={stats.totalClients} />
              <StatCard icon="📩" label="Unread Messages" value={stats.unreadMessages} highlight={stats.unreadMessages > 0} />
              <StatCard icon="⭐" label="Rating" value={profile?.rating ? `${profile.rating.toFixed(1)} (${profile.reviewCount})` : 'No reviews'} />
            </div>

            {/* Quick actions */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <a href="/chats" className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium rounded-lg transition">
                  View Chats
                </a>
                <a href="/profile" className="px-4 py-2 bg-[var(--surface2)] hover:bg-[var(--border)] text-sm font-medium rounded-lg transition">
                  Edit Profile
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: string; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-[var(--text2)]">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-[var(--primary)]' : ''}`}>
        {value}
      </div>
    </div>
  );
}
