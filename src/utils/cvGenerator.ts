import { CV_TEMPLATES, DEFAULT_SECTION_ORDER, getTemplateById } from '../data/templates';
import {
  AIGenerateCVResponse,
  CVDocument,
  CVSectionKey,
  TemplateId,
} from '../types/cv';
import { generateId } from './cvLogic';

export type TargetMarket = 'auto' | 'singapore' | 'europe' | 'canada' | 'global';

const VALID_TEMPLATE_IDS = new Set<string>(CV_TEMPLATES.map((t) => t.id));

function cleanStr(val: unknown, maxLen = 2000): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function cleanStringList(arr: unknown, maxItems = 30): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, 100);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function resolveValidTemplateId(
  candidate: string | undefined,
  targetMarket: TargetMarket = 'auto'
): TemplateId {
  if (candidate && VALID_TEMPLATE_IDS.has(candidate)) {
    return candidate as TemplateId;
  }
  if (targetMarket === 'europe') return 'europass-inspired';
  if (targetMarket === 'canada') return 'canadian-resume';
  return 'modern-professional';
}

export function resolveSafeAccentColor(
  candidate: string | undefined,
  fallbackHex: string
): string {
  if (typeof candidate === 'string' && /^#[0-9A-Fa-f]{6}$/.test(candidate.trim())) {
    return candidate.trim();
  }
  return fallbackHex;
}

export function buildGeneratedCVFromAI(
  ai: Partial<AIGenerateCVResponse>,
  options?: {
    targetMarket?: TargetMarket;
    includePhoto?: boolean;
    existingPhotoUrl?: string;
  }
): CVDocument {
  const targetMarket = options?.targetMarket ?? 'auto';
  const templateId = resolveValidTemplateId(ai.recommendedTemplateId, targetMarket);
  const tpl = getTemplateById(templateId);
  const accentColor = resolveSafeAccentColor(
    ai.recommendedAccentColor,
    tpl.defaultAccentColor
  );

  const now = new Date().toISOString();
  const fullName = cleanStr(ai.personal?.fullName, 140);
  const professionalTitle = cleanStr(ai.personal?.professionalTitle, 160);
  const cvName =
    cleanStr(ai.cvName, 140) ||
    (fullName ? `${fullName} — ${tpl.name}` : `AI Custom ${tpl.name}`);

  const experience = Array.isArray(ai.experience)
    ? ai.experience
        .filter((e) => e && (cleanStr(e.jobTitle) || cleanStr(e.company) || cleanStr(e.responsibilities)))
        .slice(0, 20)
        .map((e) => ({
          id: generateId('exp'),
          company: cleanStr(e.company, 140),
          jobTitle: cleanStr(e.jobTitle, 140),
          location: cleanStr(e.location, 120),
          startDate: cleanStr(e.startDate, 30),
          endDate: e.current ? '' : cleanStr(e.endDate, 30),
          current: Boolean(e.current),
          responsibilities: cleanStr(e.responsibilities, 2500),
          achievements: cleanStr(e.achievements, 1500),
        }))
    : [];

  const education = Array.isArray(ai.education)
    ? ai.education
        .filter((ed) => {
          if (!ed) return false;
          const inst = cleanStr(ed.institution).toLowerCase();
          const qual = cleanStr(ed.qualification).toLowerCase();
          if ((!inst || inst === 'not specified' || inst === 'n/a') && (!qual || qual === 'not specified' || qual === 'n/a')) {
            return false;
          }
          if (inst === 'not specified' && (!qual || qual === 'professional training')) {
            return false;
          }
          return Boolean(inst || qual);
        })
        .slice(0, 15)
        .map((ed) => ({
          id: generateId('edu'),
          institution: cleanStr(ed.institution, 160),
          qualification: cleanStr(ed.qualification, 160),
          fieldOfStudy: cleanStr(ed.fieldOfStudy, 160),
          startDate: cleanStr(ed.startDate, 30),
          graduationDate: cleanStr(ed.graduationDate, 30),
        }))
    : [];

  const languages = Array.isArray(ai.languages)
    ? ai.languages
        .filter((l) => l && cleanStr(l.language))
        .slice(0, 15)
        .map((l) => ({
          id: generateId('lang'),
          language: cleanStr(l.language, 60),
          proficiency: cleanStr(l.proficiency, 60) || 'Conversational',
        }))
    : [];

  const certifications = Array.isArray(ai.certifications)
    ? ai.certifications
        .filter((c) => c && cleanStr(c.name))
        .slice(0, 25)
        .map((c) => ({
          id: generateId('cert'),
          name: cleanStr(c.name, 160),
          issuer: cleanStr(c.issuer, 140),
          date: cleanStr(c.date, 30),
          credentialId: cleanStr(c.credentialId, 80),
        }))
    : [];

  const training = Array.isArray(ai.training)
    ? ai.training
        .filter((t) => t && cleanStr(t.title))
        .slice(0, 20)
        .map((t) => ({
          id: generateId('trn'),
          title: cleanStr(t.title, 160),
          provider: cleanStr(t.provider, 140),
          date: cleanStr(t.date, 30),
          details: cleanStr(t.details, 400),
        }))
    : [];

  const projects = Array.isArray(ai.projects)
    ? ai.projects
        .filter((p) => p && cleanStr(p.name))
        .slice(0, 20)
        .map((p) => ({
          id: generateId('prj'),
          name: cleanStr(p.name, 160),
          role: cleanStr(p.role, 120),
          date: cleanStr(p.date, 30),
          description: cleanStr(p.description, 800),
        }))
    : [];

  const volunteer = Array.isArray(ai.volunteer)
    ? ai.volunteer
        .filter((v) => v && (cleanStr(v.organization) || cleanStr(v.role)))
        .slice(0, 15)
        .map((v) => ({
          id: generateId('vol'),
          organization: cleanStr(v.organization, 160),
          role: cleanStr(v.role, 140),
          startDate: cleanStr(v.startDate, 30),
          endDate: cleanStr(v.endDate, 30),
          description: cleanStr(v.description, 600),
        }))
    : [];

  const references = Array.isArray(ai.references)
    ? ai.references
        .filter((r) => r && cleanStr(r.name))
        .slice(0, 10)
        .map((r) => ({
          id: generateId('ref'),
          name: cleanStr(r.name, 140),
          title: cleanStr(r.title, 140),
          company: cleanStr(r.company, 140),
          contact: cleanStr(r.contact, 160),
        }))
    : [];

  const baseOrder: CVSectionKey[] =
    tpl.recommendedSectionsOrder.length > 0
      ? [...tpl.recommendedSectionsOrder]
      : [...DEFAULT_SECTION_ORDER];

  const showPhoto = tpl.supportsPhoto
    ? Boolean(options?.includePhoto ?? tpl.defaultShowPhoto)
    : false;

  const summary = cleanStr(ai.summary, 3500);
  const careerObjective = cleanStr(ai.careerObjective, 3500);

  const rawEmail = cleanStr(ai.personal?.email, 160);
  const rawWebsite = cleanStr(ai.personal?.website, 260);
  const websiteLooksLikeEmail = rawWebsite.includes('@') && !rawWebsite.includes('/');
  const resolvedEmail = rawEmail || (websiteLooksLikeEmail ? rawWebsite : '');
  const resolvedWebsite = websiteLooksLikeEmail ? '' : rawWebsite;

  return {
    id: generateId('cv'),
    name: cvName,
    templateId,
    personal: {
      fullName,
      professionalTitle,
      photoUrl: showPhoto ? cleanStr(options?.existingPhotoUrl, 180000) : '',
      dateOfBirth: cleanStr(ai.personal?.dateOfBirth, 40),
      nationality: cleanStr(ai.personal?.nationality, 120),
      address: cleanStr(ai.personal?.address, 260),
      phone: cleanStr(ai.personal?.phone, 60),
      email: resolvedEmail,
      linkedin: cleanStr(ai.personal?.linkedin, 260),
      website: resolvedWebsite,
    },
    summary,
    careerObjective,
    useObjectiveInsteadOfSummary: !summary && Boolean(careerObjective),
    experience,
    education,
    skills: {
      technical: cleanStringList(ai.skills?.technical),
      soft: cleanStringList(ai.skills?.soft),
      industry: cleanStringList(ai.skills?.industry),
    },
    languages,
    certifications,
    drivingLicence: {
      classes: cleanStr(ai.drivingLicence?.classes, 160),
      issuingCountry: cleanStr(ai.drivingLicence?.issuingCountry, 120),
      notes: cleanStr(ai.drivingLicence?.notes, 500),
    },
    training,
    projects,
    volunteer,
    references,
    style: {
      accentColor,
      fontFamily: tpl.defaultFont,
      fontSize: 'md',
      showPhoto,
      sectionOrder: baseOrder,
      hiddenSections: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export const ONE_BOX_SAMPLE_BENGALI = `নাম: মোঃ কামরুল হাসান
পেশা: মেরিন ওয়েল্ডার ও পাইপ ফিটার (Marine Welder 6G)
ফোন: +65 8745 2190, ইমেইল: kamrul.welder@example.com
ঠিকানা: Pioneer, Jurong West, Singapore | জাতীয়তা: বাংলাদেশি (Work Permit)
অভিজ্ঞতা:
১) Sembcorp Marine / Seatrium, Singapore (২০২১-০৩ থেকে বর্তমান): 6G SMAW, FCAW এবং TIG পাইপ ওয়েল্ডিং, শিপ হুল রিপেয়ার, হট ওয়ার্ক সেফটি চেক ও ব্লুপ্রিন্ট রিডিং। কোন এক্সিডেন্ট ছাড়া ৩ বছর কাজ করেছি।
২) Chittagong Dry Dock (২০১৮-০১ থেকে ২০২০-১২): কার্বন স্টিল এবং স্টেইনলেস স্টিল পাইপ ফিটিং ও গ্রাইন্ডিং।
সার্টিফিকেট: MOM Shipyard Safety Instruction Course (SSIC), BCA Welding Trade Test, WSH Confined Space, Hot Work Safety.
শিক্ষা: SSC ও কারিগরি প্রশিক্ষণ কেন্দ্র (TTC) থেকে ওয়েল্ডিং ট্রেড কোর্স (২০১৭)।
দক্ষতা: 6G Pipe Welding, TIG/MIG/SMAW, Blueprint Reading, Fire Watch, Team Work.
ভাষা: বাংলা (Native), ইংরেজি (Conversational), মালয় (Basic).`;

export const ONE_BOX_SAMPLE_ENGLISH = `Name: Tan Mei Ling
Role: Restaurant Supervisor / F&B Outlet Manager
Phone: +65 9128 4402 | Email: meiling.tan@example.com | Location: Tampines, Singapore
Summary: Hospitality and F&B supervisor with 6 years of fast-paced dining and cafe operations experience in Singapore.
Experience:
- Bistro Marina Bay, Singapore (2022-04 to Present): Restaurant Supervisor. Managed 12 floor and kitchen staff, daily POS cash closing, food safety compliance, and inventory ordering. Reduced monthly food waste by 18%.
- Kopi & Kitchen Pte Ltd, Singapore (2019-06 to 2022-03): Senior Service Crew. Trained 6 new hires, handled customer feedback, and maintained 99% order accuracy during peak lunch rush.
Certificates: WSQ Food Safety Course Level 3 (SFA), WSQ Food Safety Level 1, Workplace First Aid.
Education: Higher Nitec in Hospitality Operations, ITE College East (2019).
Skills: POS Systems, Roster Scheduling, Inventory Control, SFA Hygiene Audit, Customer Care, Team Leadership.
Languages: English (Fluent), Mandarin (Fluent), Malay (Conversational).`;
