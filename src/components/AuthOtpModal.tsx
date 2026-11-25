import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  firebaseProjectId,
  signInWithGooglePopup,
  signOutFirebase,
} from '../firebase';
import {
  loginWithEmail,
  registerWithEmail,
  resendOtpCode,
  verifyOtpCode,
} from '../services/accountClient';
import { CVDocument, UserProfile } from '../types/cv';

interface AuthOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  currentCVs: CVDocument[];
  firebaseUser: User | null;
  onAuthenticated: (payload: {
    token: string;
    email: string;
    cloudProfile?: UserProfile | null;
    cloudCVs?: CVDocument[] | null;
  }) => void;
}

export const AuthOtpModal: React.FC<AuthOtpModalProps> = ({
  isOpen,
  onClose,
  firebaseUser,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGooglePopup();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or blocked by popup settings.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signOutFirebase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await registerWithEmail(email, password);
        setPreviewOtp(res.previewOtp ?? null);
        setStatusMessage(
          res.deliveredViaEmail
            ? `A 6-digit OTP was sent to ${res.email}.`
            : 'Enter the 6-digit verification code below to verify your email and save your CVs.'
        );
        setStep('otp');
      } else {
        const res = await loginWithEmail(email, password, true);
        if (res.requiresOtp) {
          setPreviewOtp(res.previewOtp ?? null);
          setStatusMessage(
            res.deliveredViaEmail
              ? `Verification OTP sent to ${res.email}.`
              : 'Enter the 6-digit OTP code to sign in securely.'
          );
          setStep('otp');
        } else if (res.token && res.user) {
          onAuthenticated({
            token: res.token,
            email: res.user.email,
            cloudProfile: res.profile ?? null,
            cloudCVs: res.cvs ?? null,
          });
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtpCode(email, otp);
      if (res.token && res.user) {
        onAuthenticated({
          token: res.token,
          email: res.user.email,
        });
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await resendOtpCode(email);
      setPreviewOtp(res.previewOtp ?? null);
      setStatusMessage('A fresh 6-digit OTP has been issued.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Firebase Cloud Sync and Email OTP Account Verification"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {step === 'otp' ? 'Verify Email OTP' : 'Save & Sync CVs to Firebase'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in to save CVs in Cloud Firestore ({firebaseProjectId}), or use same-device auto-save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'credentials' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Firebase Firestore Cloud Sync ({firebaseProjectId})
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sign in with Google to store your CVs and profile in Firestore and edit them anytime from any device.
                  </p>
                </div>
              </div>

              {firebaseUser ? (
                <div className="flex items-center justify-between gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-emerald-800 truncate">
                      Connected: {firebaseUser.email || firebaseUser.displayName || 'Google Account'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Auto-syncing CVs to Firestore
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    disabled={googleLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  Continue with Google (Firebase Sync)
                </button>
              )}
            </div>
          )}

          {step === 'credentials' ? (
            <>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex-1 h-px bg-slate-200" />
                <span>OR USE EMAIL &amp; OTP BACKUP</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`py-2 rounded-md text-xs font-semibold ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Create Account (OTP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 rounded-md text-xs font-semibold ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Sign In (OTP)
                </button>
              </div>

              <form onSubmit={handleSubmitCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password (minimum 6 characters)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {mode === 'register'
                    ? 'Send Verification OTP'
                    : 'Sign In & Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {statusMessage && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
                  {statusMessage}
                </div>
              )}

              {previewOtp && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold">
                    Email Preview OTP Code (Sandbox Mode)
                  </div>
                  <div className="font-mono-tabular text-lg font-bold tracking-widest text-slate-900">
                    {previewOtp}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Enter 6-Digit OTP Code for {email}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-center font-mono-tabular text-lg tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Verify OTP & Save CVs
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setError(null);
                  }}
                  className="text-slate-600 hover:underline"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="font-medium text-blue-700 hover:underline"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
