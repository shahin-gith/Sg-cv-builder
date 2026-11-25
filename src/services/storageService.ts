import firebaseConfig from '../../firebase-applet-config.json';
import { SAMPLE_CVS, SAMPLE_PROFILE } from '../data/sampleData';
import { CVDocument, UserProfile } from '../types/cv';

const STORAGE_KEYS = {
  PROFILE: 'careercraft_sg_profile_v1',
  CVS: 'careercraft_sg_cvs_v1',
  WORKSPACE: 'careercraft_sg_workspace_v1',
  PROFILE_DRAFT: 'careercraft_sg_profile_draft_v1',
};

export interface WorkspaceState {
  activeView: string;
  activeCvId: string | null;
  showFieldGuides: boolean;
  lastSavedAt: string;
}

export interface AuthSession {
  mode: 'local' | 'account' | 'firebase';
  uid: string;
  email: string | null;
  displayName: string;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
}

export function getFirebaseStatusSummary(): {
  configured: boolean;
  providerLabel: string;
  details: string;
} {
  if (isFirebaseConfigured()) {
    return {
      configured: true,
      providerLabel: `Firebase Firestore Connected (${firebaseConfig.projectId})`,
      details:
        'Sign in with Google to save & edit your CVs in Cloud Firestore across devices, or keep working with same-device auto-save.',
    };
  }
  return {
    configured: false,
    providerLabel: 'Same-Device Auto-Save + Optional Email OTP Account',
    details:
      'All inputs stay saved automatically on this device without an account, or verify Email + OTP to save to your private account.',
  };
}

// Lightweight IndexedDB mirror for resilient device-local backup without account
const IDB_NAME = 'careercraft_sg_device_db';
const IDB_STORE = 'kv';

function mirrorToIndexedDB(key: string, value: unknown): void {
  if (typeof indexedDB === 'undefined') return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
      } catch {
        // Best-effort device backup
      }
    };
  } catch {
    // Ignore IDB errors in restricted environments
  }
}

export function loadProfile(): UserProfile {
  try {
    const draftRaw = localStorage.getItem(STORAGE_KEYS.PROFILE_DRAFT);
    if (draftRaw) {
      return JSON.parse(draftRaw) as UserProfile;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(SAMPLE_PROFILE));
      return structuredClone(SAMPLE_PROFILE);
    }
    return JSON.parse(raw) as UserProfile;
  } catch {
    return structuredClone(SAMPLE_PROFILE);
  }
}

export function saveProfileDraft(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(profile));
    mirrorToIndexedDB(STORAGE_KEYS.PROFILE_DRAFT, profile);
  } catch {
    // Ignore quota overflow
  }
}

export function saveProfile(profile: UserProfile): UserProfile {
  const updated: UserProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
  localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(updated));
  mirrorToIndexedDB(STORAGE_KEYS.PROFILE, updated);
  return updated;
}

export function loadCVs(): CVDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CVS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CVS, JSON.stringify(SAMPLE_CVS));
      return structuredClone(SAMPLE_CVS);
    }
    const parsed = JSON.parse(raw) as CVDocument[];
    return Array.isArray(parsed) ? parsed : structuredClone(SAMPLE_CVS);
  } catch {
    return structuredClone(SAMPLE_CVS);
  }
}

export function saveCVs(cvs: CVDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CVS, JSON.stringify(cvs));
    mirrorToIndexedDB(STORAGE_KEYS.CVS, cvs);
  } catch {
    // Ignore quota overflow
  }
}

export function loadWorkspaceState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
    if (!raw) {
      return {
        activeView: 'dashboard',
        activeCvId: null,
        showFieldGuides: true,
        lastSavedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(raw) as WorkspaceState;
  } catch {
    return {
      activeView: 'dashboard',
      activeCvId: null,
      showFieldGuides: true,
      lastSavedAt: new Date().toISOString(),
    };
  }
}

export function saveWorkspaceState(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(state));
  } catch {
    // Ignore storage error
  }
}

export function resetDemoData(): { profile: UserProfile; cvs: CVDocument[] } {
  const profile = structuredClone(SAMPLE_PROFILE);
  const cvs = structuredClone(SAMPLE_CVS);
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  localStorage.setItem(STORAGE_KEYS.PROFILE_DRAFT, JSON.stringify(profile));
  localStorage.setItem(STORAGE_KEYS.CVS, JSON.stringify(cvs));
  return { profile, cvs };
}

export function getLocalSession(): AuthSession {
  return {
    mode: isFirebaseConfigured() ? 'firebase' : 'local',
    uid: 'local-worker-profile',
    email: null,
    displayName: 'This Device (No Account)',
  };
}
