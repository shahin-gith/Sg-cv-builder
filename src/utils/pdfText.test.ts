import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { SAMPLE_PROFILE } from '../data/sampleData';
import { CV_TEMPLATES } from '../data/templates';
import { cloneProfileToCV } from './cvLogic';
import { buildCVPdfDocument } from './pdfExporter';
import { sanitizePdfText, wrapPdfLines } from './pdfText';

test('sanitizePdfText normalizes unsupported WinAnsi glyphs and preserves readable ASCII', () => {
  const cleaned = sanitizePdfText('★ Achieved “100%” uptime — Singapore • Class 3 → Verified ✓');
  assert.equal(cleaned, '* Achieved "100%" uptime - Singapore - Class 3 -> Verified [OK]');
  assert.equal(cleaned.includes('★'), false);
});

test('wrapPdfLines keeps every line within maxWidthMm even for unbroken URLs and long titles', () => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const maxWidthMm = 120;
  const sample =
    'Senior Marine Pipe Fitter & Offshore Hot-Work Supervisor https://linkedin.com/in/very-long-profile-url-without-any-spaces-for-singapore-shipyard-work-permit-holder';
  const lines = wrapPdfLines((s) => doc.getTextWidth(s), sample, maxWidthMm);

  assert.ok(lines.length >= 2);
  for (const line of lines) {
    assert.ok(
      doc.getTextWidth(line) <= maxWidthMm + 0.1,
      `Line exceeded maxWidth (${doc.getTextWidth(line)} > ${maxWidthMm}): ${line}`
    );
  }
});

test('buildCVPdfDocument builds valid A4 PDFs across all 23 templates without throwing on long fields', () => {
  const longProfile = {
    ...SAMPLE_PROFILE,
    personal: {
      ...SAMPLE_PROFILE.personal,
      fullName: 'Muhammad Arifur Rahman Chowdhury Al-Mamun Singapore Senior Technician',
      professionalTitle:
        'Senior Marine Welder, BCA CoreTrade Electrician & Heavy Logistics Supervisor',
      website: 'https://portfolio.example.com/singapore/construction-marine-driving-super-long-link',
    },
    experience: [
      {
        ...SAMPLE_PROFILE.experience[0],
        jobTitle:
          'Lead Building Management System, Switchgear & Offshore Instrumentation Maintenance Technician',
        company: 'Marina Integrated Marine & Facilities Engineering Consortium Pte Ltd',
        achievements: '★ Reduced downtime by 24% across 32-storey commercial & shipyard towers.',
      },
    ],
  };

  for (const tpl of CV_TEMPLATES) {
    const cv = cloneProfileToCV(longProfile, tpl.id, `${tpl.name} Test`);
    const doc = buildCVPdfDocument(cv);
    assert.ok(doc.getNumberOfPages() >= 1, `Expected >=1 page for ${tpl.id}`);
    const pdfBytes = doc.output('arraybuffer');
    assert.ok(pdfBytes.byteLength > 1000, `Expected non-empty PDF output for ${tpl.id}`);
  }
});
