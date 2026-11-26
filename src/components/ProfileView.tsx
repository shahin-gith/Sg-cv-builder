import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  SINGAPORE_CREDENTIAL_PRESETS,
  SINGAPORE_SECTOR_QUICK_SKILLS,
} from '../data/singaporeOccupations';
import { RewriteAction, UserProfile } from '../types/cv';
import { generateId } from '../utils/cvLogic';
import {
  getFirebaseStatusSummary,
  saveProfileDraft,
} from '../services/storageService';
import { AIWritingModal } from './AIWritingModal';
import { FieldHint } from './FieldHint';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
  onResetDemo: () => void;
  showFieldGuides: boolean;
  onToggleFieldGuides: () => void;
  autoSaveLabel: string;
}

type ProfileTab =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'additional';

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onResetDemo,
  showFieldGuides,
  onToggleFieldGuides,
  autoSaveLabel,
}) => {
  const [draft, setDraft] = useState<UserProfile>(structuredClone(profile));
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [savedNotice, setSavedNotice] = useState(false);
  const [newSkill, setNewSkill] = useState({ technical: '', soft: '', industry: '' });

  const [aiModal, setAiModal] = useState<{
    open: boolean;
    title: string;
    initialText: string;
    action: RewriteAction;
    onApply: (text: string, skills?: string[]) => void;
  } | null>(null);

  const storageStatus = getFirebaseStatusSummary();

  // Persist every input step immediately on this device (no account required)
  useEffect(() => {
    saveProfileDraft(draft);
  }, [draft]);

  // Commit draft to master profile every 1 minute (60,000 ms) automatically
  useEffect(() => {
    const timer = setInterval(() => {
      onSaveProfile(draft);
    }, 60000);
    return () => clearInterval(timer);
  }, [draft, onSaveProfile]);

  const handleSave = () => {
    onSaveProfile(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 420;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setDraft((prev) => ({
            ...prev,
            personal: { ...prev.personal, photoUrl: dataUrl },
          }));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const moveExperience = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.experience.length) return;
    const next = [...draft.experience];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setDraft((prev) => ({ ...prev, experience: next }));
  };

  const addSkill = (category: 'technical' | 'soft' | 'industry') => {
    const val = newSkill[category].trim();
    if (!val) return;
    if (!draft.skills[category].includes(val)) {
      setDraft((prev) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [category]: [...prev.skills[category], val],
        },
      }));
    }
    setNewSkill((prev) => ({ ...prev, [category]: '' }));
  };

  const removeSkill = (category: 'technical' | 'soft' | 'industry', idx: number) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((_, i) => i !== idx),
      },
    }));
  };

  const [presetSector, setPresetSector] = useState<string>('Construction');

  const tabs: Array<{
    id: ProfileTab;
    label: string;
    activeClass: string;
  }> = [
    {
      id: 'personal',
      label: '1. Personal Info',
      activeClass: 'bg-sky-100 text-sky-900 border border-sky-300 shadow-xs',
    },
    {
      id: 'summary',
      label: '2. Summary & Objective',
      activeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-xs',
    },
    {
      id: 'experience',
      label: `3. Work Experience (${draft.experience.length})`,
      activeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs',
    },
    {
      id: 'education',
      label: `4. Education (${draft.education.length})`,
      activeClass: 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs',
    },
    {
      id: 'skills',
      label: '5. Skills',
      activeClass: 'bg-violet-100 text-violet-900 border border-violet-300 shadow-xs',
    },
    {
      id: 'additional',
      label: '6. Licences & Certs',
      activeClass: 'bg-teal-100 text-teal-900 border border-teal-300 shadow-xs',
    },
  ];

  const tabOrder: ProfileTab[] = ['personal', 'summary', 'experience', 'education', 'skills', 'additional'];
  const currentTabIdx = tabOrder.indexOf(activeTab);
  const nextTab = currentTabIdx >= 0 && currentTabIdx < tabOrder.length - 1 ? tabOrder[currentTabIdx + 1] : null;

  const tabPanelBg: Record<ProfileTab, string> = {
    personal: 'border-sky-200 bg-sky-50/45',
    summary: 'border-indigo-200 bg-indigo-50/45',
    experience: 'border-emerald-200 bg-emerald-50/45',
    education: 'border-amber-200 bg-amber-50/45',
    skills: 'border-violet-200 bg-violet-50/45',
    additional: 'border-teal-200 bg-teal-50/45',
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Smart Master Profile
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Auto-fills every new CV · {storageStatus.providerLabel} · {autoSaveLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleFieldGuides}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs font-semibold text-slate-800 hover:bg-sky-50 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            Hints: {showFieldGuides ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => {
              onResetDemo();
              setTimeout(() => window.location.reload(), 100);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Sample
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          Profile saved and ready for prefill.
        </div>
      )}

      {/* Color-Coded Step Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white border border-sky-100 rounded-2xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? t.activeClass
                : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`border rounded-2xl p-6 space-y-6 ${tabPanelBg[activeTab]}`}>
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
              {draft.personal.photoUrl ? (
                <img
                  src={draft.personal.photoUrl}
                  alt="Profile preview"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-500">
                  {(draft.personal.fullName || 'CV').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">
                  Profile Photo (Optional — supports photo & no-photo templates)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  {draft.personal.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          personal: { ...p.personal, photoUrl: '' },
                        }))
                      }
                      className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(
                [
                  ['fullName', 'Full Name *', 'e.g., Arifur Rahman'],
                  ['professionalTitle', 'Professional Title *', 'e.g., Senior Electrical Technician'],
                  ['phone', 'Phone Number *', 'e.g., +65 8412 3904'],
                  ['email', 'Email Address *', 'e.g., name@example.com'],
                  ['address', 'Address (Optional)', 'e.g., Jurong West, Singapore'],
                  ['nationality', 'Nationality (Optional)', 'e.g., Bangladeshi / Singapore PR'],
                  ['dateOfBirth', 'Date of Birth (Optional)', 'YYYY-MM-DD'],
                  ['linkedin', 'LinkedIn Profile', 'linkedin.com/in/username'],
                  ['website', 'Personal Website / Portfolio', 'https://...'],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field} className="rounded-xl border border-sky-200/80 bg-white/85 p-3.5">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {label}
                  </label>
                  <input
                    type={field === 'dateOfBirth' ? 'date' : 'text'}
                    value={draft.personal[field]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        personal: { ...prev.personal, [field]: e.target.value },
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <FieldHint guideKey={field} visible={showFieldGuides} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-medium text-slate-900">
                  Professional Profile Summary
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAiModal({
                        open: true,
                        title: 'বাংলা → English Summary & AI Formatter',
                        initialText: draft.summary,
                        action: 'bengali-to-english',
                        onApply: (text) =>
                          setDraft((prev) => ({ ...prev, summary: text })),
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    বাংলা → English AI সাজান
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAiModal({
                        open: true,
                        title: 'AI Summary Assistant',
                        initialText: draft.summary,
                        action: 'summary',
                        onApply: (text) =>
                          setDraft((prev) => ({ ...prev, summary: text })),
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
                  >
                    Improve English
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={draft.summary}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Write in English or Bengali (বাংলায় লিখলেও AI ইংরেজিতে সাজিয়ে দিবে)..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <FieldHint guideKey="summary" visible={showFieldGuides} />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-medium text-slate-900">
                  Career Objective
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setAiModal({
                      open: true,
                      title: 'AI Career Objective (English / বাংলা)',
                      initialText: draft.careerObjective,
                      action: 'objective',
                      onApply: (text) =>
                        setDraft((prev) => ({ ...prev, careerObjective: text })),
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  বাংলা → English AI সাজান
                </button>
              </div>
              <textarea
                rows={3}
                value={draft.careerObjective}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    careerObjective: e.target.value,
                  }))
                }
                placeholder="State your target role in English or Bengali..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <FieldHint guideKey="careerObjective" visible={showFieldGuides} />
            </div>
          </div>
        )}

        {activeTab === 'experience' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-emerald-950">Work History</h2>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    experience: [
                      {
                        id: generateId('exp'),
                        company: '',
                        jobTitle: '',
                        location: 'Singapore',
                        startDate: '',
                        endDate: '',
                        current: false,
                        responsibilities: '',
                        achievements: '',
                      },
                      ...prev.experience,
                    ],
                  }))
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Work Experience
              </button>
            </div>

            {draft.experience.map((exp, idx) => (
              <div
                key={exp.id}
                className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {exp.jobTitle || `Position ${idx + 1}`}
                    {exp.company ? ` · ${exp.company}` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveExperience(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move experience up"
                      className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExperience(idx, 1)}
                      disabled={idx === draft.experience.length - 1}
                      aria-label="Move experience down"
                      className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.filter((x) => x.id !== exp.id),
                        }))
                      }
                      aria-label="Delete experience"
                      className="p-1.5 rounded border border-slate-200 bg-white text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={exp.jobTitle}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id ? { ...x, jobTitle: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="jobTitle" visible={showFieldGuides} showBengali={false} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id ? { ...x, company: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="company" visible={showFieldGuides} showBengali={false} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id ? { ...x, location: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="location" visible={showFieldGuides} showBengali={false} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="month"
                      value={exp.startDate}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id ? { ...x, startDate: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="month"
                      disabled={exp.current}
                      value={exp.current ? '' : exp.endDate}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id ? { ...x, endDate: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </div>
                  <label className="flex items-center gap-2 py-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((x) =>
                            x.id === exp.id
                              ? {
                                  ...x,
                                  current: e.target.checked,
                                  endDate: e.target.checked ? '' : x.endDate,
                                }
                              : x
                          ),
                        }))
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                    Currently Working Here
                  </label>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      Responsibilities (one per line)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setAiModal({
                            open: true,
                            title: `বাংলা → English — ${exp.jobTitle || 'Responsibilities'}`,
                            initialText: exp.responsibilities,
                            action: 'bengali-to-english',
                            onApply: (text) =>
                              setDraft((prev) => ({
                                ...prev,
                                experience: prev.experience.map((x) =>
                                  x.id === exp.id
                                    ? { ...x, responsibilities: text }
                                    : x
                                ),
                              })),
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                      >
                        <Sparkles className="w-3 h-3" />
                        বাংলা → English AI সাজান
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={exp.responsibilities}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        experience: prev.experience.map((x) =>
                          x.id === exp.id
                            ? { ...x, responsibilities: e.target.value }
                            : x
                        ),
                      }))
                    }
                    placeholder="Write duties in English or Bengali..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <FieldHint guideKey="responsibilities" visible={showFieldGuides} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Key Achievements (one per line)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setAiModal({
                          open: true,
                          title: `AI Format Achievements — ${exp.jobTitle || 'Role'}`,
                          initialText: exp.achievements,
                          action: 'bengali-to-english',
                          onApply: (text) =>
                            setDraft((prev) => ({
                              ...prev,
                              experience: prev.experience.map((x) =>
                                x.id === exp.id ? { ...x, achievements: text } : x
                              ),
                            })),
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                    >
                      <Sparkles className="w-3 h-3" />
                      বাংলা → English AI সাজান
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={exp.achievements}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        experience: prev.experience.map((x) =>
                          x.id === exp.id ? { ...x, achievements: e.target.value } : x
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <FieldHint guideKey="achievements" visible={showFieldGuides} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Include diplomas, degrees, or trade certificates.
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      {
                        id: generateId('edu'),
                        institution: '',
                        qualification: '',
                        fieldOfStudy: '',
                        startDate: '',
                        graduationDate: '',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education
              </button>
            </div>
            <FieldHint guideKey="education" visible={showFieldGuides} />
            {draft.education.map((edu) => (
              <div
                key={edu.id}
                className="border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, institution: e.target.value } : x
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Qualification / Certificate
                  </label>
                  <input
                    type="text"
                    value={edu.qualification}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, qualification: e.target.value } : x
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={edu.fieldOfStudy}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, fieldOfStudy: e.target.value } : x
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="month"
                      value={edu.startDate}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id ? { ...x, startDate: e.target.value } : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Graduation
                    </label>
                    <input
                      type="month"
                      value={edu.graduationDate}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id
                              ? { ...x, graduationDate: e.target.value }
                              : x
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        education: p.education.filter((x) => x.id !== edu.id),
                      }))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Entry
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Organize skills into Technical, Industry & Safety, and Soft skills.
              </p>
              <button
                type="button"
                onClick={() => {
                  const expSummary = draft.experience
                    .map((e) => `${e.jobTitle}: ${e.responsibilities}`)
                    .join('\n');
                  setAiModal({
                    open: true,
                    title: 'Suggest Relevant Skills from Experience',
                    initialText: expSummary || draft.summary,
                    action: 'suggest-skills',
                    onApply: (_text, skills) => {
                      if (skills && skills.length > 0) {
                        setDraft((prev) => ({
                          ...prev,
                          skills: {
                            ...prev.skills,
                            technical: Array.from(
                              new Set([...prev.skills.technical, ...skills])
                            ),
                          },
                        }));
                      }
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Suggest Skills from My Experience
              </button>
            </div>
            <FieldHint guideKey="skills" visible={showFieldGuides} />

            <div className="rounded-xl border border-violet-200 bg-white/90 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-violet-950">
                  Quick-Add Singapore Sector Skills (১ ক্লিকে যুক্ত করুন)
                </div>
                <select
                  value={presetSector}
                  onChange={(e) => setPresetSector(e.target.value)}
                  aria-label="Choose Singapore skill sector"
                  className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-950"
                >
                  {Object.keys(SINGAPORE_SECTOR_QUICK_SKILLS).map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(SINGAPORE_SECTOR_QUICK_SKILLS[presetSector] ?? []).map((skill) => {
                  const exists = draft.skills.technical.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      disabled={exists}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          skills: {
                            ...prev.skills,
                            technical: [...prev.skills.technical, skill],
                          },
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        exists
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-violet-50/70 border-violet-200 text-violet-900 hover:bg-violet-100'
                      }`}
                    >
                      {exists ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {(
              [
                ['technical', 'Technical Skills'],
                ['industry', 'Industry & Safety Skills'],
                ['soft', 'Soft & Interpersonal Skills'],
              ] as const
            ).map(([cat, label]) => (
              <div key={cat} className="space-y-2.5 rounded-xl border border-violet-200/80 bg-white/85 p-4">
                <label className="block text-sm font-bold text-slate-900">
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill[cat]}
                    onChange={(e) =>
                      setNewSkill((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill(cat);
                      }
                    }}
                    placeholder={`Add a ${label.toLowerCase()} item...`}
                    className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addSkill(cat)}
                    className="px-4 py-2 rounded-lg bg-violet-700 text-white text-xs font-semibold hover:bg-violet-800"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.skills[cat].map((item, idx) => (
                    <span
                      key={`${cat}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-xs font-medium text-slate-800 border border-violet-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeSkill(cat, idx)}
                        aria-label={`Remove ${item}`}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="space-y-8">
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Driving Licence
              </h3>
              <FieldHint guideKey="drivingLicence" visible={showFieldGuides} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={draft.drivingLicence.classes}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      drivingLicence: {
                        ...p.drivingLicence,
                        classes: e.target.value,
                      },
                    }))
                  }
                  placeholder="Licence classes (e.g., Singapore Class 3 / Class 4)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={draft.drivingLicence.issuingCountry}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      drivingLicence: {
                        ...p.drivingLicence,
                        issuingCountry: e.target.value,
                      },
                    }))
                  }
                  placeholder="Issuing Country"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={draft.drivingLicence.notes}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      drivingLicence: {
                        ...p.drivingLicence,
                        notes: e.target.value,
                      },
                    }))
                  }
                  placeholder="Notes (e.g., Clean driving record, Forklift certified)"
                  className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3 pb-6 border-b border-teal-200/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Certifications &amp; Singapore Trade Tickets
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      certifications: [
                        ...p.certifications,
                        {
                          id: generateId('cert'),
                          name: '',
                          issuer: '',
                          date: '',
                          credentialId: '',
                        },
                      ],
                    }))
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  + Add Certification
                </button>
              </div>
              <FieldHint guideKey="certifications" visible={showFieldGuides} />
              <div className="rounded-xl border border-teal-200 bg-white/90 p-3.5 space-y-2">
                <div className="text-xs font-bold text-teal-950">
                  1-Click Singapore Certificates (সিঙ্গাপুরের জরুরি সার্টিফিকেট যুক্ত করুন)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SINGAPORE_CREDENTIAL_PRESETS.map((preset) => {
                    const added = draft.certifications.some(
                      (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                    );
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={added}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            certifications: [
                              ...p.certifications,
                              {
                                id: generateId('cert'),
                                name: preset.name,
                                issuer: preset.issuer,
                                date: '',
                                credentialId: '',
                              },
                            ],
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          added
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-teal-50/70 border-teal-200 text-teal-900 hover:bg-teal-100'
                        }`}
                      >
                        {added ? `✓ ${preset.name.slice(0, 34)}` : `+ ${preset.name.slice(0, 34)}`}
                      </button>
                    );
                  })}
                </div>
              </div>
              {draft.certifications.map((c) => (
                <div key={c.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        certifications: p.certifications.map((x) =>
                          x.id === c.id ? { ...x, name: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Certification Name"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={c.issuer}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        certifications: p.certifications.map((x) =>
                          x.id === c.id ? { ...x, issuer: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Issuer (e.g., BCA / MOM)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="month"
                    value={c.date}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        certifications: p.certifications.map((x) =>
                          x.id === c.id ? { ...x, date: e.target.value } : x
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={c.credentialId}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          certifications: p.certifications.map((x) =>
                            x.id === c.id
                              ? { ...x, credentialId: e.target.value }
                              : x
                          ),
                        }))
                      }
                      placeholder="Credential ID"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          certifications: p.certifications.filter((x) => x.id !== c.id),
                        }))
                      }
                      className="text-xs text-red-600 px-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Languages</h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      languages: [
                        ...p.languages,
                        { id: generateId('lang'), language: '', proficiency: '' },
                      ],
                    }))
                  }
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  + Add Language
                </button>
              </div>
              <FieldHint guideKey="languages" visible={showFieldGuides} />
              {draft.languages.map((l) => (
                <div key={l.id} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <input
                    type="text"
                    value={l.language}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.map((x) =>
                          x.id === l.id ? { ...x, language: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Language (e.g., English)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={l.proficiency}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.map((x) =>
                          x.id === l.id ? { ...x, proficiency: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Proficiency (e.g., Native / B2 / Fluent)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.filter((x) => x.id !== l.id),
                      }))
                    }
                    className="text-xs text-red-600 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Safety & Technical Training
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      training: [
                        ...p.training,
                        { id: generateId('trn'), title: '', provider: '', date: '', details: '' },
                      ],
                    }))
                  }
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  + Add Training
                </button>
              </div>
              <FieldHint guideKey="training" visible={showFieldGuides} />
              {draft.training.map((t) => (
                <div key={t.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={t.title}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        training: p.training.map((x) =>
                          x.id === t.id ? { ...x, title: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Course Title"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={t.provider}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        training: p.training.map((x) =>
                          x.id === t.id ? { ...x, provider: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Provider"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="month"
                      value={t.date}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          training: p.training.map((x) =>
                            x.id === t.id ? { ...x, date: e.target.value } : x
                          ),
                        }))
                      }
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          training: p.training.filter((x) => x.id !== t.id),
                        }))
                      }
                      className="text-xs text-red-600 px-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        projects: [
                          ...p.projects,
                          { id: generateId('proj'), name: '', role: '', date: '', description: '' },
                        ],
                      }))
                    }
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    + Add Project
                  </button>
                </div>
                <FieldHint guideKey="projects" visible={showFieldGuides} />
                {draft.projects.map((proj) => (
                  <div key={proj.id} className="space-y-2 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          projects: p.projects.map((x) =>
                            x.id === proj.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Project Name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setAiModal({
                            open: true,
                            title: `বাংলা → English — ${proj.name || 'Project'}`,
                            initialText: proj.description,
                            action: 'bengali-to-english',
                            onApply: (text) =>
                              setDraft((p) => ({
                                ...p,
                                projects: p.projects.map((x) =>
                                  x.id === proj.id ? { ...x, description: text } : x
                                ),
                              })),
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700"
                      >
                        <Sparkles className="w-3 h-3" />
                        বাংলা → English AI সাজান
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          projects: p.projects.map((x) =>
                            x.id === proj.id ? { ...x, description: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Project scope & result (English or Bengali)..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          projects: p.projects.filter((x) => x.id !== proj.id),
                        }))
                      }
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">References</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        references: [
                          ...p.references,
                          { id: generateId('ref'), name: '', title: '', company: '', contact: '' },
                        ],
                      }))
                    }
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    + Add Reference
                  </button>
                </div>
                <FieldHint guideKey="references" visible={showFieldGuides} />
                {draft.references.map((r) => (
                  <div key={r.id} className="space-y-2 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          references: p.references.map((x) =>
                            x.id === r.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Referee Name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={r.title}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            references: p.references.map((x) =>
                              x.id === r.id ? { ...x, title: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Title"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={r.company}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            references: p.references.map((x) =>
                              x.id === r.id ? { ...x, company: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Company"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={r.contact}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          references: p.references.map((x) =>
                            x.id === r.id ? { ...x, contact: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Contact or 'Available upon request'"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          references: p.references.filter((x) => x.id !== r.id),
                        }))
                      }
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100"
          >
            <Save className="w-3.5 h-3.5" />
            Save Step
          </button>
          {nextTab && (
            <button
              type="button"
              onClick={() => {
                onSaveProfile(draft);
                setActiveTab(nextTab);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
            >
              Save &amp; Continue →
            </button>
          )}
        </div>
      </div>

      {aiModal?.open && (
        <AIWritingModal
          isOpen={aiModal.open}
          onClose={() => setAiModal(null)}
          title={aiModal.title}
          initialText={aiModal.initialText}
          defaultAction={aiModal.action}
          context={{
            jobTitle: draft.personal.professionalTitle,
            experienceText: draft.experience
              .map((e) => `${e.jobTitle} at ${e.company}: ${e.responsibilities}`)
              .join('\n'),
          }}
          onApply={aiModal.onApply}
        />
      )}
    </div>
  );
};
