import type { CVDocument } from '../types/cv.ts';

const METADATA_PREFIX = 'CAREERCRAFT_CV_V1:';

/**
 * Encodes a CVDocument as UTF-8 Base64 suitable for embedding inside PDF metadata.
 * Strips oversized data-URL photos (>40KB) if needed so the PDF Info dictionary stays compact.
 */
export function encodeCVMetadataPayload(cv: CVDocument): string {
  const clone: CVDocument = structuredClone(cv);
  if (clone.personal.photoUrl && clone.personal.photoUrl.length > 40000) {
    clone.personal.photoUrl = '';
  }
  const json = JSON.stringify(clone);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(bytes).toString('base64')
      : btoa(binary);
  return `${METADATA_PREFIX}${b64}`;
}

/**
 * Scans raw PDF bytes (latin1/ascii safe) for an embedded CAREERCRAFT_CV_V1 payload
 * and returns the decoded CVDocument if present and valid.
 */
export function extractCVMetadataFromPdfBytes(pdfBuffer: Uint8Array): CVDocument | null {
  try {
    // Decode as latin1 so byte offsets and ASCII markers remain intact
    const rawText = new TextDecoder('latin1').decode(pdfBuffer);
    const startIdx = rawText.indexOf(METADATA_PREFIX);
    if (startIdx === -1) return null;

    const afterPrefix = rawText.slice(startIdx + METADATA_PREFIX.length);
    // Base64 characters stop at PDF delimiter ')' or whitespace/control chars
    const match = afterPrefix.match(/^([A-Za-z0-9+/=]+)/);
    if (!match?.[1]) return null;

    const b64 = match[1];
    let jsonStr: string;
    if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(b64, 'base64').toString('utf8');
    } else {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      jsonStr = new TextDecoder('utf-8').decode(bytes);
    }

    const parsed = JSON.parse(jsonStr) as CVDocument;
    if (!parsed || typeof parsed !== 'object' || !parsed.personal || !parsed.style) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
