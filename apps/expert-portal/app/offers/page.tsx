'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { OFFER_LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/messages';

type OfferFormat =
  | 'CHAT_CONSULTATION'
  | 'MEAL_PLAN'
  | 'REPORT_REVIEW'
  | 'MONTHLY_SUPPORT'
  | 'CUSTOM';

const FORMATS: OfferFormat[] = [
  'CHAT_CONSULTATION',
  'MEAL_PLAN',
  'REPORT_REVIEW',
  'MONTHLY_SUPPORT',
  'CUSTOM',
];

interface Offer {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string> | null;
  format: OfferFormat;
  priceType: 'FREE' | 'FIXED' | 'FROM' | 'CONTACT';
  priceAmount?: number | null;
  currency: string;
  durationDays?: number | null;
  isPublished: boolean;
  sortOrder: number;
}

type LocalizedText = Partial<Record<Locale, string>>;

interface OfferFormState {
  name: LocalizedText;
  description: LocalizedText;
  format: OfferFormat;
  durationDays: string;
}

const EMPTY_FORM: OfferFormState = {
  name: {},
  description: {},
  format: 'CHAT_CONSULTATION',
  durationDays: '',
};

function pickLocalized(map: Record<string, string> | null | undefined, preferred: Locale): string {
  if (!map) return '';
  if (map[preferred]) return map[preferred];
  for (const l of OFFER_LOCALES) {
    if (map[l]) return map[l];
  }
  const first = Object.values(map).find(Boolean);
  return first || '';
}

export default function OffersPage() {
  const { t, locale } = useI18n();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<OfferFormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Offer[]>('/experts/me/offers');
      setOffers(data);
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setActiveTab(locale);
    setCreating(true);
  }

  function openEdit(offer: Offer) {
    setEditing(offer);
    setCreating(false);
    const nameMap: LocalizedText = {};
    const descMap: LocalizedText = {};
    for (const l of OFFER_LOCALES) {
      if (offer.name?.[l]) nameMap[l] = offer.name[l];
      if (offer.description?.[l]) descMap[l] = offer.description[l];
    }
    setForm({
      name: nameMap,
      description: descMap,
      format: offer.format,
      durationDays: offer.durationDays ? String(offer.durationDays) : '',
    });
    setActiveTab(locale);
  }

  function closeEditor() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function updateLocalized(field: 'name' | 'description', loc: Locale, value: string) {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [loc]: value } }));
  }

  async function handleSave() {
    const nonEmptyName: Record<string, string> = {};
    for (const l of OFFER_LOCALES) {
      const v = (form.name[l] || '').trim();
      if (v) nonEmptyName[l] = v;
    }
    if (Object.keys(nonEmptyName).length === 0) {
      alert(t('offers', 'nameRequired'));
      return;
    }
    const nonEmptyDesc: Record<string, string> = {};
    for (const l of OFFER_LOCALES) {
      const v = (form.description[l] || '').trim();
      if (v) nonEmptyDesc[l] = v;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: nonEmptyName,
        format: form.format,
        priceType: 'FREE',
      };
      if (Object.keys(nonEmptyDesc).length > 0) body.description = nonEmptyDesc;
      const duration = parseInt(form.durationDays, 10);
      if (!isNaN(duration) && duration > 0) body.durationDays = duration;

      if (editing) {
        await apiFetch(`/experts/me/offers/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/experts/me/offers', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      await load();
      closeEditor();
    } catch (err) {
      console.error('Failed to save offer:', err);
      alert(t('common', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(offer: Offer) {
    try {
      await apiFetch(`/experts/me/offers/${offer.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ isPublished: !offer.isPublished }),
      });
      await load();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
      alert(t('offers', 'togglePublishFailed'));
    }
  }

  async function handleDelete(offer: Offer) {
    if (!confirm(t('offers', 'confirmDelete'))) return;
    try {
      await apiFetch(`/experts/me/offers/${offer.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      console.error('Failed to delete offer:', err);
      alert(t('common', 'deleteFailed'));
    }
  }

  const editorOpen = creating || editing !== null;

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('offers', 'title')}</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold rounded-lg transition cursor-pointer"
          >
            <Plus size={16} />
            {t('offers', 'newOffer')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : offers.length === 0 && !editorOpen ? (
          <div className="text-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <Package size={40} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--text2)]" />
            <p className="text-[var(--text2)] mb-1">{t('offers', 'empty')}</p>
            <p className="text-sm text-[var(--text2)]">{t('offers', 'emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const displayName = pickLocalized(offer.name, locale);
              const displayDesc = pickLocalized(offer.description, locale);
              return (
                <div
                  key={offer.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{displayName || '—'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          offer.isPublished
                            ? 'bg-[#22c55e22] text-[var(--green)]'
                            : 'bg-[var(--surface2)] text-[var(--text2)]'
                        }`}>
                          {offer.isPublished ? t('common', 'published') : t('common', 'draft')}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text2)] flex items-center gap-2 flex-wrap">
                        <span>{t('formats', offer.format)}</span>
                        {offer.durationDays ? <span>· {offer.durationDays} {t('offers', 'duration').toLowerCase().match(/\w+/)?.[0] || ''}</span> : null}
                        <span>· {t('offers', 'free')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => togglePublish(offer)}
                        title={offer.isPublished ? t('common', 'hidden') : t('common', 'visible')}
                        className="p-2 rounded-lg hover:bg-[var(--surface2)] transition cursor-pointer"
                      >
                        {offer.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => openEdit(offer)}
                        title={t('common', 'edit')}
                        className="p-2 rounded-lg hover:bg-[var(--surface2)] transition cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(offer)}
                        title={t('common', 'delete')}
                        className="p-2 rounded-lg hover:bg-[var(--surface2)] hover:text-[var(--red)] transition cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {displayDesc && (
                    <p className="text-sm text-[var(--text2)] mt-2">{displayDesc}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {editorOpen && (
          <div className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? t('offers', 'edit') : t('offers', 'create')}</h2>

            <div className="space-y-4">
              {/* Locale tabs */}
              <div>
                <div className="flex gap-1 mb-3 border-b border-[var(--border)]">
                  {OFFER_LOCALES.map((l) => {
                    const hasName = !!(form.name[l] || '').trim();
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setActiveTab(l)}
                        className={`px-3 py-2 text-xs font-medium transition cursor-pointer -mb-px border-b-2 ${
                          activeTab === l
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'
                        }`}
                      >
                        {LOCALE_LABELS[l]}
                        {hasName && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--green)]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text2)] mb-1">
                      {t('offers', 'nameFor').replace('{lang}', LOCALE_LABELS[activeTab])}
                    </label>
                    <input
                      type="text"
                      value={form.name[activeTab] || ''}
                      onChange={(e) => updateLocalized('name', activeTab, e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text2)] mb-1">
                      {t('offers', 'descriptionFor').replace('{lang}', LOCALE_LABELS[activeTab])}
                    </label>
                    <textarea
                      value={form.description[activeTab] || ''}
                      onChange={(e) => updateLocalized('description', activeTab, e.target.value)}
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text2)] mb-2">{t('offers', 'format')}</label>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setForm({ ...form, format: f })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition cursor-pointer ${
                        form.format === f
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                          : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]'
                      }`}
                    >
                      {t('formats', f)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text2)] mb-1">{t('offers', 'duration')}</label>
                <input
                  type="number"
                  min={1}
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  placeholder="7"
                  className="input-field w-32"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition cursor-pointer"
                >
                  {saving ? t('common', 'saving') : editing ? t('common', 'save') : t('common', 'create')}
                </button>
                <button
                  onClick={closeEditor}
                  disabled={saving}
                  className="px-5 py-2 text-[var(--text2)] hover:text-[var(--text)] font-medium rounded-lg transition cursor-pointer"
                >
                  {t('common', 'cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .input-field {
          width: 100%;
          padding: 10px 14px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: var(--primary);
        }
        .input-field::placeholder {
          color: var(--text2);
        }
      `}</style>
    </AppShell>
  );
}
