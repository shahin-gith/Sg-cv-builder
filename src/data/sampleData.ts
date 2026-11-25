import { CVDocument, UserProfile } from '../types/cv';
import { DEFAULT_SECTION_ORDER, getTemplateById } from './templates';

export const SAMPLE_PROFILE: UserProfile = {
  personal: {
    fullName: 'Arifur Rahman',
    professionalTitle: 'Senior Electrical & BMS Maintenance Technician',
    photoUrl: '',
    dateOfBirth: '1991-05-14',
    nationality: 'Bangladeshi (Singapore Work Permit Holder)',
    address: 'Jurong West Street 64, Singapore 640668',
    phone: '+65 8412 3904',
    email: 'arifur.rahman.sg@example.com',
    linkedin: 'linkedin.com/in/arifur-rahman-tech',
    website: '',
  },
  summary:
    'Detail-oriented Senior Electrical and Building Management System (BMS) Technician with 8+ years of hands-on experience in commercial high-rise maintenance, switchgear inspection, and preventive troubleshooting in Singapore. Holds BCA CoreTrade Electrical certification and WSH Level B Safety credentials with a strong record of zero lost-time incidents.',
  careerObjective:
    'Seeking a Senior Technician or Site Electrical Specialist role in Singapore or Europe where my preventive maintenance, PLC troubleshooting, and workplace safety leadership can reduce equipment downtime.',
  experience: [
    {
      id: 'exp-1',
      company: 'Marina Integrated Facilities Pte Ltd',
      jobTitle: 'Senior Electrical & BMS Technician',
      location: 'Singapore',
      startDate: '2021-03',
      endDate: '',
      current: true,
      responsibilities:
        'Perform daily preventive and corrective maintenance for LV switchgear, chilled-water pumps, AHU VFDs, and emergency generator sets across a 32-storey commercial tower.\nDiagnose electrical faults using Fluke multimeters, thermal imaging cameras, and clamp meters.\nCoordinate vendor shutdown schedules and issue Permit-to-Work (PTW) documentation.',
      achievements:
        'Reduced unplanned HVAC and lighting downtime by 24% over 24 months by restructuring weekly thermal-scan checklists.\nCompleted 420+ preventive work orders with 100% SLA compliance and zero safety incidents.',
    },
    {
      id: 'exp-2',
      company: 'Apex MEP Engineering Pte Ltd',
      jobTitle: 'Electrical Technician',
      location: 'Singapore',
      startDate: '2018-02',
      endDate: '2021-02',
      current: false,
      responsibilities:
        'Installed, terminated, and tested distribution boards (DBs), cable trays, and industrial lighting circuits for commercial fit-out projects.\nAssisted Licensed Electrical Workers (LEW) during annual shutdown testing and insulation resistance checks.',
      achievements:
        'Delivered Changi Business Park Phase 3 electrical fit-out two weeks ahead of handover schedule.\nRecognized as Best Safety-Compliant Team Member in Q4 2020.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Dhaka Polytechnic Institute',
      qualification: 'Diploma in Electrical Engineering',
      fieldOfStudy: 'Power & Industrial Systems',
      startDate: '2010-08',
      graduationDate: '2014-06',
    },
  ],
  skills: {
    technical: [
      'LV Switchgear & DB Maintenance',
      'BMS & VFD Troubleshooting',
      'Electrical Schematic Reading',
      'Fluke Thermal Imaging & Megger Testing',
      'Preventive Maintenance (CMMS)',
    ],
    soft: [
      'Cross-Cultural Team Coordination',
      'Permit-to-Work Documentation',
      'Root-Cause Fault Analysis',
      'Shift Handover Reporting',
    ],
    industry: [
      'Singapore CP5 Electrical Code Compliance',
      'WSH Risk Assessment & LOTO',
      'Commercial High-Rise MEP Operations',
    ],
  },
  languages: [
    { id: 'lang-1', language: 'English', proficiency: 'Fluent (Working Professional)' },
    { id: 'lang-2', language: 'Bengali', proficiency: 'Native' },
    { id: 'lang-3', language: 'Malay', proficiency: 'Conversational' },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'BCA CoreTrade (Electrical Wiring & Installation)',
      issuer: 'Building and Construction Authority (Singapore)',
      date: '2022-09',
      credentialId: 'BCA-CT-88421',
    },
    {
      id: 'cert-2',
      name: 'Apply Workplace Safety & Health in Construction Sites (CSOC)',
      issuer: 'Ministry of Manpower Accredited Provider',
      date: '2023-04',
      credentialId: 'WSH-CSOC-1092',
    },
  ],
  drivingLicence: {
    classes: 'Singapore Class 3 & International Driving Permit (B)',
    issuingCountry: 'Singapore',
    notes: 'Clean driving record since 2019; experienced operating light commercial vans.',
  },
  training: [
    {
      id: 'trn-1',
      title: 'Lockout / Tagout (LOTO) & Confined Space Safety',
      provider: 'NTUC LearningHub',
      date: '2024-01',
      details: '8-hour practical hazard isolation and safe energized-panel verification.',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'LED & VFD Energy Retrofit — Jurong Logistics Hub',
      role: 'Lead Maintenance Technician',
      date: '2023-06',
      description:
        'Retrofitted 180 warehouse high-bay fixtures and calibrated 6 AHU variable frequency drives, cutting monthly electricity draw by 16%.',
    },
  ],
  volunteer: [
    {
      id: 'vol-1',
      organization: 'Migrant Workers Centre Peer Support',
      role: 'Safety & Orientation Volunteer',
      startDate: '2022-01',
      endDate: '',
      description: 'Conducted weekend English CV clinics and workplace safety briefings for newly arrived workers.',
    },
  ],
  references: [
    {
      id: 'ref-1',
      name: 'Tan Wei Ming',
      title: 'Facilities Engineering Manager',
      company: 'Marina Integrated Facilities Pte Ltd',
      contact: 'Available upon request',
    },
  ],
  updatedAt: '2026-11-20T09:00:00.000Z',
};

function buildSampleCV(
  id: string,
  name: string,
  templateId: CVDocument['templateId'],
  updatedAt: string,
  overrides?: Partial<CVDocument>
): CVDocument {
  const tpl = getTemplateById(templateId);
  return {
    id,
    name,
    templateId,
    personal: { ...SAMPLE_PROFILE.personal },
    summary: SAMPLE_PROFILE.summary,
    careerObjective: SAMPLE_PROFILE.careerObjective,
    experience: SAMPLE_PROFILE.experience.map((e) => ({ ...e })),
    education: SAMPLE_PROFILE.education.map((e) => ({ ...e })),
    skills: {
      technical: [...SAMPLE_PROFILE.skills.technical],
      soft: [...SAMPLE_PROFILE.skills.soft],
      industry: [...SAMPLE_PROFILE.skills.industry],
    },
    languages: SAMPLE_PROFILE.languages.map((l) => ({ ...l })),
    certifications: SAMPLE_PROFILE.certifications.map((c) => ({ ...c })),
    drivingLicence: { ...SAMPLE_PROFILE.drivingLicence },
    training: SAMPLE_PROFILE.training.map((t) => ({ ...t })),
    projects: SAMPLE_PROFILE.projects.map((p) => ({ ...p })),
    volunteer: SAMPLE_PROFILE.volunteer.map((v) => ({ ...v })),
    references: SAMPLE_PROFILE.references.map((r) => ({ ...r })),
    style: {
      accentColor: tpl.defaultAccentColor,
      fontFamily: tpl.defaultFont,
      fontSize: 'md',
      showPhoto: tpl.defaultShowPhoto,
      sectionOrder: [...(tpl.recommendedSectionsOrder || DEFAULT_SECTION_ORDER)],
      hiddenSections: ['volunteer'],
    },
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt,
    ...overrides,
  };
}

export const SAMPLE_CVS: CVDocument[] = [
  buildSampleCV(
    'cv-sg-technician',
    'Singapore Senior Technician CV',
    'technician-cv',
    '2026-11-23T14:20:00.000Z'
  ),
  buildSampleCV(
    'cv-europass-tech',
    'Europe Electrical Specialist (EU Format)',
    'europass-inspired',
    '2026-11-21T10:15:00.000Z'
  ),
  buildSampleCV(
    'cv-ats-corporate',
    'ATS Facilities Maintenance Resume',
    'ats-friendly',
    '2026-11-18T16:45:00.000Z',
    {
      style: {
        accentColor: '#0F172A',
        fontFamily: 'Public Sans',
        fontSize: 'md',
        showPhoto: false,
        sectionOrder: [...getTemplateById('ats-friendly').recommendedSectionsOrder],
        hiddenSections: ['volunteer', 'references'],
      },
    }
  ),
];
