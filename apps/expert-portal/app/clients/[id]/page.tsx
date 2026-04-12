'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

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
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
  meals: Meal[];
  labResults: LabResult[];
  healthProfile: HealthProfile;
}

export default function ClientDataPage() {
  const params = useParams();
  const convId = params.id as string;
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'meals' | 'labs' | 'health'>('meals');

  useEffect(() => {
    (async () => {
      try {
        const result = await apiFetch(`/conversations/${convId}/client-data`);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load client data');
      } finally {
        setLoading(false);
      }
    })();
  }, [convId]);

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/chats/${convId}`} className="text-[var(--text2)] hover:text-[var(--text)] transition">
            ← Back to chat
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Client Data</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-[var(--text2)] mb-2">{error}</p>
            <p className="text-sm text-[var(--text2)]">The client may not have granted data access yet.</p>
          </div>
        ) : data ? (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
              {(['meals', 'labs', 'health'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition cursor-pointer ${
                    tab === t
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text2)] hover:text-[var(--text)]'
                  }`}
                >
                  {t === 'meals' ? `Meals (${data.meals.length})` : t === 'labs' ? `Lab Results (${data.labResults.length})` : 'Health Profile'}
                </button>
              ))}
            </div>

            {/* Meals tab */}
            {tab === 'meals' && (
              <div className="space-y-3">
                {data.meals.length === 0 ? (
                  <p className="text-[var(--text2)] text-center py-10">No meal data available.</p>
                ) : (
                  data.meals.map((meal) => (
                    <div key={meal.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <div className="flex gap-4">
                        {meal.photoUrl && (
                          <img
                            src={meal.photoUrl}
                            alt="Meal"
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{meal.description || 'Meal'}</span>
                            <span className="text-xs text-[var(--text2)]">
                              {new Date(meal.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Macros */}
                          <div className="flex gap-4 text-xs">
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

                          {/* Items */}
                          {meal.items && meal.items.length > 0 && (
                            <div className="mt-2 text-xs text-[var(--text2)]">
                              {meal.items.map((item) => item.name).join(', ')}
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
                  <p className="text-[var(--text2)] text-center py-10">No lab results available.</p>
                ) : (
                  data.labResults.map((lab) => (
                    <div key={lab.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
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
                                <th className="pb-2 pr-4">Metric</th>
                                <th className="pb-2 pr-4">Value</th>
                                <th className="pb-2">Reference</th>
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
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                {data.healthProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileField label="Name" value={[data.healthProfile.firstName, data.healthProfile.lastName].filter(Boolean).join(' ')} />
                    <ProfileField label="Age" value={data.healthProfile.age} />
                    <ProfileField label="Height" value={data.healthProfile.height ? `${data.healthProfile.height} cm` : undefined} />
                    <ProfileField label="Weight" value={data.healthProfile.weight ? `${data.healthProfile.weight} kg` : undefined} />
                    <ProfileField label="Gender" value={data.healthProfile.gender} />
                    <ProfileField label="Goal" value={data.healthProfile.goal} />
                    <ProfileField label="Daily Calories Target" value={data.healthProfile.dailyCalories ? `${data.healthProfile.dailyCalories} kcal` : undefined} />
                    <ProfileField label="Preferences" value={data.healthProfile.preferences} />
                  </div>
                ) : (
                  <p className="text-[var(--text2)] text-center py-10">No health profile data available.</p>
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
