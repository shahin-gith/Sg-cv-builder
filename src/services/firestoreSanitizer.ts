import { CVDocument, CVSectionKey, UserProfile } from '../types/cv';

const DEFAULT_SECTION_ORDER: CVSectionKey[] = [
  'summary',
  'experience',
  'skills',
  'certifications',
  'education',
  'training',
  'languages',
  'drivingLicence',
  'projects',
  'volunteer',
  'references',
];

function capStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function capStringArray(arr: unknown, maxItems: number, maxItemLen = 120): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxItemLen));
}

function capMapArray<T extends object>(arr: unknown, maxItems: number): T[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is T => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .slice(0, maxItems)
    .map((item) => ({ ...item }));
}

export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `cv-${Date.now().toString(36)}`;
}

export function sanitizePersonal(personal: UserProfile['personal']) {
  return {
    fullName: capStr(personal?.fullName, 140),
    professionalTitle: capStr(personal?.professionalTitle, 160),
    photoUrl: capStr(personal?.photoUrl, 180000),
    dateOfBirth: capStr(personal?.dateOfBirth, 40),
    nationality: capStr(personal?.nationality, 120),
    address: capStr(personal?.address, 260),
    phone: capStr(personal?.phone, 60),
    email: capStr(personal?.email, 160),
    linkedin: capStr(personal?.linkedin, 260),
    website: capStr(personal?.website, 260),
  };
}

export function sanitizeSkills(skills: UserProfile['skills']) {
  return {
    technical: capStringArray(skills?.technical, 60),
    soft: capStringArray(skills?.soft, 60),
    industry: capStringArray(skills?.industry, 60),
  };
}

export function sanitizeDrivingLicence(dl: UserProfile['drivingLicence']) {
  return {
    classes: capStr(dl?.classes, 160),
    issuingCountry: capStr(dl?.issuingCountry, 120),
    notes: capStr(dl?.notes, 500),
  };
}

export function sanitizeStyle(style: CVDocument['style']) {
  const fontSize =
    style?.fontSize === 'sm' || style?.fontSize === 'lg' ? style.fontSize : 'md';
  return {
    accentColor: capStr(style?.accentColor || '#1D4ED8', 32),
    fontFamily: capStr(style?.fontFamily || 'Plus Jakarta Sans', 60),
    fontSize,
    showPhoto: Boolean(style?.showPhoto),
    sectionOrder: capStringArray(
      style?.sectionOrder?.length ? style.sectionOrder : DEFAULT_SECTION_ORDER,
      20,
      40
    ),
    hiddenSections: capStringArray(style?.hiddenSections, 20, 40),
  };
}

export function buildFirestoreProfilePayload(profile: UserProfile, ownerId: string) {
  return {
    ownerId: capStr(ownerId, 128),
    personal: sanitizePersonal(profile.personal),
    summary: capStr(profile.summary, 5000),
    careerObjective: capStr(profile.careerObjective, 5000),
    experience: capMapArray(profile.experience, 40),
    education: capMapArray(profile.education, 30),
    skills: sanitizeSkills(profile.skills),
    languages: capMapArray(profile.languages, 30),
    certifications: capMapArray(profile.certifications, 40),
    drivingLicence: sanitizeDrivingLicence(profile.drivingLicence),
    training: capMapArray(profile.training, 40),
    projects: capMapArray(profile.projects, 40),
    volunteer: capMapArray(profile.volunteer, 30),
    references: capMapArray(profile.references, 20),
  };
}

export function buildFirestoreCVPayload(cv: CVDocument, ownerId: string) {
  const safeName = capStr(cv.name.trim() || 'Untitled CV', 140);
  const safeTemplateId = capStr(cv.templateId || 'modern-professional', 60);
  return {
    id: sanitizeFirestoreId(cv.id),
    ownerId: capStr(ownerId, 128),
    name: safeName,
    templateId: safeTemplateId,
    personal: sanitizePersonal(cv.personal),
    summary: capStr(cv.summary, 5000),
    careerObjective: capStr(cv.careerObjective, 5000),
    useObjectiveInsteadOfSummary: Boolean(cv.useObjectiveInsteadOfSummary),
    experience: capMapArray(cv.experience, 40),
    education: capMapArray(cv.education, 30),
    skills: sanitizeSkills(cv.skills),
    languages: capMapArray(cv.languages, 30),
    certifications: capMapArray(cv.certifications, 40),
    drivingLicence: sanitizeDrivingLicence(cv.drivingLicence),
    training: capMapArray(cv.training, 40),
    projects: capMapArray(cv.projects, 40),
    volunteer: capMapArray(cv.volunteer, 30),
    references: capMapArray(cv.references, 20),
    style: sanitizeStyle(cv.style),
  };
}
