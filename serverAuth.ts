import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StoredUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  verified: boolean;
  otpHash?: string;
  otpExpiresAt?: number;
  otpAttempts?: number;
  createdAt: string;
  updatedAt: string;
  profile?: unknown;
  cvs?: unknown[];
}

interface StoreFileSchema {
  users: Record<string, StoredUserRecord>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.resolve(DATA_DIR, 'careercraft_store.json');

// Session secret read from env or generated securely per server instance in memory
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function ensureStoreFile(): StoreFileSchema {
  if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid data store path.');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const empty: StoreFileSchema = { users: {} };
    fs.writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as StoreFileSchema;
    return parsed && parsed.users ? parsed : { users: {} };
  } catch {
    return { users: {} };
  }
}

function writeStoreFile(data: StoreFileSchema): void {
  if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid data store path.');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = path.resolve(DATA_DIR, `store.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${normalizeEmail(email)}:${otp.trim()}`)
    .digest('hex');
}

export function signSessionToken(userId: string, email: string): string {
  const payload = {
    uid: userId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined
): { uid: string; email: string } | null {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { uid: string; email: string; exp: number };
    if (!parsed.uid || !parsed.email || Date.now() > parsed.exp) {
      return null;
    }
    return { uid: parsed.uid, email: parsed.email };
  } catch {
    return null;
  }
}

export function getUserByEmail(email: string): StoredUserRecord | null {
  const store = ensureStoreFile();
  return store.users[normalizeEmail(email)] ?? null;
}

export function upsertUser(record: StoredUserRecord): void {
  const store = ensureStoreFile();
  store.users[normalizeEmail(record.email)] = record;
  writeStoreFile(store);
}

export async function dispatchOtpEmail(
  email: string,
  otp: string
): Promise<{ deliveredViaEmail: boolean; previewOtp?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.EMAIL_FROM?.trim() || 'CareerCraft SG <onboarding@resend.dev>';

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: 'Your CareerCraft SG Verification OTP Code',
        html: `<p>Your CareerCraft SG verification code is:</p><h2 style="letter-spacing:4px;">${otp}</h2><p>This code expires in 10 minutes.</p>`,
      }),
    });

    if (res.ok) {
      return { deliveredViaEmail: true };
    }
  }

  // Preview / sandbox fallback when outbound email provider is not configured
  return { deliveredViaEmail: false, previewOtp: otp };
}
