'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';

const SPECIALIZATIONS = [
  'weightManagement', 'sportsNutrition', 'clinicalNutrition', 'pediatricNutrition',
  'eatingDisorders', 'diabetesManagement', 'foodAllergies', 'vegetarianVegan',
  'pregnancyNutrition', 'geriatricNutrition', 'gutHealth', 'mentalHealthNutrition',
];

const LANGUAGES = ['en', 'ru', 'kk', 'fr', 'de', 'es'];

const SPEC_LABELS: Record<string, string> = {
  weightManagement: 'Weight Management',
  sportsNutrition: 'Sports Nutrition',
  clinicalNutrition: 'Clinical Nutrition',
  pediatricNutrition: 'Pediatric Nutrition',
  eatingDisorders: 'Eating Disorders',
  diabetesManagement: 'Diabetes Management',
  foodAllergies: 'Food Allergies',
  vegetarianVegan: 'Vegetarian & Vegan',
  pregnancyNutrition: 'Pregnancy Nutrition',
  geriatricNutrition: 'Geriatric Nutrition',
  gutHealth: 'Gut Health',
  mentalHealthNutrition: 'Mental Health & Nutrition',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', ru: 'Russian', kk: 'Kazakh', fr: 'French', de: 'German', es: 'Spanish',
};

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
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      alert('Failed to save profile. Please try again.');
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

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          {saved && (
            <span className="text-sm text-[var(--green)] font-medium">Saved!</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-[var(--text2)]">No expert profile found. Register as an expert in the EatSense app.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Display Name */}
            <Field label="Display Name">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </Field>

            {/* Type */}
            <Field label="Type">
              <div className="flex gap-3">
                {['nutritionist', 'dietitian'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition cursor-pointer ${
                      type === t
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            {/* Bio */}
            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="input-field resize-none"
                placeholder="Tell clients about your expertise and approach..."
              />
              <p className="text-xs text-[var(--text2)] mt-1">{bio.length} characters</p>
            </Field>

            {/* Education */}
            <Field label="Education">
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="input-field"
                placeholder="e.g. MSc in Nutrition Science, ETH Zurich"
              />
            </Field>

            {/* Experience */}
            <Field label="Years of Experience">
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
            <Field label="Specializations">
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleChip(specializations, s, setSpecializations)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition cursor-pointer ${
                      specializations.includes(s)
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {SPEC_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </Field>

            {/* Languages */}
            <Field label="Languages">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => toggleChip(languages, l, setLanguages)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition cursor-pointer ${
                      languages.includes(l)
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--text2)]'
                    }`}
                  >
                    {LANG_LABELS[l] || l}
                  </button>
                ))}
              </div>
            </Field>

            {/* Credentials (read-only) */}
            {profile.credentials && profile.credentials.length > 0 && (
              <Field label="Credentials">
                <div className="space-y-2">
                  {profile.credentials.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between bg-[var(--surface2)] rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">📄</span>
                        <span className="text-sm">{cred.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          cred.status === 'approved' ? 'bg-[#22c55e22] text-[var(--green)]' :
                          cred.status === 'rejected' ? 'bg-[#ef444422] text-[var(--red)]' :
                          'bg-[#f59e0b22] text-[var(--yellow)]'
                        }`}>
                          {cred.status}
                        </span>
                        <a
                          href={cred.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text2)] mt-2">
                  To upload new credentials, use the EatSense mobile app.
                </p>
              </Field>
            )}

            {/* Save button */}
            <div className="pt-4 border-t border-[var(--border)]">
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
