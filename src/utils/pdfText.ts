import { TemplateId } from '../types/cv';

export type PdfLayoutVariant = 'header-band' | 'centered' | 'europass' | 'standard';

export function getPdfLayoutVariant(templateId: TemplateId): PdfLayoutVariant {
  if (
    templateId === 'executive-cv' ||
    templateId === 'construction-worker' ||
    templateId === 'driver-cv' ||
    templateId === 'marine-shipyard' ||
    templateId === 'heavy-driver-logistics' ||
    templateId === 'security-safety' ||
    templateId === 'restaurant-fnb'
  ) {
    return 'header-band';
  }
  if (templateId === 'classic-professional') {
    return 'centered';
  }
  if (templateId === 'europass-inspired' || templateId === 'european-cv') {
    return 'europass';
  }
  return 'standard';
}

export function isSectorCredentialTemplate(templateId: TemplateId): boolean {
  return (
    templateId === 'skilled-worker' ||
    templateId === 'technician-cv' ||
    templateId === 'process-oil-gas' ||
    templateId === 'it-digital-tech' ||
    templateId === 'facilities-cleaning-landscape' ||
    templateId === 'marine-shipyard' ||
    templateId === 'construction-worker' ||
    templateId === 'heavy-driver-logistics' ||
    templateId === 'driver-cv' ||
    templateId === 'restaurant-fnb' ||
    templateId === 'security-safety'
  );
}

/**
 * Normalizes text for jsPDF standard WinAnsiEncoding fonts (Helvetica / Times)
 * so unsupported Unicode glyphs (such as stars, arrows, curly quotes, or zero-width chars)
 * never corrupt glyph rendering or font width calculations.
 */
export function sanitizePdfText(raw: string): string {
  if (!raw) return '';
  const normalized = raw
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25AA\u25E6]/g, '-')
    .replace(/\u00B7/g, '|')
    .replace(/[\u2605\u2606\u2726\u2727]/g, '*')
    .replace(/[\u2713\u2714]/g, '[OK]')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-');

  // Keep printable ASCII + common Latin-1 accented characters supported by WinAnsi
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code <= 255)
    ) {
      out += normalized[i];
    } else if (code >= 0x0980 && code <= 0x09ff) {
      // Skip raw Bengali script characters in WinAnsi PDF fonts rather than rendering garbled bytes
      continue;
    } else {
      out += ' ';
    }
  }

  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Splits text strictly so every returned line fits within `maxWidthMm`
 * using the active font metrics (`measureWidth`). Handles long unbroken URLs/IDs.
 */
export function wrapPdfLines(
  measureWidth: (text: string) => number,
  rawText: string,
  maxWidthMm: number
): string[] {
  const safeMax = Math.max(12, maxWidthMm);
  const cleaned = sanitizePdfText(rawText);
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\r?\n/);
  const result: string[] = [];

  const pushHardWrappedToken = (token: string) => {
    let chunk = '';
    for (let i = 0; i < token.length; i++) {
      const candidate = chunk + token[i];
      if (chunk.length > 0 && measureWidth(candidate) > safeMax) {
        result.push(chunk);
        chunk = token[i];
      } else {
        chunk = candidate;
      }
    }
    if (chunk) result.push(chunk);
  };

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        if (measureWidth(word) <= safeMax) {
          currentLine = word;
        } else {
          pushHardWrappedToken(word);
        }
        continue;
      }

      const candidate = `${currentLine} ${word}`;
      if (measureWidth(candidate) <= safeMax) {
        currentLine = candidate;
      } else {
        result.push(currentLine);
        if (measureWidth(word) <= safeMax) {
          currentLine = word;
        } else {
          currentLine = '';
          pushHardWrappedToken(word);
        }
      }
    }

    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result;
}
