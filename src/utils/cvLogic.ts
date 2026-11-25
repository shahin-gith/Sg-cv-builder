import { getTemplateById } from '../data/templates';
import {
  CVDocument,
  CVSectionKey,
  TemplateId,
  UserProfile,
} from '../types/cv';

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cloneProfileToCV(
  profile: UserProfile,
  templateId: TemplateId,
  customName?: string
): CVDocument {
  const tpl = getTemplateById(templateId);
  const now = new Date().toISOString();
  const baseTitle = profile.personal.fullName.trim()
    ? `${profile.personal.fullName.trim()} — ${tpl.name}`
    : `Untitled ${tpl.name}`;

  return {
    id: generateId('cv'),
    name: customName?.trim() || baseTitle,
    templateId,
    personal: { ...profile.personal },
    summary: profile.summary,
    careerObjective: profile.careerObjective,
    useObjectiveInsteadOfSummary: false,
    experience: profile.experience.map((item) => ({ ...item })),
    education: profile.education.map((item) => ({ ...item })),
    skills: {
      technical: [...profile.skills.technical],
      soft: [...profile.skills.soft],
      industry: [...profile.skills.industry],
    },
    languages: profile.languages.map((item) => ({ ...item })),
    certifications: profile.certifications.map((item) => ({ ...item })),
    drivingLicence: { ...profile.drivingLicence },
    training: profile.training.map((item) => ({ ...item })),
    projects: profile.projects.map((item) => ({ ...item })),
    volunteer: profile.volunteer.map((item) => ({ ...item })),
    references: profile.references.map((item) => ({ ...item })),
    style: {
      accentColor: tpl.defaultAccentColor,
      fontFamily: tpl.defaultFont,
      fontSize: 'md',
      showPhoto: tpl.supportsPhoto ? tpl.defaultShowPhoto : false,
      sectionOrder: [...tpl.recommendedSectionsOrder],
      hiddenSections: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function switchCVTemplate(
  cv: CVDocument,
  newTemplateId: TemplateId,
  applyTemplateDefaults = false
): CVDocument {
  const tpl = getTemplateById(newTemplateId);
  const nextShowPhoto = !tpl.supportsPhoto
    ? false
    : applyTemplateDefaults
    ? tpl.defaultShowPhoto
    : cv.style.showPhoto;

  return {
    ...cv,
    templateId: newTemplateId,
    style: {
      ...cv.style,
      showPhoto: nextShowPhoto,
      accentColor: applyTemplateDefaults ? tpl.defaultAccentColor : cv.style.accentColor,
      fontFamily: applyTemplateDefaults ? tpl.defaultFont : cv.style.fontFamily,
      sectionOrder: applyTemplateDefaults
        ? [...tpl.recommendedSectionsOrder]
        : cv.style.sectionOrder,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateCV(cv: CVDocument): CVDocument {
  const now = new Date().toISOString();
  return {
    ...structuredClone(cv),
    id: generateId('cv'),
    name: `${cv.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameCV(cv: CVDocument, newName: string): CVDocument {
  const trimmed = newName.trim();
  if (!trimmed) return cv;
  return {
    ...cv,
    name: trimmed,
    updatedAt: new Date().toISOString(),
  };
}

export function reorderSections(
  order: CVSectionKey[],
  fromIndex: number,
  toIndex: number
): CVSectionKey[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function toggleSectionVisibility(
  hiddenSections: CVSectionKey[],
  key: CVSectionKey
): CVSectionKey[] {
  if (hiddenSections.includes(key)) {
    return hiddenSections.filter((s) => s !== key);
  }
  return [...hiddenSections, key];
}

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] };
}

export function pushHistoryState<T>(
  history: HistoryState<T>,
  nextPresent: T,
  maxPast = 40
): HistoryState<T> {
  const nextPast = [...history.past, history.present].slice(-maxPast);
  return {
    past: nextPast,
    present: nextPresent,
    future: [],
  };
}

export function undoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

export interface LocalDiagnosticResult {
  missingInfoWarnings: string[];
  dateConsistencyNotes: string[];
  repeatedContent: string[];
  weakDescriptions: Array<{
    section: string;
    currentText: string;
    suggestion: string;
  }>;
  estimatedBaselineScore: number;
}

export function runLocalCVDiagnostics(cv: CVDocument): LocalDiagnosticResult {
  const missingInfoWarnings: string[] = [];
  const dateConsistencyNotes: string[] = [];
  const repeatedContent: string[] = [];
  const weakDescriptions: LocalDiagnosticResult['weakDescriptions'] = [];

  if (!cv.personal.fullName.trim()) missingInfoWarnings.push('Full Name is missing.');
  if (!cv.personal.professionalTitle.trim()) {
    missingInfoWarnings.push('Professional Title is missing.');
  }
  if (!cv.personal.phone.trim()) missingInfoWarnings.push('Phone Number is missing.');
  if (!cv.personal.email.trim()) missingInfoWarnings.push('Email Address is missing.');

  const activeIntro = cv.useObjectiveInsteadOfSummary
    ? cv.careerObjective.trim()
    : cv.summary.trim();
  if (!activeIntro) {
    missingInfoWarnings.push('Professional Summary or Career Objective is empty.');
  } else if (activeIntro.split(/\s+/).length < 15) {
    weakDescriptions.push({
      section: 'Professional Summary',
      currentText: activeIntro,
      suggestion: 'Expand to 2–4 concise sentences highlighting core experience, credentials, and target value.',
    });
  }

  if (cv.experience.length === 0) {
    missingInfoWarnings.push('No Work Experience entries added.');
  }

  const totalSkills =
    cv.skills.technical.length + cv.skills.soft.length + cv.skills.industry.length;
  if (totalSkills < 3) {
    missingInfoWarnings.push('Add at least 3–5 relevant skills across technical, soft, or industry categories.');
  }

  // Date consistency & weak description checks
  const sentenceCounts = new Map<string, number>();

  for (const exp of cv.experience) {
    if (exp.startDate && !exp.current && exp.endDate && exp.startDate > exp.endDate) {
      dateConsistencyNotes.push(
        `${exp.jobTitle || 'Experience'} at ${exp.company || 'Company'}: Start date (${exp.startDate}) is after end date (${exp.endDate}).`
      );
    }
    if (!exp.startDate) {
      dateConsistencyNotes.push(
        `${exp.jobTitle || 'Experience'} at ${exp.company || 'Company'} is missing a start date.`
      );
    }
    if (!exp.current && !exp.endDate) {
      dateConsistencyNotes.push(
        `${exp.jobTitle || 'Experience'} at ${exp.company || 'Company'} is missing an end date (or mark as Currently Working).`
      );
    }

    const combinedText = `${exp.responsibilities}\n${exp.achievements}`.trim();
    if (combinedText.length < 35) {
      weakDescriptions.push({
        section: `Work Experience: ${exp.jobTitle || exp.company || 'Role'}`,
        currentText: combinedText || '(Empty)',
        suggestion: 'Add concrete action-based responsibilities and measurable achievements.',
      });
    }

    const lines = combinedText
      .split(/\n+/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 15);
    for (const line of lines) {
      sentenceCounts.set(line, (sentenceCounts.get(line) ?? 0) + 1);
    }
  }

  for (const [sentence, count] of sentenceCounts.entries()) {
    if (count > 1) {
      repeatedContent.push(`Repeated line detected (${count}x): "${sentence.slice(0, 80)}${sentence.length > 80 ? '...' : ''}"`);
    }
  }

  // Calculate deterministic baseline score (0–100)
  let score = 100;
  score -= Math.min(35, missingInfoWarnings.length * 8);
  score -= Math.min(20, dateConsistencyNotes.length * 7);
  score -= Math.min(15, weakDescriptions.length * 6);
  score -= Math.min(10, repeatedContent.length * 5);

  return {
    missingInfoWarnings,
    dateConsistencyNotes,
    repeatedContent,
    weakDescriptions,
    estimatedBaselineScore: Math.max(15, score),
  };
}

export function formatDateMonthYear(value: string): string {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mIndex = parseInt(month, 10) - 1;
  if (Number.isNaN(mIndex) || mIndex < 0 || mIndex > 11) return value;
  return `${monthNames[mIndex]} ${year}`;
}

export function formatDateRange(start: string, end: string, current?: boolean): string {
  const s = formatDateMonthYear(start);
  const e = current ? 'Present' : formatDateMonthYear(end);
  if (!s && !e) return '';
  if (s && !e) return s;
  if (!s && e) return e;
  return `${s} – ${e}`;
}
