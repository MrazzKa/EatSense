'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Copy, FileText, KeyRound, RefreshCw, Upload, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES, SPECIALIZATION_KEYS, type Locale, type SpecializationKey } from '@/lib/i18n/messages';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ExpertProfile {
  id: string;
  displayName: string;
  type: string;
  bio: string;
  education: string;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  title?: string;
  isPublished: boolean;
  isVerified: boolean;
  isActive: boolean;
  credentials?: { id: string; name: string; fileUrl: string; status: string }[];
}

interface ExpertAccessCode {
  code: string;
  usageCount: number;
  canUsePublicly: boolean;
}

export default function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [credName, setCredName] = useState('');
  const [accessCode, setAccessCode] = useState<ExpertAccessCode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('nutritionist');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  const populateForm = useCallback((p: ExpertProfile) => {
    setDisplayName(p.displayName || '');
    setType(p.type?.toLowerCase() || 'nutritionist');
    setBio(p.bio || '');
    setEducation(p.education || '');
    setExperienceYears(p.experienceYears || 0);
    setSpecializations(Array.isArray(p.specializations) ? p.specializations : []);
    setLanguages(Array.isArray(p.languages) ? p.languages : []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [data, codeData] = await Promise.all([
          apiFetch('/experts/me/profile'),
          apiFetch('/experts/me/access-code').catch(() => null),
        ]);
        setProfile(data);
        setAccessCode(codeData);
        populateForm(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [populateForm]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiFetch('/experts/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          type,
          bio,
          education,
          experienceYears: Number(experienceYears),
          specializations,
          languages,
        }),
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save:', err);
      alert(t('common', 'saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function toggleChip(list: string[], item: string, setter: (v: string[]) => void) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  }

  async function refreshProfile() {
    const [data, codeData] = await Promise.all([
      apiFetch('/experts/me/profile'),
      apiFetch('/experts/me/access-code').catch(() => null),
    ]);
    setProfile(data);
    setAccessCode(codeData);
  }

  async function handleCopyCode() {
    if (!accessCode?.code) return;
    try {
      await navigator.clipboard.writeText(accessCode.code);
      alert(t('profile', 'codeCopied'));
    } catch {
      window.prompt(t('profile', 'copyCode'), accessCode.code);
    }
  }

  async function handleRegenerateCode() {
    if (!confirm(t('profile', 'regenerateCodeConfirm'))) return;
    try {
      const updated = await apiFetch('/experts/me/access-code/regenerate', { method: 'POST' });
      setAccessCode((prev) => ({ ...(prev || {}), ...updated, usageCount: updated.usageCount ?? 0 }));
    } catch (err) {
      console.error('Failed to regenerate access code:', err);
      alert(t('common', 'error'));
    }
  }

  async function handleCredentialFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!credName.trim()) {
      alert(t('profile', 'credentialNameRequired'));
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      alert(t('profile', 'uploadOnlyImageOrPdf'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert(t('profile', 'uploadMaxSize'));
      return;
    }

    setUploading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/media/upload-document`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const uploaded = await res.json();

      await apiFetch('/experts/me/credentials', {
        method: 'POST',
        body: JSON.stringify({
          name: credName.trim(),
          fileUrl: uploaded.url,
          fileType: uploaded.mimetype,
        }),
      });
      setCredName('');
      await refreshProfile();
    } catch (err) {
      console.error('Credential upload failed:', err);
      alert(t('common', 'uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteCredential(id: string) {
    if (!confirm(t('profile', 'confirmDeleteCredential'))) return;
    try {
      await apiFetch(`/experts/me/credentials/${id}`, { method: 'DELETE' });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to delete credential:', err);
      alert(t('common', 'deleteFailed'));
    }
  }

  async function handleViewCredential(cred: { name: string; fileUrl: string }) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const url = /^https?:\/\//i.test(cred.fileUrl) ? cred.fileUrl : `${API_BASE}${cred.fileUrl}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      console.error('Failed to open credential:', err);
      alert(t('common', 'openFailed'));
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h1 className="text-2xl font-bold">{t('profile', 'title')}</h1>
          {saved && (
            <span className="text-sm text-[var(--green)] font-medium">{t('common', 'saved')}</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-[var(--text2)]">{t('login', 'notExpertBody')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
                    <KeyRound size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{t('profile', 'expertCodeTitle')}</h2>
                    <p className="mt-1 text-sm leading-5 text-[var(--text2)]">{t('profile', 'expertCodeBody')}</p>
                    {accessCode && !accessCode.canUsePublicly && (
                      <p className="mt-2 text-xs text-[var(--yellow)]">{t('profile', 'expertCodeUnavailable')}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <div className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 font-mono text-lg font-bold tracking-[0.12em]">
                    {accessCode?.code || '------'}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text2)]">
                    {t('profile', 'codeUsage')}: {accessCode?.usageCount || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!accessCode?.code}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  <Copy size={16} />
                  {t('profile', 'copyCode')}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface2)]"
                >
                  <RefreshCw size={15} />
                  {t('profile', 'regenerateCode')}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 sm:p-5">
              <h2 className="text-base font-semibold">{t('profile', 'dietsSoonTitle')}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--text2)]">{t('profile', 'dietsSoonBody')}</p>
            </section>

            {/* Display Name */}
            <Field label={t('profile', 'displayName')}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </Field>

            {/* Type */}
            <Field label={t('profile', 'type')}>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                {(['nutritionist', 'dietitian'] as const).map((typeKey) => (
                  <button
                    key={typeKey}
                    onClick={() => setType(typeKey)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition sm:py-2 ${
                      type === typeKey
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {t('profile', typeKey)}
                  </button>
                ))}
              </div>
            </Field>

            {/* Bio */}
            <Field label={t('profile', 'bio')}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="input-field resize-none"
                placeholder={t('profile', 'bioPlaceholder')}
              />
              <p className="text-xs text-[var(--text2)] mt-1">{bio.length} {t('profile', 'characters')}</p>
            </Field>

            {/* Education */}
            <Field label={t('profile', 'education')}>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="input-field"
                placeholder={t('profile', 'educationPlaceholder')}
              />
            </Field>

            {/* Experience */}
            <Field label={t('profile', 'experienceYears')}>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                min={0}
                max={50}
                className="input-field w-24"
              />
            </Field>

            {/* Specializations */}
            <Field label={t('profile', 'specializations')}>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATION_KEYS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleChip(specializations, s, setSpecializations)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition cursor-pointer ${
                      specializations.includes(s)
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {t('specializations', s as SpecializationKey)}
                  </button>
                ))}
              </div>
            </Field>

            {/* Languages */}
            <Field label={t('profile', 'languages')}>
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    onClick={() => toggleChip(languages, l, setLanguages)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition cursor-pointer ${
                      languages.includes(l)
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {t('languageNames', l as Locale)}
                  </button>
                ))}
              </div>
            </Field>

            {/* Credentials */}
            <Field label={t('profile', 'credentials')}>
              <div className="space-y-2">
                {(profile.credentials || []).map((cred) => (
                  <div key={cred.id} className="flex flex-col gap-3 rounded-lg bg-[var(--surface2)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={16} className="text-[var(--text2)] shrink-0" />
                      <span className="text-sm truncate">{cred.name}</span>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cred.status === 'approved' ? 'bg-[#22c55e22] text-[var(--green)]' :
                        cred.status === 'rejected' ? 'bg-[#ef444422] text-[var(--red)]' :
                        'bg-[#f59e0b22] text-[var(--yellow)]'
                      }`}>
                        {cred.status === 'approved' ? t('common', 'approved') :
                         cred.status === 'rejected' ? t('common', 'rejected') :
                         t('common', 'pending')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewCredential(cred)}
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]"
                      >
                        {t('common', 'view')}
                      </button>
                      <button
                        onClick={() => handleDeleteCredential(cred.id)}
                        title={t('common', 'delete')}
                        className="p-1 rounded-md hover:bg-[var(--surface)] hover:text-[var(--red)] transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 bg-[var(--surface2)] border border-dashed border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text2)] mb-3">
                  {t('profile', 'credentialsHint')}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={credName}
                    onChange={(e) => setCredName(e.target.value)}
                    placeholder={t('profile', 'credentialNamePlaceholder')}
                    className="input-field flex-1"
                    disabled={uploading}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleCredentialFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !credName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Upload size={16} />
                    {uploading ? t('common', 'uploading') : t('common', 'upload')}
                  </button>
                </div>
              </div>
            </Field>

            {/* Save button */}
            <div className="pt-4 border-t border-[var(--border)]">
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="w-full rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? t('common', 'saving') : t('common', 'save')}
              </button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text2)] mb-2">{label}</label>
      {children}
    </div>
  );
}
