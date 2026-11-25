import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Cloud,
  FilePlus2,
  FileText,
  FileUp,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { auth, firebaseProjectId, signOutFirebase } from './firebase';
import { AIAssistantView } from './components/AIAssistantView';
import { AuthOtpModal } from './components/AuthOtpModal';
import { CreateCVModal } from './components/CreateCVModal';
import { CVEditorView } from './components/CVEditorView';
import { CVReviewView } from './components/CVReviewView';
import { DashboardView } from './components/DashboardView';
import { ImportPdfModal } from './components/ImportPdfModal';
import { ProfileView } from './components/ProfileView';
import { TemplateGalleryView } from './components/TemplateGalleryView';
import {
  bootstrapUserCloudData,
  deleteCVFromFirestore,
  saveCVToFirestore,
  saveUserProfileToFirestore,
  subscribeToUserCVs,
} from './services/firestoreService';
import {
  loadCVs,
  loadProfile,
  loadWorkspaceState,
  resetDemoData,
  saveCVs,
  saveProfile,
  saveProfileDraft,
  saveWorkspaceState,
} from './services/storageService';
import { CVDocument, TemplateId, UserProfile } from './types/cv';
import { cloneProfileToCV, duplicateCV, renameCV } from './utils/cvLogic';

type AppView =
  | 'dashboard'
  | 'cvs'
  | 'templates'
  | 'profile'
  | 'ai-assistant'
  | 'review'
  | 'editor';

const VALID_VIEWS: AppView[] = [
  'dashboard',
  'cvs',
  'templates',
  'profile',
  'ai-assistant',
  'review',
  'editor',
];

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function App() {
  const initialWorkspace = useRef(loadWorkspaceState());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [cvs, setCvs] = useState<CVDocument[]>(() => loadCVs());
  const [activeCvId, setActiveCvId] = useState<string | null>(
    () => initialWorkspace.current.activeCvId
  );
  const [view, setView] = useState<AppView>(() => {
    const saved = initialWorkspace.current.activeView as AppView;
    if (VALID_VIEWS.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });
  const [showFieldGuides, setShowFieldGuides] = useState<boolean>(
    () => initialWorkspace.current.showFieldGuides ?? true
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [importPdfOpen, setImportPdfOpen] = useState(false);

  // Unified Google Sign-In & Cloud Firestore account state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(60);
  const [lastSavedText, setLastSavedText] = useState(() =>
    formatClockTime(new Date())
  );

  const pendingSaveTimersRef = useRef<Map<string, number>>(new Map());
  const bootstrappedUidRef = useRef<string | null>(null);

  const latestStateRef = useRef({
    profile,
    cvs,
    view,
    activeCvId,
    showFieldGuides,
    firebaseUser,
  });
  latestStateRef.current = {
    profile,
    cvs,
    view,
    activeCvId,
    showFieldGuides,
    firebaseUser,
  };

  // Monitor Google Sign-In state via Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
      if (!user) {
        bootstrappedUidRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap and subscribe to Cloud Firestore when signed in with Google
  useEffect(() => {
    if (!firebaseAuthReady || !firebaseUser) return;

    let cancelled = false;
    let unsubCVs: (() => void) | null = null;

    const initFirestoreSync = async () => {
      try {
        if (bootstrappedUidRef.current !== firebaseUser.uid) {
          bootstrappedUidRef.current = firebaseUser.uid;
          const synced = await bootstrapUserCloudData(
            firebaseUser.uid,
            latestStateRef.current.profile,
            latestStateRef.current.cvs
          );
          if (cancelled) return;
          const savedLocalProfile = saveProfile(synced.profile);
          setProfile(savedLocalProfile);
          if (synced.cvs.length > 0) {
            setCvs(synced.cvs);
            saveCVs(synced.cvs);
          }
          setLastSavedText(formatClockTime(new Date()));
        }

        unsubCVs = subscribeToUserCVs(
          firebaseUser.uid,
          (cloudCVs) => {
            if (cancelled) return;
            setCvs((prev) => {
              const activeTimers = pendingSaveTimersRef.current;
              const merged = cloudCVs.map((cloudItem) => {
                if (activeTimers.has(cloudItem.id)) {
                  return prev.find((p) => p.id === cloudItem.id) ?? cloudItem;
                }
                return cloudItem;
              });
              for (const localItem of prev) {
                if (
                  activeTimers.has(localItem.id) &&
                  !merged.some((m) => m.id === localItem.id)
                ) {
                  merged.unshift(localItem);
                }
              }
              return merged;
            });
            setCloudNotice(null);
          },
          (err) => {
            setCloudNotice(
              err.message.includes('Missing or insufficient permissions')
                ? 'Google Account permission check failed. Please sign out and sign in with Google again.'
                : 'Cloud sync is temporarily offline; changes remain safely saved on this device.'
            );
          }
        );
      } catch (err) {
        if (!cancelled) {
          setCloudNotice(
            err instanceof Error
              ? 'Cloud sync paused; device auto-save remains active.'
              : 'Cloud sync paused.'
          );
        }
      }
    };

    void initFirestoreSync();

    return () => {
      cancelled = true;
      if (unsubCVs) unsubCVs();
    };
  }, [firebaseAuthReady, firebaseUser]);

  useEffect(() => {
    saveCVs(cvs);
  }, [cvs]);

  useEffect(() => {
    saveWorkspaceState({
      activeView: view,
      activeCvId,
      showFieldGuides,
      lastSavedAt: new Date().toISOString(),
    });
  }, [view, activeCvId, showFieldGuides]);

  const persistCVToCloud = useCallback(async (cv: CVDocument) => {
    const uid = latestStateRef.current.firebaseUser?.uid;
    if (!uid) return;
    try {
      await saveCVToFirestore(uid, cv);
      setLastSavedText(formatClockTime(new Date()));
    } catch {
      setCloudNotice('Could not sync latest CV edit to Google Cloud; local copy saved.');
    }
  }, []);

  const scheduleCloudCVSave = useCallback(
    (cv: CVDocument) => {
      if (!latestStateRef.current.firebaseUser?.uid) return;
      const existingTimer = pendingSaveTimersRef.current.get(cv.id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      const timerId = window.setTimeout(() => {
        pendingSaveTimersRef.current.delete(cv.id);
        void persistCVToCloud(cv);
      }, 700);
      pendingSaveTimersRef.current.set(cv.id, timerId);
    },
    [persistCVToCloud]
  );

  const syncAllToCloud = useCallback(async () => {
    const current = latestStateRef.current;
    if (!current.firebaseUser?.uid) return;
    await saveUserProfileToFirestore(current.firebaseUser.uid, current.profile);
    for (const cvItem of current.cvs) {
      await saveCVToFirestore(current.firebaseUser.uid, cvItem);
    }
    setLastSavedText(formatClockTime(new Date()));
  }, []);

  const runFullAutoSave = useCallback(async () => {
    const current = latestStateRef.current;
    saveProfileDraft(current.profile);
    saveCVs(current.cvs);
    saveWorkspaceState({
      activeView: current.view,
      activeCvId: current.activeCvId,
      showFieldGuides: current.showFieldGuides,
      lastSavedAt: new Date().toISOString(),
    });

    if (current.firebaseUser?.uid) {
      try {
        await saveUserProfileToFirestore(current.firebaseUser.uid, current.profile);
        if (current.activeCvId) {
          const active = current.cvs.find((c) => c.id === current.activeCvId);
          if (active) {
            await saveCVToFirestore(current.firebaseUser.uid, active);
          }
        }
      } catch {
        // Keep local auto-save intact even if cloud sync fails momentarily
      }
    }
    setLastSavedText(formatClockTime(new Date()));
    setSecondsLeft(60);
  }, []);

  // Mandatory 1-minute (60s) periodic auto-save across every step
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          void runFullAutoSave();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runFullAutoSave]);

  const autoSaveLabel = `Saved ${lastSavedText} · Auto-save ${secondsLeft}s`;

  const handleSaveProfile = (updated: UserProfile) => {
    const saved = saveProfile(updated);
    setProfile(saved);
    setLastSavedText(formatClockTime(new Date()));
    if (firebaseUser?.uid) {
      void saveUserProfileToFirestore(firebaseUser.uid, saved).catch(() => {
        setCloudNotice('Could not sync profile to Google Cloud; saved on device.');
      });
    }
  };

  const handleCreateCV = (templateId: TemplateId, customName?: string) => {
    const created = cloneProfileToCV(profile, templateId, customName);
    setCvs((prev) => [created, ...prev]);
    setActiveCvId(created.id);
    setView('editor');
    void persistCVToCloud(created);
  };

  const handleOpenCV = (id: string) => {
    setActiveCvId(id);
    setView('editor');
  };

  const handleUpdateCV = (updated: CVDocument) => {
    setCvs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    scheduleCloudCVSave(updated);
  };

  const handleDuplicateCV = (cvOrId: CVDocument | string) => {
    const target =
      typeof cvOrId === 'string'
        ? cvs.find((c) => c.id === cvOrId)
        : cvOrId;
    if (!target) return;
    const copy = duplicateCV(target);
    setCvs((prev) => [copy, ...prev]);
    if (view === 'editor') {
      setActiveCvId(copy.id);
    }
    void persistCVToCloud(copy);
  };

  const handleRenameCV = (id: string, newName: string) => {
    let renamedDoc: CVDocument | null = null;
    setCvs((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          renamedDoc = renameCV(c, newName);
          return renamedDoc;
        }
        return c;
      })
    );
    if (renamedDoc) {
      void persistCVToCloud(renamedDoc);
    }
  };

  const handleDeleteCV = (id: string) => {
    setCvs((prev) => prev.filter((c) => c.id !== id));
    if (activeCvId === id) {
      setActiveCvId(null);
      setView('dashboard');
    }
    if (firebaseUser?.uid) {
      void deleteCVFromFirestore(firebaseUser.uid, id).catch(() => {
        setCloudNotice('Could not delete CV from Google Cloud right now.');
      });
    }
  };

  const handleApplySummaryToCV = (cvId: string, summaryText: string) => {
    let updatedDoc: CVDocument | null = null;
    setCvs((prev) =>
      prev.map((c) => {
        if (c.id === cvId) {
          updatedDoc = {
            ...c,
            summary: summaryText,
            updatedAt: new Date().toISOString(),
          };
          return updatedDoc;
        }
        return c;
      })
    );
    if (updatedDoc) {
      void persistCVToCloud(updatedDoc);
    }
  };

  const handleImportedPdfCV = (imported: CVDocument) => {
    setCvs((prev) => [imported, ...prev]);
    setActiveCvId(imported.id);
    setView('editor');
    void persistCVToCloud(imported);
  };

  const activeCV = cvs.find((c) => c.id === activeCvId) ?? null;

  if (view === 'editor' && activeCV) {
    return (
      <div className="min-h-screen bg-[#f3f7ff]">
        <CVEditorView
          key={activeCV.id}
          cv={activeCV}
          onSaveCV={handleUpdateCV}
          onDuplicateCV={(doc) => handleDuplicateCV(doc)}
          onBack={() => setView('dashboard')}
          showFieldGuides={showFieldGuides}
          onToggleFieldGuides={() => setShowFieldGuides((v) => !v)}
          autoSaveLabel={autoSaveLabel}
        />
      </div>
    );
  }

  const navItems: Array<{
    id: Exclude<AppView, 'editor'>;
    label: string;
    shortLabel: string;
    icon: typeof LayoutDashboard;
    activeClass: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
      activeClass: 'bg-sky-100 text-sky-900 border border-sky-200',
    },
    {
      id: 'cvs',
      label: 'My CVs',
      shortLabel: 'My CVs',
      icon: FileText,
      activeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    },
    {
      id: 'templates',
      label: 'Templates (23)',
      shortLabel: 'Templates',
      icon: LayoutTemplate,
      activeClass: 'bg-amber-100 text-amber-900 border border-amber-200',
    },
    {
      id: 'profile',
      label: 'Saved Profile',
      shortLabel: 'Profile',
      icon: UserCheck,
      activeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    },
    {
      id: 'ai-assistant',
      label: 'AI Writing',
      shortLabel: 'AI Write',
      icon: Sparkles,
      activeClass: 'bg-violet-100 text-violet-900 border border-violet-200',
    },
    {
      id: 'review',
      label: 'CV Review',
      shortLabel: 'Review',
      icon: ShieldCheck,
      activeClass: 'bg-teal-100 text-teal-900 border border-teal-200',
    },
  ];

  const mobileTabs = navItems;

  return (
    <div className="min-h-screen flex bg-[#f3f7ff] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-r border-sky-100">
        <div className="h-16 px-5 flex items-center border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="text-lg font-extrabold tracking-tight text-blue-900 whitespace-nowrap"
          >
            CareerCraft SG
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? item.activeClass
                    : 'text-slate-600 hover:bg-sky-50/70 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sky-100 bg-sky-50/40 space-y-2.5">
          <div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {firebaseUser?.displayName || profile.personal.fullName || 'Worker Profile'}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {autoSaveLabel}
            </div>
          </div>

          {firebaseUser ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 min-w-0 text-left"
              >
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    {(firebaseUser.email || 'G').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-emerald-900 truncate">
                    {firebaseUser.email}
                  </span>
                  <span className="block text-[10px] text-emerald-700 truncate">
                    Google Cloud ({firebaseProjectId})
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => void signOutFirebase()}
                aria-label="Sign out of Google"
                title="Sign out"
                className="p-1.5 rounded-lg border border-emerald-200 bg-white text-slate-600 hover:text-slate-900 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-300 bg-white text-xs font-bold text-blue-800 hover:bg-sky-50 whitespace-nowrap"
            >
              <Cloud className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Top Bar (compact single-line header) */}
        <header className="no-print sticky top-0 z-30 h-13 lg:h-16 bg-white/95 backdrop-blur-xs border-b border-sky-100 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden font-extrabold text-base text-blue-900 whitespace-nowrap">
              CareerCraft SG
            </span>
            <span className="hidden lg:inline text-sm font-semibold text-slate-700 whitespace-nowrap">
              {navItems.find((n) => n.id === view)?.label ?? 'Workspace'}
            </span>
            <span className="hidden xl:inline text-xs font-mono-tabular text-slate-400 whitespace-nowrap">
              · {autoSaveLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setImportPdfOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50/70 text-slate-800 text-xs sm:text-sm font-semibold hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
            >
              <FileUp className="w-4 h-4 text-blue-700" />
              Upload PDF
            </button>

            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                firebaseUser
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  : 'border-sky-200 bg-white text-blue-800 hover:bg-sky-50'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                {firebaseUser ? 'Google Account Synced' : 'Sign in with Google'}
              </span>
              <span className="sm:hidden">
                {firebaseUser ? 'Google' : 'Sign In'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs sm:text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4" />
              Create CV
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {cloudNotice && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
              <span>{cloudNotice}</span>
              <button
                type="button"
                onClick={() => setCloudNotice(null)}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {view === 'dashboard' && (
            <DashboardView
              cvs={cvs}
              profile={profile}
              firebaseUser={firebaseUser}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onNavigate={(v) => setView(v)}
              onCreateNewCV={() => setCreateModalOpen(true)}
              onOpenImportPdf={() => setImportPdfOpen(true)}
              onOpenCV={handleOpenCV}
              onDuplicateCV={handleDuplicateCV}
              onRenameCV={handleRenameCV}
              onDeleteCV={handleDeleteCV}
            />
          )}

          {view === 'cvs' && (
            <DashboardView
              cvs={cvs}
              profile={profile}
              firebaseUser={firebaseUser}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onNavigate={(v) => setView(v)}
              onCreateNewCV={() => setCreateModalOpen(true)}
              onOpenImportPdf={() => setImportPdfOpen(true)}
              onOpenCV={handleOpenCV}
              onDuplicateCV={handleDuplicateCV}
              onRenameCV={handleRenameCV}
              onDeleteCV={handleDeleteCV}
              showAllOnly
            />
          )}

          {view === 'templates' && (
            <TemplateGalleryView
              profile={profile}
              onSelectTemplateToCreate={handleCreateCV}
            />
          )}

          {view === 'profile' && (
            <ProfileView
              profile={profile}
              onSaveProfile={handleSaveProfile}
              onResetDemo={() => {
                const fresh = resetDemoData();
                setProfile(fresh.profile);
                setCvs(fresh.cvs);
              }}
              showFieldGuides={showFieldGuides}
              onToggleFieldGuides={() => setShowFieldGuides((v) => !v)}
              autoSaveLabel={autoSaveLabel}
            />
          )}

          {view === 'ai-assistant' && (
            <AIAssistantView
              cvs={cvs}
              onApplySummaryToCV={handleApplySummaryToCV}
            />
          )}

          {view === 'review' && (
            <CVReviewView cvs={cvs} onUpdateCV={handleUpdateCV} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (compact 56px, total sticky <= 13% viewport height) */}
      <nav
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 backdrop-blur-xs border-t border-sky-100 grid grid-cols-6 items-center"
        aria-label="Mobile navigation"
      >
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-blue-700 bg-sky-50/70' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[64px]">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      <CreateCVModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        profile={profile}
        onCreate={handleCreateCV}
      />

      <AuthOtpModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentProfile={profile}
        currentCVs={cvs}
        firebaseUser={firebaseUser}
        onSyncNow={syncAllToCloud}
      />

      <ImportPdfModal
        isOpen={importPdfOpen}
        onClose={() => setImportPdfOpen(false)}
        onImportedCV={handleImportedPdfCV}
      />
    </div>
  );
}

export default App;
