import { CVDocument, UserProfile } from '../types/cv';
import { cloneProfileToCV, generateId } from '../utils/cvLogic';
import { SAMPLE_PROFILE } from '../data/sampleData';
import { getTemplateById } from '../data/templates';

export interface AuthResponse {
  ok: boolean;
  email?: string;
  deliveredViaEmail?: boolean;
  previewOtp?: string;
  message?: string;
  requiresOtp?: boolean;
  token?: string;
  user?: { uid: string; email: string };
  hasCloudData?: boolean;
  profile?: UserProfile | null;
  cvs?: CVDocument[] | null;
}

async function apiJson<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Request failed (${res.status})`
    );
  }
  return data as T;
}

export function registerWithEmail(email: string, password: string) {
  return apiJson<AuthResponse>('/api/auth/register', 'POST', { email, password });
}

export function verifyOtpCode(email: string, otp: string) {
  return apiJson<AuthResponse>('/api/auth/verify-otp', 'POST', { email, otp });
}

export function resendOtpCode(email: string) {
  return apiJson<AuthResponse>('/api/auth/resend-otp', 'POST', { email });
}

export function loginWithEmail(
  email: string,
  password: string,
  requireOtp = false
) {
  return apiJson<AuthResponse>('/api/auth/login', 'POST', {
    email,
    password,
    requireOtp,
  });
}

export function fetchAccountData(token: string) {
  return apiJson<{
    email: string;
    profile: UserProfile | null;
    cvs: CVDocument[] | null;
    updatedAt: string;
  }>('/api/account/data', 'GET', undefined, token);
}

export function saveAccountData(
  token: string,
  payload: { profile: UserProfile; cvs: CVDocument[] }
) {
  return apiJson<{ ok: boolean; savedAt: string }>(
    '/api/account/data',
    'PUT',
    payload,
    token
  );
}

export async function importCVFromPdfFile(file: File): Promise<CVDocument> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const pdfBase64 = btoa(binary);

  const res = await apiJson<{
    source: 'embedded' | 'ai-parsed';
    cv?: CVDocument;
    parsed?: Partial<UserProfile>;
    suggestedName?: string;
  }>('/api/cv/import-pdf', 'POST', {
    pdfBase64,
    fileName: file.name,
  });

  if (res.source === 'embedded' && res.cv) {
    return res.cv;
  }

  const p = res.parsed || {};
  const mergedProfile: UserProfile = {
    ...structuredClone(SAMPLE_PROFILE),
    personal: {
      fullName: p.personal?.fullName || '',
      professionalTitle: p.personal?.professionalTitle || '',
      photoUrl: '',
      dateOfBirth: p.personal?.dateOfBirth || '',
      nationality: p.personal?.nationality || '',
      address: p.personal?.address || '',
      phone: p.personal?.phone || '',
      email: p.personal?.email || '',
      linkedin: p.personal?.linkedin || '',
      website: p.personal?.website || '',
    },
    summary: p.summary || '',
    careerObjective: p.careerObjective || '',
    experience: (p.experience || []).map((e) => ({
      id: generateId('exp'),
      company: e.company || '',
      jobTitle: e.jobTitle || '',
      location: e.location || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: Boolean(e.current),
      responsibilities: e.responsibilities || '',
      achievements: e.achievements || '',
    })),
    education: (p.education || []).map((e) => ({
      id: generateId('edu'),
      institution: e.institution || '',
      qualification: e.qualification || '',
      fieldOfStudy: e.fieldOfStudy || '',
      startDate: e.startDate || '',
      graduationDate: e.graduationDate || '',
    })),
    skills: {
      technical: p.skills?.technical || [],
      soft: p.skills?.soft || [],
      industry: p.skills?.industry || [],
    },
    languages: (p.languages || []).map((l) => ({
      id: generateId('lang'),
      language: l.language || '',
      proficiency: l.proficiency || '',
    })),
    certifications: (p.certifications || []).map((c) => ({
      id: generateId('cert'),
      name: c.name || '',
      issuer: c.issuer || '',
      date: c.date || '',
      credentialId: c.credentialId || '',
    })),
    drivingLicence: {
      classes: p.drivingLicence?.classes || '',
      issuingCountry: p.drivingLicence?.issuingCountry || '',
      notes: p.drivingLicence?.notes || '',
    },
    training: [],
    projects: [],
    volunteer: [],
    references: [],
    updatedAt: new Date().toISOString(),
  };

  const tpl = getTemplateById('modern-professional');
  const imported = cloneProfileToCV(
    mergedProfile,
    tpl.id,
    res.suggestedName || file.name.replace(/\.pdf$/i, '') || 'Imported CV'
  );
  imported.style.showPhoto = false;
  return imported;
}
