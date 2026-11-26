import { jsPDF } from 'jspdf';
import { getTemplateById, SECTION_LABELS } from '../data/templates';
import { CVDocument, CVFontFamily, CVFontSize, CVSectionKey } from '../types/cv';
import { formatDateRange } from './cvLogic';
import { encodeCVMetadataPayload } from './pdfMetadata';
import {
  getPdfLayoutVariant,
  isSectorCredentialTemplate,
  sanitizePdfText,
  wrapPdfLines,
} from './pdfText';

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
  if (size === 'sm') return 9.5;
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

export function buildCVPdfDocument(cv: CVDocument): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setCharSpace(0);
  doc.setProperties({
    title: sanitizePdfText(cv.name) || 'CV Document',
    subject: 'CareerCraft SG Structured CV',
    author: sanitizePdfText(cv.personal.fullName) || 'Applicant',
    keywords: encodeCVMetadataPayload(cv),
    creator: 'CareerCraft SG',
  });

  const tpl = getTemplateById(cv.templateId);
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 15;
  const marginBottom = 15;
  const contentWidth = pageWidth - marginX * 2; // 180mm

  const fontName = mapPdfFont(cv.style.fontFamily);
  const basePt = getBaseFontSize(cv.style.fontSize);
  const stepMm = (pt: number) => pt * 0.46;
  const accent = hexToRgb(cv.style.accentColor || tpl.defaultAccentColor);
  const showPhoto = tpl.supportsPhoto && cv.style.showPhoto && Boolean(cv.personal.photoUrl);

  const variant = getPdfLayoutVariant(cv.templateId);
  const isHeaderBand = variant === 'header-band';
  const isCenteredHeader = variant === 'centered';
  const isEuropass = variant === 'europass';
  const isSidebarLayout =
    cv.templateId === 'modern-professional' ||
    cv.templateId === 'office-admin' ||
    cv.templateId === 'hotel-hospitality' ||
    cv.templateId === 'healthcare-nursing' ||
    cv.templateId === 'retail-customer-service';

  let cursorY = marginTop;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
  };

  const setFontSafe = (
    pt: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = [30, 41, 59]
  ) => {
    doc.setFont(fontName, style);
    doc.setFontSize(pt);
    doc.setCharSpace(0);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const getLines = (
    text: string,
    maxWidth: number,
    pt: number,
    style: 'normal' | 'bold' | 'italic' = 'normal'
  ): string[] => {
    setFontSafe(pt, style);
    return wrapPdfLines((s) => doc.getTextWidth(s), text, maxWidth);
  };

  const drawWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    pt: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = [30, 41, 59],
    extraSpacing = 1.2,
    align: 'left' | 'center' = 'left'
  ) => {
    const lines = getLines(text, maxWidth, pt, style);
    if (lines.length === 0) return;
    setFontSafe(pt, style, color);
    const step = stepMm(pt);
    for (const line of lines) {
      ensureSpace(step + 1);
      doc.text(line, x, cursorY, align === 'center' ? { align: 'center' } : undefined);
      cursorY += step;
    }
    cursorY += extraSpacing;
  };

  const drawHangingBullet = (
    prefix: string,
    text: string,
    x: number,
    maxWidth: number,
    pt: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = [51, 65, 85],
    extraSpacing = 0.6
  ) => {
    const cleaned = sanitizePdfText(text);
    if (!cleaned) return;
    setFontSafe(pt, style, color);
    const indent = doc.getTextWidth(prefix) + 1.5;
    const textWidth = Math.max(20, maxWidth - indent);
    const lines = wrapPdfLines((s) => doc.getTextWidth(s), cleaned, textWidth);
    if (lines.length === 0) return;
    const step = stepMm(pt);

    lines.forEach((line, idx) => {
      ensureSpace(step + 1);
      if (idx === 0) {
        doc.text(prefix, x, cursorY);
      }
      doc.text(line, x + indent, cursorY);
      cursorY += step;
    });
    cursorY += extraSpacing;
  };

  const addPhotoIfPresent = (
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    borderColor: [number, number, number] = [203, 213, 225]
  ) => {
    if (!showPhoto || !cv.personal.photoUrl) return;
    try {
      const format = cv.personal.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      const props = doc.getImageProperties(cv.personal.photoUrl);
      const imgRatio = props?.width && props?.height ? props.width / props.height : 1;
      const boxRatio = boxW / boxH;
      let drawW = boxW;
      let drawH = boxH;
      if (imgRatio > boxRatio) {
        drawH = boxW / imgRatio;
      } else {
        drawW = boxH * imgRatio;
      }
      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;
      doc.setFillColor(248, 250, 252);
      doc.rect(drawX, drawY, drawW, drawH, 'F');
      doc.addImage(cv.personal.photoUrl, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.35);
      doc.rect(drawX, drawY, drawW, drawH, 'S');
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
  ]
    .map((v) => sanitizePdfText(v))
    .filter(Boolean);

  const optionalMetaItems = [
    cv.personal.nationality ? `Nationality: ${sanitizePdfText(cv.personal.nationality)}` : '',
    cv.personal.dateOfBirth && cv.templateId !== 'canadian-resume'
      ? `DOB: ${sanitizePdfText(cv.personal.dateOfBirth)}`
      : '',
  ].filter(Boolean);

  const fullNameText = sanitizePdfText(cv.personal.fullName) || 'Unnamed Candidate';
  const titleText = sanitizePdfText(cv.personal.professionalTitle);

  // HEADER RENDERING
  if (isHeaderBand) {
    const textMaxW = showPhoto ? contentWidth - 30 : contentWidth;
    const nameLines = getLines(fullNameText, textMaxW, 18, 'bold');
    const titleLines = titleText ? getLines(titleText, textMaxW, 11, 'normal') : [];
    const contactLines =
      contactItems.length > 0 ? getLines(contactItems.join('  |  '), textMaxW, 8.5, 'normal') : [];
    const metaLines =
      optionalMetaItems.length > 0
        ? getLines(optionalMetaItems.join('  |  '), textMaxW, 8, 'normal')
        : [];

    const textBlockHeight =
      nameLines.length * stepMm(18) +
      (titleLines.length > 0 ? 1 + titleLines.length * stepMm(11) : 0) +
      (contactLines.length > 0 ? 1.5 + contactLines.length * stepMm(8.5) : 0) +
      (metaLines.length > 0 ? 1 + metaLines.length * stepMm(8) : 0);

    const headerHeight = Math.max(showPhoto ? 40 : 32, 12 + textBlockHeight + 6);
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    let headerY = 12;
    setFontSafe(18, 'bold', [255, 255, 255]);
    for (const line of nameLines) {
      doc.text(line, marginX, headerY);
      headerY += stepMm(18);
    }

    if (titleLines.length > 0) {
      headerY += 0.8;
      setFontSafe(11, 'normal', [241, 245, 249]);
      for (const line of titleLines) {
        doc.text(line, marginX, headerY);
        headerY += stepMm(11);
      }
    }

    if (contactLines.length > 0) {
      headerY += 1.5;
      setFontSafe(8.5, 'normal', [241, 245, 249]);
      for (const line of contactLines) {
        doc.text(line, marginX, headerY);
        headerY += stepMm(8.5);
      }
    }

    if (metaLines.length > 0) {
      headerY += 0.8;
      setFontSafe(8, 'normal', [226, 232, 240]);
      for (const line of metaLines) {
        doc.text(line, marginX, headerY);
        headerY += stepMm(8);
      }
    }

    if (showPhoto) {
      const photoW = 22;
      const photoH = 27;
      const photoY = Math.max(5, (headerHeight - photoH) / 2);
      addPhotoIfPresent(pageWidth - marginX - photoW, photoY, photoW, photoH, [255, 255, 255]);
    }
    cursorY = headerHeight + 7;
  } else if (isCenteredHeader) {
    if (showPhoto) {
      addPhotoIfPresent(pageWidth / 2 - 10.5, cursorY, 21, 25);
      cursorY += 29;
    }

    drawWrappedText(
      fullNameText,
      pageWidth / 2,
      contentWidth,
      18,
      'bold',
      [15, 23, 42],
      0.8,
      'center'
    );

    if (titleText) {
      drawWrappedText(
        titleText,
        pageWidth / 2,
        contentWidth,
        11,
        'italic',
        accent,
        1,
        'center'
      );
    }

    if (contactItems.length > 0) {
      drawWrappedText(
        contactItems.join('  |  '),
        pageWidth / 2,
        contentWidth,
        8.5,
        'normal',
        [71, 85, 105],
        1,
        'center'
      );
    }

    if (optionalMetaItems.length > 0) {
      drawWrappedText(
        optionalMetaItems.join('  |  '),
        pageWidth / 2,
        contentWidth,
        8,
        'normal',
        [100, 116, 139],
        1,
        'center'
      );
    }

    cursorY += 1.5;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 6;
  } else {
    const textMaxW = showPhoto ? contentWidth - 30 : contentWidth;
    const headerStartY = cursorY;

    if (cv.templateId === 'europass-inspired') {
      drawWrappedText(
        'CURRICULUM VITAE | EUROPASS-INSPIRED FORMAT',
        marginX,
        textMaxW,
        8.5,
        'bold',
        accent,
        1.5
      );
    }

    drawWrappedText(fullNameText, marginX, textMaxW, 18, 'bold', [15, 23, 42], 0.8);

    if (titleText) {
      drawWrappedText(titleText, marginX, textMaxW, 11, 'bold', accent, 1);
    }

    if (contactItems.length > 0) {
      drawWrappedText(
        contactItems.join('  |  '),
        marginX,
        textMaxW,
        8.5,
        'normal',
        [71, 85, 105],
        0.8
      );
    }

    if (optionalMetaItems.length > 0 && cv.templateId !== 'canadian-resume' && cv.templateId !== 'ats-friendly') {
      drawWrappedText(
        optionalMetaItems.join('  |  '),
        marginX,
        textMaxW,
        8,
        'normal',
        [100, 116, 139],
        0.8
      );
    }

    if (showPhoto) {
      addPhotoIfPresent(pageWidth - marginX - 22, headerStartY, 22, 27);
      cursorY = Math.max(cursorY, headerStartY + 29);
    }

    cursorY += 2;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(isSidebarLayout || isEuropass ? 0.6 : 0.35);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 6;
  }

  // SINGAPORE SECTOR CREDENTIAL HIGHLIGHT STRIP
  if (
    isSectorCredentialTemplate(cv.templateId) &&
    (cv.certifications.length > 0 || Boolean(cv.drivingLicence.classes.trim()))
  ) {
    const stripPadding = 3.5;
    const stripTextW = contentWidth - stripPadding * 2;
    const stripLines: { label: string; value: string }[] = [];

    if (
      (cv.templateId === 'heavy-driver-logistics' || cv.templateId === 'driver-cv') &&
      cv.drivingLicence.classes.trim()
    ) {
      const dlText = [
        sanitizePdfText(cv.drivingLicence.classes),
        cv.drivingLicence.issuingCountry
          ? `(${sanitizePdfText(cv.drivingLicence.issuingCountry)})`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      stripLines.push({ label: 'DRIVING LICENCE:', value: dlText });
    }

    if (cv.certifications.length > 0) {
      const certLabel =
        cv.templateId === 'marine-shipyard'
          ? 'MARINE & SHIPYARD TICKETS:'
          : cv.templateId === 'restaurant-fnb'
          ? 'SFA FOOD HYGIENE & CULINARY:'
          : cv.templateId === 'security-safety'
          ? 'PLRD & WSH CREDENTIALS:'
          : cv.templateId === 'process-oil-gas'
          ? 'PROCESS & PLANT SAFETY:'
          : 'VERIFIED CREDENTIALS:';
      const certList = cv.certifications
        .map((c) => sanitizePdfText(c.name))
        .filter(Boolean)
        .join(' | ');
      if (certList) {
        stripLines.push({ label: certLabel, value: certList });
      }
    }

    if (stripLines.length > 0) {
      const wrappedEntries = stripLines.map((entry) => ({
        lines: getLines(`${entry.label} ${entry.value}`, stripTextW, 8.5, 'normal'),
      }));
      const totalStripLines = wrappedEntries.reduce((sum, item) => sum + item.lines.length, 0);
      const boxHeight = stripPadding * 2 + totalStripLines * stepMm(8.5) + 1;

      ensureSpace(boxHeight + 4);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

      let stripY = cursorY + stripPadding + 2.5;
      setFontSafe(8.5, 'normal', [30, 41, 59]);
      for (const entry of wrappedEntries) {
        for (const line of entry.lines) {
          doc.text(line, marginX + stripPadding, stripY);
          stripY += stepMm(8.5);
        }
      }
      cursorY += boxHeight + 5;
    }
  }

  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    cursorY += 2;
    if (isEuropass) {
      const leftLines = getLines(title.toUpperCase(), 40, basePt - 0.5, 'bold');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX + 44, cursorY - 1.5, pageWidth - marginX, cursorY - 1.5);
      setFontSafe(basePt - 0.5, 'bold', accent);
      let leftY = cursorY;
      for (const line of leftLines) {
        doc.text(line, marginX, leftY);
        leftY += stepMm(basePt - 0.5);
      }
      if (leftLines.length > 1) {
        cursorY += (leftLines.length - 1) * stepMm(basePt - 0.5);
      }
      cursorY += 2.5;
      return;
    }

    const headingLines = getLines(title.toUpperCase(), contentWidth, basePt + 0.8, 'bold');
    setFontSafe(basePt + 0.8, 'bold', accent);
    for (const line of headingLines) {
      doc.text(line, marginX, cursorY);
      cursorY += stepMm(basePt + 0.8);
    }
    cursorY -= 1.2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 4.5;
  };

  const drawTitleWithRightDate = (
    title: string,
    dateText: string,
    x: number,
    maxWidth: number,
    pt: number
  ) => {
    const cleanDate = sanitizePdfText(dateText);
    setFontSafe(pt - 1, 'normal', [100, 116, 139]);
    const dateWidth = cleanDate ? doc.getTextWidth(cleanDate) + 5 : 0;
    const titleMaxWidth = Math.max(40, maxWidth - dateWidth);

    const titleLines = getLines(title, titleMaxWidth, pt, 'bold');
    const step = stepMm(pt);
    ensureSpace(Math.max(step, titleLines.length * step) + 4);

    if (cleanDate) {
      setFontSafe(pt - 1, 'normal', [100, 116, 139]);
      doc.text(cleanDate, pageWidth - marginX, cursorY, { align: 'right' });
    }

    setFontSafe(pt, 'bold', [15, 23, 42]);
    for (const line of titleLines) {
      doc.text(line, x, cursorY);
      cursorY += step;
    }
  };

  const renderSection = (key: CVSectionKey) => {
    const labelX = isEuropass ? marginX + 44 : marginX;
    const labelWidth = isEuropass ? contentWidth - 44 : contentWidth;

    switch (key) {
      case 'summary': {
        const text = cv.useObjectiveInsteadOfSummary ? cv.careerObjective : cv.summary;
        if (!sanitizePdfText(text)) return;
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
          drawTitleWithRightDate(
            sanitizePdfText(exp.jobTitle) || 'Role',
            dateRange,
            labelX,
            labelWidth,
            basePt + 0.3
          );

          const subLine = [exp.company, exp.location]
            .map((v) => sanitizePdfText(v))
            .filter(Boolean)
            .join(' | ');
          if (subLine) {
            drawWrappedText(subLine, labelX, labelWidth, basePt - 0.5, 'bold', accent, 0.8);
          }

          const bullets = exp.responsibilities
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          for (const b of bullets) {
            drawHangingBullet('-', b, labelX + 1.5, labelWidth - 1.5, basePt - 0.4, 'normal', [51, 65, 85], 0.5);
          }

          const achLines = exp.achievements
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          if (achLines.length > 0) {
            for (const a of achLines) {
              drawHangingBullet('*', a, labelX + 1.5, labelWidth - 1.5, basePt - 0.4, 'italic', [15, 23, 42], 0.5);
            }
          }
          cursorY += 2.2;
        }
        break;
      }

      case 'education': {
        if (cv.education.length === 0) return;
        drawSectionHeading(SECTION_LABELS.education);
        for (const edu of cv.education) {
          ensureSpace(12);
          const range = formatDateRange(edu.startDate, edu.graduationDate, false);
          const qualTitle =
            [edu.qualification, edu.fieldOfStudy]
              .map((v) => sanitizePdfText(v))
              .filter(Boolean)
              .join(' in ') || 'Qualification';
          drawTitleWithRightDate(qualTitle, range, labelX, labelWidth, basePt);
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
            `Technical: ${cv.skills.technical.join(' | ')}`,
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
            `Industry & Compliance: ${cv.skills.industry.join(' | ')}`,
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
            `Core & Soft: ${cv.skills.soft.join(' | ')}`,
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
          ensureSpace(10);
          const dateText = cert.date ? formatDateRange(cert.date, '', false) : '';
          drawTitleWithRightDate(
            sanitizePdfText(cert.name) || 'Certification',
            dateText,
            labelX,
            labelWidth,
            basePt - 0.2
          );
          const meta = [
            cert.issuer,
            cert.credentialId ? `ID: ${cert.credentialId}` : '',
          ]
            .map((v) => sanitizePdfText(v))
            .filter(Boolean)
            .join(' | ');
          if (meta) {
            drawWrappedText(meta, labelX, labelWidth, basePt - 1, 'normal', [100, 116, 139], 1.2);
          }
        }
        break;
      }

      case 'drivingLicence': {
        if (!sanitizePdfText(cv.drivingLicence.classes)) return;
        drawSectionHeading(SECTION_LABELS.drivingLicence);
        const line = [
          cv.drivingLicence.classes,
          cv.drivingLicence.issuingCountry ? `Issued in ${cv.drivingLicence.issuingCountry}` : '',
        ]
          .map((v) => sanitizePdfText(v))
          .filter(Boolean)
          .join(' | ');
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
          .map((l) =>
            `${sanitizePdfText(l.language)}${l.proficiency ? ` (${sanitizePdfText(l.proficiency)})` : ''}`
          )
          .filter(Boolean)
          .join('  |  ');
        drawWrappedText(line, labelX, labelWidth, basePt - 0.3, 'normal', [30, 41, 59], 1.8);
        break;
      }

      case 'training': {
        if (cv.training.length === 0) return;
        drawSectionHeading(SECTION_LABELS.training);
        for (const trn of cv.training) {
          ensureSpace(10);
          const dateText = trn.date ? formatDateRange(trn.date, '', false) : '';
          drawTitleWithRightDate(
            sanitizePdfText(trn.title) || 'Training',
            dateText,
            labelX,
            labelWidth,
            basePt - 0.2
          );
          if (trn.provider || trn.details) {
            drawWrappedText(
              [trn.provider, trn.details].map((v) => sanitizePdfText(v)).filter(Boolean).join(' - '),
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
          const dateText = p.date ? formatDateRange(p.date, '', false) : '';
          drawTitleWithRightDate(
            [p.name, p.role ? `(${p.role})` : ''].map((v) => sanitizePdfText(v)).filter(Boolean).join(' '),
            dateText,
            labelX,
            labelWidth,
            basePt - 0.2
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
          drawTitleWithRightDate(
            [v.role, v.organization].map((s) => sanitizePdfText(s)).filter(Boolean).join(' - '),
            range,
            labelX,
            labelWidth,
            basePt - 0.2
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
            [r.name, r.title, r.company, r.contact]
              .map((s) => sanitizePdfText(s))
              .filter(Boolean)
              .join(' | '),
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

  return doc;
}

export async function exportCVToPDF(cv: CVDocument): Promise<void> {
  const doc = buildCVPdfDocument(cv);
  doc.save(`${sanitizeFileName(cv.name)}.pdf`);
}
