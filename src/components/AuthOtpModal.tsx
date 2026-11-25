import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  firebaseProjectId,
  signInWithGooglePopup,
  signOutFirebase,
} from '../firebase';
import { CVDocument, UserProfile } from '../types/cv';

interface AuthOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  currentCVs: CVDocument[];
  firebaseUser: User | null;
  onSyncNow?: () => Promise<void>;
  onAuthenticated?: (payload: {
    token: string;
    email: string;
    cloudProfile?: UserProfile | null;
    cloudCVs?: CVDocument[] | null;
  }) => void;
}

function formatFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (raw.includes('auth/unauthorized-domain')) {
    return `This domain (${host || 'current URL'}) is not listed in Firebase Console → Authentication → Settings → Authorized domains. Add it there, or open the app via its authorized AI Studio / Cloud Run URL.`;
  }
  if (raw.includes('auth/popup-blocked')) {
    return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and click "Continue with Google" again.';
  }
  if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
    return 'Google Sign-In window was closed before finishing. Click "Continue with Google" to try again.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'Google Sign-In provider is not enabled yet in Firebase Console → Authentication → Sign-in method.';
  }
  return raw || 'Google sign-in could not complete. Please allow popups and try again.';
}

export const AuthOtpModal: React.FC<AuthOtpModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  currentCVs,
  firebaseUser,
  onSyncNow,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSyncNotice(null);
    setGoogleLoading(true);
    try {
      await signInWithGooglePopup();
      onClose();
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setError(null);
    setSyncNotice(null);
    setGoogleLoading(true);
    try {
      await signOutFirebase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!onSyncNow) return;
    setError(null);
    setSyncNotice(null);
    setSyncing(true);
    try {
      await onSyncNow();
      setSyncNotice('Profile & all CVs synced to your Google Account.');
    } catch {
      setError('Could not sync right now. Please check your connection.');
    } finally {
      setSyncing(false);
    }
  };

  const initials = (
    firebaseUser?.displayName ||
    firebaseUser?.email ||
    currentProfile.personal.fullName ||
    'G'
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Google Account Sign In and Cloud Backup"
    >
      <div className="bg-white border border-sky-200 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {firebaseUser ? 'Your Google Account' : 'Sign in with Google'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              One Google Account holds your Master Profile, CVs &amp; edits ({firebaseProjectId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google account dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {firebaseUser ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3.5">
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || 'Google Profile'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {firebaseUser.displayName || 'Google Account Connected'}
                  </div>
                  <div className="text-xs text-emerald-800 font-medium truncate">
                    {firebaseUser.email}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>All CVs &amp; Profile auto-saved in Cloud Firestore</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-sky-900">
                    <FileText className="w-3.5 h-3.5 text-sky-700" />
                    Saved CVs
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                    {currentCVs.length}
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-900">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                    Master Profile
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                    {currentProfile.personal.fullName || 'Ready'}
                  </div>
                </div>
              </div>

              {syncNotice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  {syncNotice}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {onSyncNow && (
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncing || googleLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Everything Now'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  disabled={googleLoading}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50/75 p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Cloud className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900">
                      Your Single Google Account for Everything
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Sign in once with Google. Your Smart Profile, all CV versions, certificates, and edits stay safely stored in Cloud Firestore so you can open and edit them from any phone or computer.
                    </p>
                    <p className="text-xs text-sky-900 leading-relaxed font-medium">
                      Google দিয়ে সাইন ইন করলে আপনার প্রোফাইল ও সব CV স্থায়ীভাবে সেভ থাকবে — যেকোনো মোবাইল বা কম্পিউটার থেকে পরে আবার দেখতে ও এডিট করতে পারবেন।
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  What stays inside your Google Account:
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your Saved Master Profile &amp; Photo (prefills every new CV)</li>
                  <li>All CV templates &amp; versions you create or import from PDF</li>
                  <li>Automatic 1-minute backup + instant Firestore cloud save</li>
                </ul>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-xs disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#FFFFFF"
                      d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.3z"
                    />
                    <path
                      fill="#E2E8F0"
                      d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-4.9-1.8-5.7-4.3H3v2.6C4.7 19.7 8.1 22 12 22z"
                    />
                    <path
                      fill="#CBD5E1"
                      d="M6.3 13.7c-.2-.6-.3-1.2-.3-1.7s.1-1.1.3-1.7V7.7H3C2.4 9 2 10.5 2 12s.4 3 1 4.3l3.3-2.6z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.7 4.3 3 7.7l3.3 2.6C7.1 7.8 9.3 6 12 6z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Even before signing in, your edits auto-save on this device every 1 minute.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
