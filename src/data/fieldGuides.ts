export interface FieldGuide {
  en: string;
  bn: string;
  example: string;
}

export const FIELD_GUIDES: Record<string, FieldGuide> = {
  fullName: {
    en: 'Enter your full legal name as shown on your passport, NRIC, or work permit.',
    bn: 'পাসপোর্ট বা ওয়ার্ক পারমিট অনুযায়ী আপনার পূর্ণ নাম লিখুন।',
    example: 'Arifur Rahman',
  },
  professionalTitle: {
    en: 'Write your target job role or trade specialization (2–5 words).',
    bn: 'আপনি যে পদের জন্য আবেদন করছেন তার নাম লিখুন।',
    example: 'Senior Electrical & BMS Technician',
  },
  phone: {
    en: 'Include your country code so international employers can reach you on WhatsApp or call.',
    bn: 'কান্ট্রি কোডসহ সচল মোবাইল নম্বর দিন (যেমন +65 বা +880)।',
    example: '+65 8412 3904',
  },
  email: {
    en: 'Use a clean, professional email address you check regularly.',
    bn: 'নিয়মিত ব্যবহার করেন এমন একটি প্রফেশনাল ইমেইল দিন।',
    example: 'arifur.rahman.sg@example.com',
  },
  address: {
    en: 'City and country (or postal area) is enough—you do not need a full street unit for safety.',
    bn: 'বর্তমান শহর ও দেশের নাম লিখুন (পুরো বাসার ঠিকানা না দিলেও চলবে)।',
    example: 'Jurong West, Singapore',
  },
  nationality: {
    en: 'Helpful for Singapore and European work visa screening; optional for Canadian resumes.',
    bn: 'সিঙ্গাপুর ও ইউরোপের চাকরির ক্ষেত্রে জাতীয়তা ও ভিসার ধরন উল্লেখ করা ভালো।',
    example: 'Bangladeshi (Singapore Work Permit Holder)',
  },
  dateOfBirth: {
    en: 'Commonly used in European/Europass CVs; leave blank for Canada or ATS-only resumes.',
    bn: 'ইউরোপীয় সিভিতে জন্মতারিখ দেওয়া যায়; কানাডার রিজিউমে খালি রাখতে পারেন।',
    example: '1991-05-14',
  },
  linkedin: {
    en: 'Paste your LinkedIn profile URL if you have one.',
    bn: 'আপনার লিংকডইন প্রোফাইল লিংক থাকলে দিন।',
    example: 'linkedin.com/in/arifur-rahman-tech',
  },
  website: {
    en: 'Optional portfolio, work sample link, or trade credential verification page.',
    bn: 'কাজের পোর্টফোলিও বা ওয়েবসাইট থাকলে লিংক দিন (ঐচ্ছিক)।',
    example: 'https://portfolio.example.com',
  },
  summary: {
    en: 'Write 2–4 sentences covering your years of experience, core trade/skills, and safety or licensing credentials. You can write in Bengali and click AI সাজান.',
    bn: 'আপনার মোট অভিজ্ঞতা, মূল দক্ষতা ও সার্টিফিকেট ২–৪ লাইনে লিখুন। বাংলায় লিখে "বাংলা → English AI সাজান" বাটনে ক্লিক করলে সুন্দর ইংরেজিতে সাজিয়ে দিবে।',
    example: 'Detail-oriented Electrical Technician with 8+ years in commercial maintenance and BCA CoreTrade certification.',
  },
  careerObjective: {
    en: 'Best if changing careers or applying for entry-level roles: state what role you want and how your skills help.',
    bn: 'নতুন পেশায় বা এন্ট্রি-লেভেলে আবেদন করলে আপনার লক্ষ্য ও দক্ষতা ২ লাইনে লিখুন।',
    example: 'Seeking a Class 3 Delivery Driver role where my 5-year clean safety record ensures on-time logistics.',
  },
  jobTitle: {
    en: 'Your official job title at that company.',
    bn: 'ঐ কোম্পানিতে আপনার পদবির নাম লিখুন।',
    example: 'Electrical Technician / Site Supervisor',
  },
  company: {
    en: 'Employer or contractor company name.',
    bn: 'প্রতিষ্ঠান বা কোম্পানির নাম লিখুন।',
    example: 'Marina Integrated Facilities Pte Ltd',
  },
  location: {
    en: 'City and country where you worked.',
    bn: 'যে শহর ও দেশে কাজ করেছেন তা লিখুন।',
    example: 'Singapore',
  },
  responsibilities: {
    en: 'List daily duties starting with action verbs (one duty per line). You may type rough Bengali notes and use AI Rewrite.',
    bn: 'প্রতিদিন কী কী কাজ করতেন তা প্রতি লাইনে একটি করে লিখুন। বাংলাতে লিখলেও AI দিয়ে সুন্দর ইংরেজি বুলেট পয়েন্ট বানানো যাবে।',
    example: 'Performed preventive maintenance on LV switchgear and HVAC pumps.',
  },
  achievements: {
    en: 'Highlight measurable results: time saved, zero accidents, awards, or project deadlines beaten.',
    bn: 'কাজের বিশেষ সাফল্য লিখুন (যেমন: শূন্য দুর্ঘটনা, সময় বাঁচানো, বা পুরস্কার পাওয়া)।',
    example: 'Reduced equipment downtime by 24% and maintained zero safety incidents.',
  },
  education: {
    en: 'Include your highest diploma, degree, vocational trade school, or secondary certificate.',
    bn: 'আপনার সর্বোচ্চ শিক্ষাগত যোগ্যতা বা কারিগরি ডিপ্লোমার তথ্য দিন।',
    example: 'Diploma in Electrical Engineering — Dhaka Polytechnic Institute',
  },
  skills: {
    en: 'Add specific tools, machines, software, safety standards, and soft skills employers search for.',
    bn: 'আপনি যেসব যন্ত্র, সফটওয়্যার, সেফটি নিয়ম ও কাজে দক্ষ তা যুক্ত করুন।',
    example: 'LV Switchgear · Fluke Testing · WSH LOTO · Team Coordination',
  },
  certifications: {
    en: 'List Singapore/international trade licences & safety passes (BCA CoreTrade, CSOC, Forklift, WSQ).',
    bn: 'আপনার ট্রেড সার্টিফিকেট ও সেফটি পাস লিখুন (যেমন: BCA CoreTrade, CSOC, WSQ)।',
    example: 'BCA CoreTrade Electrical (ID: BCA-CT-88421)',
  },
  drivingLicence: {
    en: 'State your licence classes, issuing country, and clean safety record if relevant to the job.',
    bn: 'ড্রাইভিং লাইসেন্সের ক্লাস, দেশ এবং নিরাপদ ড্রাইভিং রেকর্ড লিখুন।',
    example: 'Singapore Class 3 & International Driving Permit (Clean record since 2019)',
  },
  languages: {
    en: 'List languages you speak/read and your proficiency level (Native, Fluent, Conversational, Basic).',
    bn: 'আপনি কোন কোন ভাষা পারেন এবং কতটুকু দক্ষ তা উল্লেখ করুন।',
    example: 'English (Fluent) · Bengali (Native) · Malay (Conversational)',
  },
  training: {
    en: 'Short practical courses such as LOTO, Confined Space, First Aid, or Forklift refresher.',
    bn: 'সংক্ষিপ্ত নিরাপত্তা বা কারিগরি প্রশিক্ষণের নাম ও প্রতিষ্ঠান লিখুন।',
    example: 'Lockout / Tagout (LOTO) Safety — NTUC LearningHub',
  },
  projects: {
    en: 'Notable installations, retrofits, or site handovers you contributed to.',
    bn: 'গুরুত্বপূর্ণ যেসব প্রজেক্ট বা সাইটে কাজ করেছেন তার সংক্ষিপ্ত বিবরণ দিন।',
    example: 'LED & VFD Energy Retrofit — Cut electricity draw by 16%.',
  },
  references: {
    en: 'Former supervisor contact details, or simply write "Available upon request".',
    bn: 'পূর্বের সুপারভাইজারের নাম ও পদবি দিন, অথবা "Available upon request" লিখুন।',
    example: 'Tan Wei Ming · Facilities Manager · Available upon request',
  },
};
