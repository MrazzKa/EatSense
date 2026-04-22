'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2 } from 'lucide-react';
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

export default function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [credName, setCredName] = useState('');
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
    setSpecializations(p.specializations || []);
    setLanguages(p.languages || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/experts/me/profile');
        setProfile(data);
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
    const data = await apiFetch('/experts/me/profile');
    setProfile(data);
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

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
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
              <div className="flex gap-3">
                {(['nutritionist', 'dietitian'] as const).map((typeKey) => (
                  <button
                    key={typeKey}
                    onClick={() => setType(typeKey)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition cursor-pointer ${
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
                  <div key={cred.id} className="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={16} className="text-[var(--text2)] shrink-0" />
                      <span className="text-sm truncate">{cred.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cred.status === 'approved' ? 'bg-[#22c55e22] text-[var(--green)]' :
                        cred.status === 'rejected' ? 'bg-[#ef444422] text-[var(--red)]' :
                        'bg-[#f59e0b22] text-[var(--yellow)]'
                      }`}>
                        {cred.status === 'approved' ? t('common', 'approved') :
                         cred.status === 'rejected' ? t('common', 'rejected') :
                         t('common', 'pending')}
                      </span>
                      <a
                        href={cred.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]"
                      >
                        {t('common', 'view')}
                      </a>
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
                className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
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
