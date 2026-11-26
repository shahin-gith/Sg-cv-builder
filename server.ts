import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  dispatchOtpEmail,
  generateOtpCode,
  getUserByEmail,
  hashOtp,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  signSessionToken,
  upsertUser,
  verifyPassword,
  verifySessionToken,
} from './serverAuth.ts';
import { extractCVMetadataFromPdfBytes } from './src/utils/pdfMetadata.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '12mb' }));
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/') && req.path.length > 5 && req.path.endsWith('/')) {
    req.url = req.path.slice(0, -1) + req.url.slice(req.path.length);
  }
  next();
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function extractGeminiErrorDetails(err: unknown): { code?: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'AI request failed.');
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; message?: string; status?: string } };
    if (parsed?.error) {
      return {
        code: typeof parsed.error.code === 'number' ? parsed.error.code : undefined,
        message: parsed.error.message || raw,
      };
    }
  } catch {
    // Plain error string
  }
  const maybeStatus = (err as { status?: number })?.status;
  return {
    code: typeof maybeStatus === 'number' ? maybeStatus : undefined,
    message: raw,
  };
}

function isRetryableGeminiError(err: unknown): boolean {
  const { code, message } = extractGeminiErrorDetails(err);
  if (code === 404 || code === 429 || code === 500 || code === 503) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('404') ||
    lower.includes('not_found') ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted')
  );
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  buildParams: (model: string) => Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  try {
    return await ai.models.generateContent(buildParams(PRIMARY_GEMINI_MODEL));
  } catch (primaryErr) {
    if (isRetryableGeminiError(primaryErr)) {
      return await ai.models.generateContent(buildParams(FALLBACK_GEMINI_MODEL));
    }
    throw primaryErr;
  }
}

function handleGeminiError(res: express.Response, err: unknown) {
  const { code, message } = extractGeminiErrorDetails(err);
  const lower = message.toLowerCase();

  if (message.includes('GEMINI_API_KEY')) {
    res.status(503).json({
      error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (code === 401 || code === 403 || lower.includes('api key') || lower.includes('permission_denied')) {
    res.status(503).json({
      error: 'Your Gemini API key is invalid or unauthorized. Please update GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (code === 429 || code === 503 || lower.includes('high demand') || lower.includes('unavailable')) {
    res.status(503).json({
      error: 'AI service is temporarily busy due to high demand. Please try again in a few seconds.',
    });
    return;
  }
  if (code === 404 || lower.includes('not_found')) {
    res.status(502).json({
      error: 'AI model could not be reached right now. Please try again shortly.',
    });
    return;
  }

  res.status(500).json({ error: message || 'AI request failed. Please try again.' });
}

function requireBearerAuth(
  req: express.Request,
  res: express.Response
): { uid: string; email: string } | null {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Authentication required. Please sign in and verify OTP.' });
    return null;
  }
  return session;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

/* ---------------- Email + Password + OTP Auth Routes ---------------- */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const existing = getUserByEmail(cleanEmail);
    if (existing && existing.verified) {
      res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const otp = generateOtpCode();
    const now = new Date().toISOString();

    upsertUser({
      id: existing?.id || `usr_${crypto.randomUUID()}`,
      email: cleanEmail,
      passwordHash: hash,
      passwordSalt: salt,
      verified: false,
      otpHash: hashOtp(cleanEmail, otp),
      otpExpiresAt: Date.now() + 10 * 60 * 1000,
      otpAttempts: 0,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      profile: existing?.profile,
      cvs: existing?.cvs,
    });

    const delivery = await dispatchOtpEmail(cleanEmail, otp);
    res.json({
      ok: true,
      email: cleanEmail,
      deliveredViaEmail: delivery.deliveredViaEmail,
      previewOtp: delivery.previewOtp,
      message: delivery.deliveredViaEmail
        ? 'Verification OTP sent to your email.'
        : 'OTP generated (preview mode: enter the verification code shown below).',
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Registration failed.',
    });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({ error: 'Please enter a valid 6-digit OTP code.' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const user = getUserByEmail(cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Account not found. Please register first.' });
      return;
    }
    if (!user.otpHash || !user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
      res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
      return;
    }
    if ((user.otpAttempts ?? 0) >= 5) {
      res.status(429).json({ error: 'Too many invalid attempts. Please resend a new OTP.' });
      return;
    }

    const candidateHash = hashOtp(cleanEmail, otp);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(user.otpHash, 'hex');
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!valid) {
      upsertUser({
        ...user,
        otpAttempts: (user.otpAttempts ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      res.status(400).json({ error: 'Incorrect OTP code. Please check and try again.' });
      return;
    }

    const verifiedUser = {
      ...user,
      verified: true,
      otpHash: undefined,
      otpExpiresAt: undefined,
      otpAttempts: 0,
      updatedAt: new Date().toISOString(),
    };
    upsertUser(verifiedUser);

    const token = signSessionToken(verifiedUser.id, verifiedUser.email);
    res.json({
      ok: true,
      token,
      user: { uid: verifiedUser.id, email: verifiedUser.email },
      hasCloudData: Boolean(verifiedUser.profile || verifiedUser.cvs?.length),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'OTP verification failed.',
    });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const user = getUserByEmail(cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    const otp = generateOtpCode();
    upsertUser({
      ...user,
      otpHash: hashOtp(cleanEmail, otp),
      otpExpiresAt: Date.now() + 10 * 60 * 1000,
      otpAttempts: 0,
      updatedAt: new Date().toISOString(),
    });

    const delivery = await dispatchOtpEmail(cleanEmail, otp);
    res.json({
      ok: true,
      deliveredViaEmail: delivery.deliveredViaEmail,
      previewOtp: delivery.previewOtp,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to resend OTP.',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, requireOtp } = req.body as {
      email?: string;
      password?: string;
      requireOtp?: boolean;
    };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const user = getUserByEmail(cleanEmail);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.verified || requireOtp) {
      const otp = generateOtpCode();
      upsertUser({
        ...user,
        otpHash: hashOtp(cleanEmail, otp),
        otpExpiresAt: Date.now() + 10 * 60 * 1000,
        otpAttempts: 0,
        updatedAt: new Date().toISOString(),
      });
      const delivery = await dispatchOtpEmail(cleanEmail, otp);
      res.json({
        ok: true,
        requiresOtp: true,
        email: cleanEmail,
        deliveredViaEmail: delivery.deliveredViaEmail,
        previewOtp: delivery.previewOtp,
      });
      return;
    }

    const token = signSessionToken(user.id, user.email);
    res.json({
      ok: true,
      requiresOtp: false,
      token,
      user: { uid: user.id, email: user.email },
      profile: user.profile ?? null,
      cvs: user.cvs ?? null,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Sign-in failed.',
    });
  }
});

app.get('/api/account/data', (req, res) => {
  const session = requireBearerAuth(req, res);
  if (!session) return;
  const user = getUserByEmail(session.email);
  if (!user || user.id !== session.uid) {
    res.status(404).json({ error: 'Account record not found.' });
    return;
  }
  res.json({
    email: user.email,
    profile: user.profile ?? null,
    cvs: user.cvs ?? null,
    updatedAt: user.updatedAt,
  });
});

app.put('/api/account/data', (req, res) => {
  const session = requireBearerAuth(req, res);
  if (!session) return;
  const user = getUserByEmail(session.email);
  if (!user || user.id !== session.uid) {
    res.status(404).json({ error: 'Account record not found.' });
    return;
  }

  const { profile, cvs } = req.body as { profile?: unknown; cvs?: unknown[] };
  upsertUser({
    ...user,
    profile: profile ?? user.profile,
    cvs: Array.isArray(cvs) ? cvs : user.cvs,
    updatedAt: new Date().toISOString(),
  });
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

/* ---------------- PDF Upload & Parse to Re-Edit ---------------- */

app.post('/api/cv/import-pdf', async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body as {
      pdfBase64?: string;
      fileName?: string;
    };
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      res.status(400).json({ error: 'PDF file payload is required.' });
      return;
    }

    const cleanB64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const buffer = Buffer.from(cleanB64, 'base64');
    if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'PDF file must be non-empty and under 8 MB.' });
      return;
    }

    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      res.status(400).json({ error: 'Uploaded file is not a valid PDF document.' });
      return;
    }

    // 1. Instant lossless extraction if exported from CareerCraft SG
    const embedded = extractCVMetadataFromPdfBytes(new Uint8Array(buffer));
    if (embedded) {
      res.json({
        source: 'embedded',
        cv: {
          ...embedded,
          id: `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: embedded.name || (fileName ? fileName.replace(/\.pdf$/i, '') : 'Imported CV'),
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // 2. Universal Gemini PDF parsing for external CV PDFs
    const ai = getGeminiClient();
    const response = await generateContentWithFallback(ai, (model) => ({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanB64,
            },
          },
          {
            text: 'Extract all CV / resume information from this PDF into the structured JSON schema. Only extract facts visibly written in the PDF—never invent details. Use YYYY-MM format for dates when month/year is visible, or leave blank if not stated.',
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personal: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                professionalTitle: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                address: { type: Type.STRING },
                nationality: { type: Type.STRING },
                dateOfBirth: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                website: { type: Type.STRING },
              },
              required: ['fullName', 'professionalTitle', 'phone', 'email'],
            },
            summary: { type: Type.STRING },
            careerObjective: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  jobTitle: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN },
                  responsibilities: { type: Type.STRING },
                  achievements: { type: Type.STRING },
                },
                required: ['company', 'jobTitle', 'responsibilities'],
              },
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  qualification: { type: Type.STRING },
                  fieldOfStudy: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  graduationDate: { type: Type.STRING },
                },
                required: ['institution', 'qualification'],
              },
            },
            skills: {
              type: Type.OBJECT,
              properties: {
                technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                soft: { type: Type.ARRAY, items: { type: Type.STRING } },
                industry: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['technical', 'soft', 'industry'],
            },
            languages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  language: { type: Type.STRING },
                  proficiency: { type: Type.STRING },
                },
                required: ['language', 'proficiency'],
              },
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  issuer: { type: Type.STRING },
                  date: { type: Type.STRING },
                  credentialId: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
            drivingLicence: {
              type: Type.OBJECT,
              properties: {
                classes: { type: Type.STRING },
                issuingCountry: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ['classes'],
            },
          },
          required: ['personal', 'summary', 'experience', 'education', 'skills'],
        },
      },
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      source: 'ai-parsed',
      parsed,
      suggestedName: fileName ? fileName.replace(/\.pdf$/i, '') : 'Uploaded PDF CV',
    });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

/* ---------------- Gemini AI Writing, Review & Job Match ---------------- */

app.post('/api/ai/rewrite', async (req, res) => {
  try {
    const {
      text,
      action = 'rewrite',
      style = 'Professional',
      sourceLanguage = 'auto',
      context,
    } = req.body as {
      text: string;
      action?: string;
      style?: string;
      sourceLanguage?: string;
      context?: {
        jobTitle?: string;
        experienceText?: string;
        skills?: string[];
      };
    };

    if (!text || typeof text !== 'string' || !text.trim() || text.length > 25000) {
      res.status(400).json({ error: 'Please provide text (under 25,000 characters) to analyze or rewrite.' });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a careful, truthful career writing assistant for Singapore and international job seekers (including workers applying in Singapore, Europe, and Canada).
STRICT TRUTHFULNESS RULES:
1. NEVER invent qualifications, job experience, employers, dates, metrics, achievements, or certificates that are not stated by the user.
2. Preserve the user's exact original facts and meaning.
3. If the user writes in Bengali (Bangla) or mixed Bengali/English, translate, summarize cleanly, and convert it into natural, accurate, well-structured professional English while preserving every factual detail.
4. Apply the requested writing style: ${style} (Professional, Concise, Formal, Achievement-focused, or ATS-friendly).
5. Return clear, factual JSON matching the requested schema.`;

    const promptByAction: Record<string, string> = {
      grammar: `Check the following text for spelling mistakes, grammar errors, punctuation issues, and awkward sentence structures. Return the corrected text preserving the original voice and facts, and list specific issues found.\n\nText:\n${text}`,
      rewrite: `Rewrite the following CV description in a ${style} style. If written in Bengali or rough notes, translate and organize into clean, active, concise English lines (one clear point per line if multiple duties) without inventing any new facts.\n\nRole/Context: ${context?.jobTitle || 'Not specified'}\nOriginal Text:\n${text}`,
      summary: `Create or refine a clean 2-4 sentence Professional Summary in a ${style} style using ONLY the facts provided below. If written in Bengali, translate and summarize into polished English. Do not invent years, numbers, or credentials not present.\n\nSource Notes:\n${text}\nExperience Context:\n${context?.experienceText || 'None provided'}`,
      objective: `Write or improve a concise 2-sentence Career Objective in a ${style} style grounded strictly in the user's actual background below. Translate cleanly if written in Bengali.\n\nSource Notes:\n${text}`,
      'bengali-to-english': `Translate, summarize, and organize the following Bengali (or mixed Bengali/English) CV description into clear, natural ${style} English suitable for a professional CV. If the input lists multiple duties or skills, organize them cleanly (one concise line per bullet). Preserve all facts accurately without adding anything.\n\nOriginal Input:\n${text}`,
      'suggest-skills': `Based ONLY on the work experience and notes below, suggest up to 8 relevant professional/technical skills that the candidate demonstrably already uses. Do not invent unrelated skills. Also provide a polished summary of those skills in correctedText.\n\nExperience Notes:\n${text}`,
    };

    const userPrompt = promptByAction[action] ?? promptByAction.rewrite;
    const langHint =
      sourceLanguage === 'bn'
        ? '\nNote: The input is in Bengali. Translate and summarize accurately into professional English.'
        : '';

    const response = await generateContentWithFallback(ai, (model) => ({
      model,
      contents: `${userPrompt}${langHint}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: {
              type: Type.STRING,
              description: 'The improved, grammatically correct professional English text.',
            },
            explanation: {
              type: Type.STRING,
              description: 'Brief 1-2 sentence explanation of improvements made.',
            },
            issuesFound: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of grammar, spelling, clarity, or structure issues fixed.',
            },
            suggestedSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Relevant skills grounded strictly in the provided text.',
            },
            preservedFactsNotice: {
              type: Type.STRING,
              description: 'Confirmation that no facts or credentials were invented.',
            },
          },
          required: ['correctedText', 'explanation', 'issuesFound', 'preservedFactsNotice'],
        },
      },
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.post('/api/ai/review', async (req, res) => {
  try {
    const { cv } = req.body as { cv: unknown };
    if (!cv || typeof cv !== 'object') {
      res.status(400).json({ error: 'CV payload is required for review.' });
      return;
    }

    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, (model) => ({
      model,
      contents: `Review this structured CV JSON thoroughly and provide actionable feedback.\n\nCV Data:\n${JSON.stringify(cv)}`,
      config: {
        systemInstruction: `You are an experienced international HR & CV reviewer.
Evaluate the CV objectively for grammar/spelling, missing info, weak descriptions, repeated sentences, date consistency, ATS readability, summary quality, and skills alignment.
Never fabricate qualifications or claim guaranteed job selection or guaranteed ATS compatibility.`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            summaryQuality: { type: Type.STRING },
            atsReadability: { type: Type.STRING },
            grammarFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingInfoWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            dateConsistencyNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakDescriptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  currentText: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ['section', 'currentText', 'suggestion'],
              },
            },
            repeatedContent: { type: Type.ARRAY, items: { type: Type.STRING } },
            sectionFeedback: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  status: { type: Type.STRING },
                  feedback: { type: Type.STRING },
                },
                required: ['section', 'status', 'feedback'],
              },
            },
            disclaimer: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'summaryQuality',
            'atsReadability',
            'grammarFindings',
            'missingInfoWarnings',
            'dateConsistencyNotes',
            'weakDescriptions',
            'repeatedContent',
            'sectionFeedback',
            'disclaimer',
          ],
        },
      },
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.post('/api/ai/optimize-job', async (req, res) => {
  try {
    const { cv, jobDescription } = req.body as {
      cv: unknown;
      jobDescription: string;
    };

    if (!cv || !jobDescription?.trim() || jobDescription.length > 25000) {
      res.status(400).json({ error: 'CV data and a Job Description (under 25,000 characters) are required.' });
      return;
    }

    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, (model) => ({
      model,
      contents: `Analyze the following Job Description against the candidate's CV.\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE CV:\n${JSON.stringify(cv)}`,
      config: {
        systemInstruction: `You are an ethical career advisor optimizing a candidate's CV for a specific job description.
Identify skills already present in the candidate's CV, highlight missing skills separately as gaps without adding unpossessed skills, and tailor existing summary/descriptions strictly from real facts.`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roleTitle: { type: Type.STRING },
            matchScore: { type: Type.INTEGER },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingSkillsGap: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedExperienceToEmphasize: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tailoredSummary: { type: Type.STRING },
            bulletSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  experienceTitle: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  suggestedText: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['experienceTitle', 'originalText', 'suggestedText', 'reason'],
              },
            },
            disclaimer: { type: Type.STRING },
          },
          required: [
            'roleTitle',
            'matchScore',
            'matchedSkills',
            'missingSkillsGap',
            'recommendedExperienceToEmphasize',
            'tailoredSummary',
            'bulletSuggestions',
            'disclaimer',
          ],
        },
      },
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

/* ---------------- One-Box AI Custom CV Generator ---------------- */

const VALID_TEMPLATE_IDS_PROMPT = [
  'construction-worker',
  'marine-shipyard',
  'driver-cv',
  'heavy-driver-logistics',
  'hotel-hospitality',
  'restaurant-fnb',
  'technician-cv',
  'process-oil-gas',
  'skilled-worker',
  'healthcare-nursing',
  'security-safety',
  'facilities-cleaning-landscape',
  'retail-customer-service',
  'it-digital-tech',
  'office-admin',
  'modern-professional',
  'executive-cv',
  'classic-professional',
  'minimalist',
  'ats-friendly',
  'european-cv',
  'europass-inspired',
  'canadian-resume',
].join(', ');

app.post('/api/ai/generate-cv', async (req, res) => {
  try {
    const {
      rawText,
      targetMarket = 'auto',
      writingStyle = 'Professional',
    } = req.body as {
      rawText?: string;
      targetMarket?: string;
      writingStyle?: string;
    };

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 10) {
      res.status(400).json({ error: 'Please paste or write the person’s CV details (at least 10 characters).' });
      return;
    }
    if (rawText.length > 25000) {
      res.status(400).json({ error: 'Input notes must be under 25,000 characters.' });
      return;
    }

    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, (model) => ({
      model,
      contents: `Target Market Preference: ${targetMarket}
Writing Style: ${writingStyle}

PERSON'S RAW CV INFORMATION (may be Bengali, English, or mixed notes):
${rawText}`,
      config: {
        systemInstruction: `You are an expert international CV architect building a clean, ready-to-customize CV from a single block of candidate notes (often written in Bengali, English, or mixed notes for Singapore, European, Canadian, or global jobs).

STRICT RULES:
1. Extract ONLY facts stated in the input. NEVER invent employers, dates, qualifications, licences, phone numbers, or achievements.
2. If any notes are in Bengali (Bangla), translate and polish them into natural, grammatically clean ${writingStyle} English.
3. Put email addresses ONLY in personal.email (NEVER in personal.website). Set experience[].current = true when the candidate says Present, current, এখন পর্যন্ত, or বর্তমান.
4. For optional arrays (education, languages, certifications, training, projects, volunteer, references): if the user did NOT mention them, return an empty array [] — never insert "Not Specified" placeholders.
5. Choose the single most fitting template ID for recommendedTemplateId from ONLY this exact list:
${VALID_TEMPLATE_IDS_PROMPT}
   - Example: Marine welder/fitter -> "marine-shipyard"; Construction/BCA -> "construction-worker"; Class 3 driver -> "driver-cv"; Prime mover/Class 4/5/forklift -> "heavy-driver-logistics"; Hotel -> "hotel-hospitality"; Restaurant/Chef/F&B -> "restaurant-fnb"; Electrician/HVAC/BMS -> "technician-cv"; Oil/Gas/Process -> "process-oil-gas"; Nurse/Caregiver -> "healthcare-nursing"; Security/WSH -> "security-safety"; Cleaning/Landscape -> "facilities-cleaning-landscape"; Retail -> "retail-customer-service"; IT/Software -> "it-digital-tech"; Office/Admin -> "office-admin"; Europe market -> "europass-inspired" or "european-cv"; Canada market -> "canadian-resume".
6. Format experience dates as YYYY-MM when month & year are available, or YYYY when only year is stated, or "" if missing. Keep responsibilities concise, one bullet line per duty separated by "\\n".
7. Write a strong 2–4 sentence Professional Summary grounded strictly in the provided facts (even if not explicitly written as a summary in the notes, synthesize one truthfully from the person's real experience & certifications).`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cvName: { type: Type.STRING },
            recommendedTemplateId: { type: Type.STRING },
            recommendedAccentColor: { type: Type.STRING },
            templateReason: { type: Type.STRING },
            personal: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                professionalTitle: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                address: { type: Type.STRING },
                nationality: { type: Type.STRING },
                dateOfBirth: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                website: { type: Type.STRING },
              },
              required: ['fullName', 'professionalTitle'],
            },
            summary: { type: Type.STRING },
            careerObjective: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  jobTitle: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN },
                  responsibilities: { type: Type.STRING },
                  achievements: { type: Type.STRING },
                },
                required: ['jobTitle', 'company', 'responsibilities'],
              },
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  qualification: { type: Type.STRING },
                  fieldOfStudy: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  graduationDate: { type: Type.STRING },
                },
                required: ['institution', 'qualification'],
              },
            },
            skills: {
              type: Type.OBJECT,
              properties: {
                technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                soft: { type: Type.ARRAY, items: { type: Type.STRING } },
                industry: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['technical', 'soft', 'industry'],
            },
            languages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  language: { type: Type.STRING },
                  proficiency: { type: Type.STRING },
                },
                required: ['language', 'proficiency'],
              },
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  issuer: { type: Type.STRING },
                  date: { type: Type.STRING },
                  credentialId: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
            drivingLicence: {
              type: Type.OBJECT,
              properties: {
                classes: { type: Type.STRING },
                issuingCountry: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ['classes'],
            },
            training: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  provider: { type: Type.STRING },
                  date: { type: Type.STRING },
                  details: { type: Type.STRING },
                },
                required: ['title'],
              },
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  date: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
            volunteer: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  organization: { type: Type.STRING },
                  role: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['organization', 'role'],
              },
            },
            references: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  title: { type: Type.STRING },
                  company: { type: Type.STRING },
                  contact: { type: Type.STRING },
                },
                required: ['name'],
              },
            },
          },
          required: [
            'cvName',
            'recommendedTemplateId',
            'recommendedAccentColor',
            'templateReason',
            'personal',
            'summary',
            'experience',
            'education',
            'skills',
          ],
        },
      },
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({
    error: 'AI service route not found on server. Please refresh the page and try again.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareerCraft SG server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
