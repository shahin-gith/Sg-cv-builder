import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CVDocument, UserProfile } from '../types/cv';
import {
  buildFirestoreCVPayload,
  buildFirestoreProfilePayload,
  sanitizeFirestoreId,
} from './firestoreSanitizer';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function mapDocToProfile(data: Record<string, unknown>): UserProfile {
  return {
    personal: data.personal as UserProfile['personal'],
    summary: (data.summary as string) || '',
    careerObjective: (data.careerObjective as string) || '',
    experience: (data.experience as UserProfile['experience']) || [],
    education: (data.education as UserProfile['education']) || [],
    skills: (data.skills as UserProfile['skills']) || {
      technical: [],
      soft: [],
      industry: [],
    },
    languages: (data.languages as UserProfile['languages']) || [],
    certifications: (data.certifications as UserProfile['certifications']) || [],
    drivingLicence: (data.drivingLicence as UserProfile['drivingLicence']) || {
      classes: '',
      issuingCountry: '',
      notes: '',
    },
    training: (data.training as UserProfile['training']) || [],
    projects: (data.projects as UserProfile['projects']) || [],
    volunteer: (data.volunteer as UserProfile['volunteer']) || [],
    references: (data.references as UserProfile['references']) || [],
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapDocToCV(data: Record<string, unknown>, docId: string): CVDocument {
  return {
    id: (data.id as string) || docId,
    name: (data.name as string) || 'Untitled CV',
    templateId: (data.templateId as CVDocument['templateId']) || 'modern-professional',
    personal: data.personal as CVDocument['personal'],
    summary: (data.summary as string) || '',
    careerObjective: (data.careerObjective as string) || '',
    useObjectiveInsteadOfSummary: Boolean(data.useObjectiveInsteadOfSummary),
    experience: (data.experience as CVDocument['experience']) || [],
    education: (data.education as CVDocument['education']) || [],
    skills: (data.skills as CVDocument['skills']) || {
      technical: [],
      soft: [],
      industry: [],
    },
    languages: (data.languages as CVDocument['languages']) || [],
    certifications: (data.certifications as CVDocument['certifications']) || [],
    drivingLicence: (data.drivingLicence as CVDocument['drivingLicence']) || {
      classes: '',
      issuingCountry: '',
      notes: '',
    },
    training: (data.training as CVDocument['training']) || [],
    projects: (data.projects as CVDocument['projects']) || [],
    volunteer: (data.volunteer as CVDocument['volunteer']) || [],
    references: (data.references as CVDocument['references']) || [],
    style: data.style as CVDocument['style'],
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function subscribeToUserCVs(
  uid: string,
  onData: (cvs: CVDocument[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${uid}/cvs`;
  const q = query(collection(db, 'users', uid, 'cvs'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapDocToCV(d.data({ serverTimestamps: 'estimate' }), d.id)
      );
      list.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function fetchUserProfileFromFirestore(
  uid: string
): Promise<UserProfile | null> {
  const path = `users/${uid}/profile/master`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'profile', 'master'));
    if (!snap.exists()) return null;
    return mapDocToProfile(snap.data({ serverTimestamps: 'estimate' }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfileToFirestore(
  uid: string,
  profile: UserProfile
): Promise<void> {
  const path = `users/${uid}/profile/master`;
  const ref = doc(db, 'users', uid, 'profile', 'master');
  const payload = buildFirestoreProfilePayload(profile, uid);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const { ownerId: _ignoredOwner, ...mutableFields } = payload;
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      path
    );
  }
}

export async function saveCVToFirestore(
  uid: string,
  cv: CVDocument
): Promise<void> {
  const safeId = sanitizeFirestoreId(cv.id);
  const path = `users/${uid}/cvs/${safeId}`;
  const ref = doc(db, 'users', uid, 'cvs', safeId);
  const payload = buildFirestoreCVPayload({ ...cv, id: safeId }, uid);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const { id: _ignoredId, ownerId: _ignoredOwner, ...mutableFields } = payload;
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCVFromFirestore(
  uid: string,
  cvId: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(cvId);
  const path = `users/${uid}/cvs/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'cvs', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function bootstrapUserCloudData(
  uid: string,
  localProfile: UserProfile,
  localCVs: CVDocument[]
): Promise<{ profile: UserProfile; cvs: CVDocument[] }> {
  const cvsPath = `users/${uid}/cvs`;
  let cloudProfile = await fetchUserProfileFromFirestore(uid);

  let cloudCVs: CVDocument[] = [];
  try {
    const q = query(collection(db, 'users', uid, 'cvs'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    cloudCVs = snap.docs.map((d) =>
      mapDocToCV(d.data({ serverTimestamps: 'estimate' }), d.id)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, cvsPath);
  }

  if (!cloudProfile) {
    await saveUserProfileToFirestore(uid, localProfile);
    cloudProfile = localProfile;
  }

  if (cloudCVs.length === 0 && localCVs.length > 0) {
    for (const cv of localCVs) {
      await saveCVToFirestore(uid, cv);
    }
    cloudCVs = localCVs;
  }

  cloudCVs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    profile: cloudProfile,
    cvs: cloudCVs,
  };
}
