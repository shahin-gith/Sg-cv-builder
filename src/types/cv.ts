export type TemplateCategory =
  | 'Construction & Engineering'
  | 'Marine, Shipyard & Process'
  | 'Driving, Port & Logistics'
  | 'Hotel, Restaurant & F&B'
  | 'Corporate, Office & Tech'
  | 'Healthcare, Security & Services'
  | 'International & European';

export type TemplateId =
  | 'modern-professional'
  | 'classic-professional'
  | 'minimalist'
  | 'ats-friendly'
  | 'european-cv'
  | 'europass-inspired'
  | 'canadian-resume'
  | 'executive-cv'
  | 'skilled-worker'
  | 'driver-cv'
  | 'construction-worker'
  | 'technician-cv'
  | 'office-admin'
  | 'marine-shipyard'
  | 'hotel-hospitality'
  | 'restaurant-fnb'
  | 'heavy-driver-logistics'
  | 'process-oil-gas'
  | 'healthcare-nursing'
  | 'security-safety'
  | 'it-digital-tech'
  | 'retail-customer-service'
  | 'facilities-cleaning-landscape';

export type CVFontFamily =
  | 'Plus Jakarta Sans'
  | 'DM Sans'
  | 'Public Sans'
  | 'Source Serif 4'
  | 'Lora';

export type CVFontSize = 'sm' | 'md' | 'lg';

export type CVSectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'drivingLicence'
  | 'languages'
  | 'training'
  | 'projects'
  | 'volunteer'
  | 'references';

export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  photoUrl: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  phone: string;
  email: string;
  linkedin: string;
  website: string;
}

export interface WorkExperienceItem {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string;
  achievements: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: string;
  graduationDate: string;
}

export interface SkillsData {
  technical: string[];
  soft: string[];
  industry: string[];
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
}

export interface DrivingLicenceInfo {
  classes: string;
  issuingCountry: string;
  notes: string;
}

export interface TrainingItem {
  id: string;
  title: string;
  provider: string;
  date: string;
  details: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  date: string;
  description: string;
}

export interface VolunteerItem {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  title: string;
  company: string;
  contact: string;
}

export interface UserProfile {
  personal: PersonalInfo;
  summary: string;
  careerObjective: string;
  experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillsData;
  languages: LanguageItem[];
  certifications: CertificationItem[];
  drivingLicence: DrivingLicenceInfo;
  training: TrainingItem[];
  projects: ProjectItem[];
  volunteer: VolunteerItem[];
  references: ReferenceItem[];
  updatedAt: string;
}

export interface CVStyleConfig {
  accentColor: string;
  fontFamily: CVFontFamily;
  fontSize: CVFontSize;
  showPhoto: boolean;
  sectionOrder: CVSectionKey[];
  hiddenSections: CVSectionKey[];
}

export interface CVDocument {
  id: string;
  name: string;
  templateId: TemplateId;
  personal: PersonalInfo;
  summary: string;
  careerObjective: string;
  useObjectiveInsteadOfSummary?: boolean;
  experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillsData;
  languages: LanguageItem[];
  certifications: CertificationItem[];
  drivingLicence: DrivingLicenceInfo;
  training: TrainingItem[];
  projects: ProjectItem[];
  volunteer: VolunteerItem[];
  references: ReferenceItem[];
  style: CVStyleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  category: TemplateCategory;
  description: string;
  supportsPhoto: boolean;
  defaultShowPhoto: boolean;
  atsOptimized: boolean;
  defaultAccentColor: string;
  defaultFont: CVFontFamily;
  recommendedSectionsOrder: CVSectionKey[];
  layoutTag: string;
  disclaimer?: string;
  occupations?: string[];
  sectorTint?: 'sky' | 'amber' | 'teal' | 'rose' | 'indigo' | 'emerald' | 'slate';
}

export type WritingStyle =
  | 'Professional'
  | 'Concise'
  | 'Formal'
  | 'Achievement-focused'
  | 'ATS-friendly';

export type RewriteAction =
  | 'grammar'
  | 'rewrite'
  | 'summary'
  | 'objective'
  | 'bengali-to-english'
  | 'suggest-skills';

export interface AIRewriteResponse {
  correctedText: string;
  explanation: string;
  issuesFound: string[];
  suggestedSkills?: string[];
  preservedFactsNotice: string;
}

export interface AIReviewResponse {
  overallScore: number;
  summaryQuality: string;
  atsReadability: string;
  grammarFindings: string[];
  missingInfoWarnings: string[];
  dateConsistencyNotes: string[];
  weakDescriptions: Array<{
    section: string;
    currentText: string;
    suggestion: string;
  }>;
  repeatedContent: string[];
  sectionFeedback: Array<{
    section: string;
    status: 'Strong' | 'Needs Improvement' | 'Missing';
    feedback: string;
  }>;
  disclaimer: string;
}

export interface AIJobOptimizationResponse {
  roleTitle: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkillsGap: string[];
  recommendedExperienceToEmphasize: string[];
  tailoredSummary: string;
  bulletSuggestions: Array<{
    experienceTitle: string;
    originalText: string;
    suggestedText: string;
    reason: string;
  }>;
  disclaimer: string;
}

export interface AIGenerateCVResponse {
  cvName: string;
  recommendedTemplateId: TemplateId;
  recommendedAccentColor: string;
  templateReason: string;
  personal: Partial<PersonalInfo>;
  summary: string;
  careerObjective: string;
  experience: Array<{
    company: string;
    jobTitle: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    responsibilities: string;
    achievements: string;
  }>;
  education: Array<{
    institution: string;
    qualification: string;
    fieldOfStudy: string;
    startDate: string;
    graduationDate: string;
  }>;
  skills: SkillsData;
  languages: Array<{ language: string; proficiency: string }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId: string;
  }>;
  drivingLicence: Partial<DrivingLicenceInfo>;
  training: Array<{
    title: string;
    provider: string;
    date: string;
    details: string;
  }>;
  projects: Array<{
    name: string;
    role: string;
    date: string;
    description: string;
  }>;
  volunteer: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  references: Array<{
    name: string;
    title: string;
    company: string;
    contact: string;
  }>;
}

