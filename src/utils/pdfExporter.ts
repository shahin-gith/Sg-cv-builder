import { jsPDF } from 'jspdf';
import { getTemplateById, SECTION_LABELS } from '../data/templates';
import { CVDocument, CVFontFamily, CVFontSize, CVSectionKey } from '../types/cv';
import { formatDateRange } from './cvLogic';
import { encodeCVMetadataPayload } from './pdfMetadata';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [29, 78, 216];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return [29, 78, 216];
  return [r, g, b];
}

function mapPdfFont(family: CVFontFamily): 'helvetica' | 'times' {
  if (family === 'Source Serif 4' || family === 'Lora') return 'times';
  return 'helvetica';
}

function getBaseFontSize(size: CVFontSize): number {
  if (size === 'sm') return 9;
  if (size === 'lg') return 11;
  return 10;
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'CV_Document'
  );
}

export async function exportCVToPDF(cv: CVDocument): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: cv.name || 'CV Document',
    subject: 'CareerCraft SG Structured CV',
    author: cv.personal.fullName || 'Applicant',
    keywords: encodeCVMetadataPayload(cv),
    creator: 'CareerCraft SG',
  });

  const tpl = getTemplateById(cv.templateId);
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 16;
  const marginBottom = 16;
  const contentWidth = pageWidth - marginX * 2;

  const fontName = mapPdfFont(cv.style.fontFamily);
  const basePt = getBaseFontSize(cv.style.fontSize);
  const lineMm = basePt * 0.44;
  const accent = hexToRgb(cv.style.accentColor || tpl.defaultAccentColor);
  const showPhoto = tpl.supportsPhoto && cv.style.showPhoto && Boolean(cv.personal.photoUrl);

  const isSidebarLayout =
    cv.templateId === 'modern-professional' ||
    cv.templateId === 'office-admin' ||
    cv.templateId === 'technician-cv';

  const isHeaderBand =
    cv.templateId === 'executive-cv' ||
    cv.templateId === 'construction-worker' ||
    cv.templateId === 'driver-cv';

  const isEuropass =
    cv.templateId === 'europass-inspired' || cv.templateId === 'european-cv';

  const isCenteredHeader = cv.templateId === 'classic-professional';

  let cursorY = marginTop;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
  };

  const drawWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    pt: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = [30, 41, 59],
    extraSpacing = 1.2
  ) => {
    if (!text.trim()) return;
    doc.setFont(fontName, style);
    doc.setFontSize(pt);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const step = pt * 0.43;
    for (const line of lines) {
      ensureSpace(step + 1);
      doc.text(line, x, cursorY);
      cursorY += step;
    }
    cursorY += extraSpacing;
  };

  const addPhotoIfPresent = (x: number, y: number, w: number, h: number) => {
    if (!showPhoto || !cv.personal.photoUrl) return;
    try {
      const format = cv.personal.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(cv.personal.photoUrl, format, x, y, w, h, undefined, 'FAST');
    } catch {
      // Skip malformed image silently rather than breaking PDF download
    }
  };

  const contactItems = [
    cv.personal.phone,
    cv.personal.email,
    cv.personal.address,
    cv.personal.linkedin,
    cv.personal.website,
  ].filter((v) => v && v.trim());

  const optionalMetaItems = [
    cv.personal.nationality ? `Nationality: ${cv.personal.nationality}` : '',
    cv.personal.dateOfBirth && cv.templateId !== 'canadian-resume'
      ? `DOB: ${cv.personal.dateOfBirth}`
      : '',
  ].filter(Boolean);

  // HEADER RENDERING
  if (isHeaderBand) {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageWidth, 38, 'F');

    const textMaxW = showPhoto ? contentWidth - 28 : contentWidth;
    doc.setFont(fontName, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(cv.personal.fullName || 'Unnamed Candidate', marginX, 15);

    if (cv.personal.professionalTitle) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(226, 232, 240);
      doc.text(cv.personal.professionalTitle, marginX, 22);
    }

    if (contactItems.length > 0) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(241, 245, 249);
      const contactLines = doc.splitTextToSize(contactItems.join('  •  '), textMaxW) as string[];
      doc.text(contactLines.slice(0, 2), marginX, 28.5);
    }

    if (showPhoto) {
      addPhotoIfPresent(pageWidth - marginX - 24, 7, 24, 24);
    }
    cursorY = 46;
  } else if (isCenteredHeader) {
    if (showPhoto) {
      addPhotoIfPresent(pageWidth / 2 - 11, cursorY, 22, 22);
      cursorY += 26;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(19);
    doc.setTextColor(15, 23, 42);
    doc.text(cv.personal.fullName || 'Unnamed Candidate', pageWidth / 2, cursorY, {
      align: 'center',
    });
    cursorY += 6.5;

    if (cv.personal.professionalTitle) {
      doc.setFont(fontName, 'italic');
      doc.setFontSize(11);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(cv.personal.professionalTitle, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 5.5;
    }

    if (contactItems.length > 0) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(contactItems.join('  |  '), contentWidth) as string[];
      for (const l of lines) {
        doc.text(l, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 4;
      }
    }
    cursorY += 2;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 6;
  } else {
    // Standard / European / Sidebar top header
    const textMaxW = showPhoto ? contentWidth - 28 : contentWidth;
    const headerStartY = cursorY;

    if (cv.templateId === 'europass-inspired') {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text('CURRICULUM VITAE · EUROPASS-INSPIRED FORMAT', marginX, cursorY);
      cursorY += 6;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(19);
    doc.setTextColor(15, 23, 42);
    doc.text(cv.personal.fullName || 'Unnamed Candidate', marginX, cursorY);
    cursorY += 6.5;

    if (cv.personal.professionalTitle) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(cv.personal.professionalTitle, marginX, cursorY);
      cursorY += 5.5;
    }

    if (contactItems.length > 0) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const contactLines = doc.splitTextToSize(contactItems.join('  ·  '), textMaxW) as string[];
      for (const line of contactLines) {
        doc.text(line, marginX, cursorY);
        cursorY += 4;
      }
    }

    if (optionalMetaItems.length > 0) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(optionalMetaItems.join('  ·  '), marginX, cursorY);
      cursorY += 4;
    }

    if (showPhoto) {
      addPhotoIfPresent(pageWidth - marginX - 24, headerStartY, 24, 24);
      cursorY = Math.max(cursorY, headerStartY + 26);
    }

    cursorY += 2;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(isSidebarLayout || isEuropass ? 0.6 : 0.35);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 6;
  }

  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    cursorY += 2;
    if (isEuropass) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(basePt + 0.5);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(title.toUpperCase(), marginX, cursorY);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX + 44, cursorY - 1, pageWidth - marginX, cursorY - 1);
      cursorY += 5;
      return;
    }

    doc.setFont(fontName, 'bold');
    doc.setFontSize(basePt + 1);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(title.toUpperCase(), marginX, cursorY);
    cursorY += 1.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 4.5;
  };

  const renderSection = (key: CVSectionKey) => {
    const labelX = isEuropass ? marginX + 44 : marginX;
    const labelWidth = isEuropass ? contentWidth - 44 : contentWidth;

    switch (key) {
      case 'summary': {
        const text = cv.useObjectiveInsteadOfSummary ? cv.careerObjective : cv.summary;
        if (!text.trim()) return;
        drawSectionHeading(
          cv.useObjectiveInsteadOfSummary ? 'Career Objective' : SECTION_LABELS.summary
        );
        drawWrappedText(text, labelX, labelWidth, basePt, 'normal', [30, 41, 59], 2);
        break;
      }

      case 'experience': {
        if (cv.experience.length === 0) return;
        drawSectionHeading(SECTION_LABELS.experience);
        for (const exp of cv.experience) {
          ensureSpace(18);
          const dateRange = formatDateRange(exp.startDate, exp.endDate, exp.current);
          doc.setFont(fontName, 'bold');
          doc.setFontSize(basePt + 0.3);
          doc.setTextColor(15, 23, 42);
          doc.text(exp.jobTitle || 'Role', labelX, cursorY);

          if (dateRange) {
            doc.setFont(fontName, 'normal');
            doc.setFontSize(basePt - 1);
            doc.setTextColor(100, 116, 139);
            doc.text(dateRange, pageWidth - marginX, cursorY, { align: 'right' });
          }
          cursorY += lineMm;

          const subLine = [exp.company, exp.location].filter(Boolean).join(' · ');
          if (subLine) {
            doc.setFont(fontName, 'bold');
            doc.setFontSize(basePt - 0.5);
            doc.setTextColor(accent[0], accent[1], accent[2]);
            doc.text(subLine, labelX, cursorY);
            cursorY += lineMm;
          }

          const bullets = exp.responsibilities
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          for (const b of bullets) {
            drawWrappedText(`•  ${b}`, labelX + 2, labelWidth - 2, basePt - 0.5, 'normal', [51, 65, 85], 0.4);
          }

          const achLines = exp.achievements
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          if (achLines.length > 0) {
            for (const a of achLines) {
              drawWrappedText(`★  ${a}`, labelX + 2, labelWidth - 2, basePt - 0.5, 'italic', [15, 23, 42], 0.4);
            }
          }
          cursorY += 2.5;
        }
        break;
      }

      case 'education': {
        if (cv.education.length === 0) return;
        drawSectionHeading(SECTION_LABELS.education);
        for (const edu of cv.education) {
          ensureSpace(12);
          const range = formatDateRange(edu.startDate, edu.graduationDate, false);
          doc.setFont(fontName, 'bold');
          doc.setFontSize(basePt);
          doc.setTextColor(15, 23, 42);
          doc.text(
            [edu.qualification, edu.fieldOfStudy].filter(Boolean).join(' in ') || 'Qualification',
            labelX,
            cursorY
          );
          if (range) {
            doc.setFont(fontName, 'normal');
            doc.setFontSize(basePt - 1);
            doc.setTextColor(100, 116, 139);
            doc.text(range, pageWidth - marginX, cursorY, { align: 'right' });
          }
          cursorY += lineMm;
          if (edu.institution) {
            drawWrappedText(edu.institution, labelX, labelWidth, basePt - 0.5, 'normal', [71, 85, 105], 1.5);
          }
        }
        break;
      }

      case 'skills': {
        const hasAny =
          cv.skills.technical.length > 0 ||
          cv.skills.soft.length > 0 ||
          cv.skills.industry.length > 0;
        if (!hasAny) return;
        drawSectionHeading(SECTION_LABELS.skills);
        if (cv.skills.technical.length > 0) {
          drawWrappedText(
            `Technical: ${cv.skills.technical.join(' · ')}`,
            labelX,
            labelWidth,
            basePt - 0.3,
            'normal',
            [30, 41, 59],
            1
          );
        }
        if (cv.skills.industry.length > 0) {
          drawWrappedText(
            `Industry & Compliance: ${cv.skills.industry.join(' · ')}`,
            labelX,
            labelWidth,
            basePt - 0.3,
            'normal',
            [30, 41, 59],
            1
          );
        }
        if (cv.skills.soft.length > 0) {
          drawWrappedText(
            `Interpersonal: ${cv.skills.soft.join(' · ')}`,
            labelX,
            labelWidth,
            basePt - 0.3,
            'normal',
            [30, 41, 59],
            1.5
          );
        }
        break;
      }

      case 'certifications': {
        if (cv.certifications.length === 0) return;
        drawSectionHeading(SECTION_LABELS.certifications);
        for (const cert of cv.certifications) {
          ensureSpace(9);
          const meta = [cert.issuer, cert.date, cert.credentialId ? `ID: ${cert.credentialId}` : '']
            .filter(Boolean)
            .join(' · ');
          drawWrappedText(cert.name, labelX, labelWidth, basePt - 0.2, 'bold', [15, 23, 42], 0.3);
          if (meta) {
            drawWrappedText(meta, labelX, labelWidth, basePt - 1, 'normal', [100, 116, 139], 1.2);
          }
        }
        break;
      }

      case 'drivingLicence': {
        if (!cv.drivingLicence.classes.trim()) return;
        drawSectionHeading(SECTION_LABELS.drivingLicence);
        const line = [
          cv.drivingLicence.classes,
          cv.drivingLicence.issuingCountry ? `Issued in ${cv.drivingLicence.issuingCountry}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        drawWrappedText(line, labelX, labelWidth, basePt - 0.2, 'bold', [15, 23, 42], 0.5);
        if (cv.drivingLicence.notes) {
          drawWrappedText(
            cv.drivingLicence.notes,
            labelX,
            labelWidth,
            basePt - 0.8,
            'normal',
            [71, 85, 105],
            1.5
          );
        }
        break;
      }

      case 'languages': {
        if (cv.languages.length === 0) return;
        drawSectionHeading(SECTION_LABELS.languages);
        const line = cv.languages
          .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`)
          .join('  ·  ');
        drawWrappedText(line, labelX, labelWidth, basePt - 0.3, 'normal', [30, 41, 59], 1.8);
        break;
      }

      case 'training': {
        if (cv.training.length === 0) return;
        drawSectionHeading(SECTION_LABELS.training);
        for (const trn of cv.training) {
          ensureSpace(10);
          drawWrappedText(
            `${trn.title}${trn.date ? ` (${trn.date})` : ''}`,
            labelX,
            labelWidth,
            basePt - 0.2,
            'bold',
            [15, 23, 42],
            0.3
          );
          if (trn.provider || trn.details) {
            drawWrappedText(
              [trn.provider, trn.details].filter(Boolean).join(' — '),
              labelX,
              labelWidth,
              basePt - 0.8,
              'normal',
              [71, 85, 105],
              1.3
            );
          }
        }
        break;
      }

      case 'projects': {
        if (cv.projects.length === 0) return;
        drawSectionHeading(SECTION_LABELS.projects);
        for (const p of cv.projects) {
          ensureSpace(10);
          drawWrappedText(
            [p.name, p.role, p.date].filter(Boolean).join(' · '),
            labelX,
            labelWidth,
            basePt - 0.2,
            'bold',
            [15, 23, 42],
            0.3
          );
          if (p.description) {
            drawWrappedText(p.description, labelX, labelWidth, basePt - 0.7, 'normal', [51, 65, 85], 1.3);
          }
        }
        break;
      }

      case 'volunteer': {
        if (cv.volunteer.length === 0) return;
        drawSectionHeading(SECTION_LABELS.volunteer);
        for (const v of cv.volunteer) {
          ensureSpace(10);
          const range = formatDateRange(v.startDate, v.endDate, !v.endDate);
          drawWrappedText(
            `${v.role} — ${v.organization}${range ? ` (${range})` : ''}`,
            labelX,
            labelWidth,
            basePt - 0.2,
            'bold',
            [15, 23, 42],
            0.3
          );
          if (v.description) {
            drawWrappedText(v.description, labelX, labelWidth, basePt - 0.7, 'normal', [51, 65, 85], 1.3);
          }
        }
        break;
      }

      case 'references': {
        if (cv.references.length === 0) return;
        drawSectionHeading(SECTION_LABELS.references);
        for (const r of cv.references) {
          ensureSpace(8);
          drawWrappedText(
            [r.name, r.title, r.company, r.contact].filter(Boolean).join(' · '),
            labelX,
            labelWidth,
            basePt - 0.4,
            'normal',
            [51, 65, 85],
            1
          );
        }
        break;
      }
    }
  };

  for (const key of cv.style.sectionOrder) {
    if (!cv.style.hiddenSections.includes(key)) {
      renderSection(key);
    }
  }

  doc.save(`${sanitizeFileName(cv.name)}.pdf`);
}
