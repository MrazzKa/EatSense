'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch, apiBaseUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';
import Image from 'next/image';

interface Meal {
  id: string;
  photoUrl?: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  createdAt: string;
  items?: MealItem[];
}

interface MealItem {
  id: string;
  name: string;
  weight?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugars?: number;
  satFat?: number;
}

interface LabResult {
  id: string;
  testName: string;
  testDate: string;
  notes?: string;
  metrics?: LabMetric[];
}

interface LabMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

interface HealthProfile {
  firstName?: string;
  lastName?: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  goal?: string;
  dailyCalories?: number;
  preferences?: string;
  healthProfile?: any;
}

interface ClientData {
  clientId?: string;
  meals: Meal[];
  labResults: LabResult[];
  healthProfile: HealthProfile;
}

export default function ClientDataPage() {
  const params = useParams();
  const { t } = useI18n();
  const convId = params.id as string;
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'meals' | 'labs' | 'health'>('meals');

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: any = null;
    const load = async (silent: boolean) => {
      try {
        const result = await apiFetch(`/conversations/${convId}/client-data`);
        if (!cancelled) {
          setData(result);
          if (!silent) setLoading(false);
        }
        return result;
      } catch (err: any) {
        if (!cancelled && !silent) {
          setError(err.message || t('clients', 'loadFailed'));
          setLoading(false);
        }
      }
    };
    (async () => {
      const initial = await load(false);
      const clientId = initial?.clientId;
      if (cancelled) return;
      // Prefer SSE when we know the client id; fall back to 30s polling otherwise.
      if (clientId && typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        // EventSource cannot send headers; use a token query param. Backend SSE
        // route is protected by JwtAuthGuard which also accepts query token.
        const url = `${apiBaseUrl()}/experts/me/clients/${clientId}/stream?access_token=${encodeURIComponent(token || '')}`;
        try {
          es = new EventSource(url, { withCredentials: false });
          let lastTs = 0;
          es.onmessage = (ev) => {
            try {
              const snap = JSON.parse(ev.data);
              if (snap?.ts && snap.ts > lastTs) {
                lastTs = snap.ts;
                load(true);
              }
            } catch {}
          };
          es.onerror = () => {
            // On error, close & fall back to polling so the screen keeps working.
            es?.close();
            es = null;
            pollTimer = setInterval(() => load(true), 30000);
          };
        } catch {
          pollTimer = setInterval(() => load(true), 30000);
        }
      } else {
        pollTimer = setInterval(() => load(true), 30000);
      }
    })();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (es) es.close();
    };
  }, [convId, t]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/chats/${convId}`} className="inline-flex items-center gap-1.5 text-[var(--text2)] hover:text-[var(--text)] transition">
            <ArrowLeft size={16} />
            {t('clients', 'backToChat')}
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">{t('clients', 'title')}</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Lock size={48} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--text2)]" />
            <p className="text-[var(--text2)] mb-2">{error}</p>
            <p className="text-sm text-[var(--text2)]">{t('clients', 'noAccess')}</p>
          </div>
        ) : data ? (
          <>
            {/* Tabs */}
            <div className="mb-6 flex w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-fit">
              {(['meals', 'labs', 'health'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition cursor-pointer ${
                    tab === tabKey
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text2)] hover:text-[var(--text)]'
                  }`}
                >
                  {tabKey === 'meals'
                    ? `${t('clients', 'meals')} (${data.meals.length})`
                    : tabKey === 'labs'
                    ? `${t('clients', 'labs')} (${data.labResults.length})`
                    : t('clients', 'health')}
                </button>
              ))}
            </div>

            {/* Meals tab */}
            {tab === 'meals' && (
              <div className="space-y-3">
                {data.meals.length === 0 ? (
                  <p className="text-[var(--text2)] text-center py-10">{t('clients', 'noMeals')}</p>
                ) : (
                  data.meals.map((meal) => (
                    <div key={meal.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        {meal.photoUrl && (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={meal.photoUrl}
                              alt={t('clients', 'mealLabel')}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm font-medium">{meal.description || t('clients', 'mealLabel')}</span>
                            <span className="text-xs text-[var(--text2)]">
                              {new Date(meal.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Macros */}
                          <div className="flex flex-wrap gap-3 text-xs sm:gap-4">
                            {meal.calories != null && (
                              <span className="text-[var(--yellow)]">{Math.round(meal.calories)} kcal</span>
                            )}
                            {meal.protein != null && (
                              <span className="text-[var(--primary)]">P: {meal.protein.toFixed(1)}g</span>
                            )}
                            {meal.carbs != null && (
                              <span className="text-[var(--green)]">C: {meal.carbs.toFixed(1)}g</span>
                            )}
                            {meal.fat != null && (
                              <span className="text-[var(--red)]">F: {meal.fat.toFixed(1)}g</span>
                            )}
                          </div>

                          {/* Detailed ingredients with full macros */}
                          {meal.items && meal.items.length > 0 && (
                            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)]">
                              <table className="w-full text-xs">
                                <thead className="bg-[var(--surface2)] text-[var(--text2)]">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-medium">{t('clients', 'ingredient') || 'Ingredient'}</th>
                                    <th className="px-2 py-1.5 text-right font-medium">g</th>
                                    <th className="px-2 py-1.5 text-right font-medium">kcal</th>
                                    <th className="px-2 py-1.5 text-right font-medium">P</th>
                                    <th className="px-2 py-1.5 text-right font-medium">C</th>
                                    <th className="px-2 py-1.5 text-right font-medium">F</th>
                                    <th className="px-2 py-1.5 text-right font-medium">Fib</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {meal.items.map((it) => (
                                    <tr key={it.id} className="border-t border-[var(--border)]">
                                      <td className="px-2 py-1.5">{it.name}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.weight != null ? Math.round(it.weight) : '—'}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.calories != null ? Math.round(it.calories) : '—'}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.protein != null ? it.protein.toFixed(1) : '—'}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.carbs != null ? it.carbs.toFixed(1) : '—'}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.fat != null ? it.fat.toFixed(1) : '—'}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{it.fiber != null ? it.fiber.toFixed(1) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Lab results tab */}
            {tab === 'labs' && (
              <div className="space-y-4">
                {data.labResults.length === 0 ? (
                  <p className="text-[var(--text2)] text-center py-10">{t('clients', 'noLabs')}</p>
                ) : (
                  data.labResults.map((lab) => (
                    <div key={lab.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-medium text-sm">{lab.testName}</h3>
                        <span className="text-xs text-[var(--text2)]">
                          {new Date(lab.testDate).toLocaleDateString()}
                        </span>
                      </div>

                      {lab.notes && (
                        <p className="text-xs text-[var(--text2)] mb-3">{lab.notes}</p>
                      )}

                      {lab.metrics && lab.metrics.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs text-[var(--text2)] border-b border-[var(--border)]">
                                <th className="pb-2 pr-4">{t('clients', 'metric')}</th>
                                <th className="pb-2 pr-4">{t('clients', 'value')}</th>
                                <th className="pb-2">{t('clients', 'reference')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.metrics.map((m) => {
                                const outOfRange = (m.referenceMin != null && m.value < m.referenceMin) ||
                                  (m.referenceMax != null && m.value > m.referenceMax);
                                return (
                                  <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                                    <td className="py-2 pr-4 text-sm">{m.name}</td>
                                    <td className={`py-2 pr-4 font-medium ${outOfRange ? 'text-[var(--red)]' : ''}`}>
                                      {m.value} {m.unit}
                                    </td>
                                    <td className="py-2 text-xs text-[var(--text2)]">
                                      {m.referenceMin != null && m.referenceMax != null
                                        ? `${m.referenceMin} - ${m.referenceMax} ${m.unit}`
                                        : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Health profile tab */}
            {tab === 'health' && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
                {data.healthProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileField label={t('clients', 'name')} value={[data.healthProfile.firstName, data.healthProfile.lastName].filter(Boolean).join(' ')} />
                    <ProfileField label={t('clients', 'age')} value={data.healthProfile.age} />
                    <ProfileField label={t('clients', 'height')} value={data.healthProfile.height ? `${data.healthProfile.height} cm` : undefined} />
                    <ProfileField label={t('clients', 'weight')} value={data.healthProfile.weight ? `${data.healthProfile.weight} kg` : undefined} />
                    <ProfileField label={t('clients', 'gender')} value={data.healthProfile.gender} />
                    <ProfileField label={t('clients', 'goal')} value={data.healthProfile.goal} />
                    <ProfileField label={t('clients', 'dailyCalories')} value={data.healthProfile.dailyCalories ? `${data.healthProfile.dailyCalories} kcal` : undefined} />
                    <ProfileField label={t('clients', 'preferences')} value={data.healthProfile.preferences} />
                  </div>
                ) : (
                  <p className="text-[var(--text2)] text-center py-10">{t('clients', 'noHealth')}</p>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text2)] mb-1">{label}</dt>
      <dd className="text-sm font-medium">{value || '-'}</dd>
    </div>
  );
}
