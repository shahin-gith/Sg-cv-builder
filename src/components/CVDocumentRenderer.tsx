import React from 'react';
import { getTemplateById, SECTION_LABELS } from '../data/templates';
import { CVDocument, CVSectionKey } from '../types/cv';
import { formatDateRange } from '../utils/cvLogic';

interface CVDocumentRendererProps {
  cv: CVDocument;
  scale?: number;
  className?: string;
  id?: string;
}

export const CVDocumentRenderer: React.FC<CVDocumentRendererProps> = ({
  cv,
  scale = 1,
  className = '',
  id,
}) => {
  const tpl = getTemplateById(cv.templateId);
  const accent = cv.style.accentColor || tpl.defaultAccentColor;
  const showPhoto = tpl.supportsPhoto && cv.style.showPhoto;
  const isCanadian = cv.templateId === 'canadian-resume';
  const isATS = cv.templateId === 'ats-friendly';
  const isEuropass = cv.templateId === 'europass-inspired';
  const isEuropean = cv.templateId === 'european-cv';
  const isClassic = cv.templateId === 'classic-professional';
  const isMinimal = cv.templateId === 'minimalist';
  const isModernSidebar =
    cv.templateId === 'modern-professional' ||
    cv.templateId === 'hotel-hospitality' ||
    cv.templateId === 'healthcare-nursing';
  const isOfficeRightRail =
    cv.templateId === 'office-admin' ||
    cv.templateId === 'retail-customer-service';
  const isHeaderBand =
    cv.templateId === 'executive-cv' ||
    cv.templateId === 'construction-worker' ||
    cv.templateId === 'driver-cv' ||
    cv.templateId === 'marine-shipyard' ||
    cv.templateId === 'heavy-driver-logistics' ||
    cv.templateId === 'security-safety' ||
    cv.templateId === 'restaurant-fnb';
  const isTechGrid =
    cv.templateId === 'technician-cv' ||
    cv.templateId === 'process-oil-gas' ||
    cv.templateId === 'it-digital-tech';
  const isSkilled =
    cv.templateId === 'skilled-worker' ||
    cv.templateId === 'facilities-cleaning-landscape';

  const fontMap: Record<string, string> = {
    'Plus Jakarta Sans': "'Plus Jakarta Sans', sans-serif",
    'DM Sans': "'DM Sans', sans-serif",
    'Public Sans': "'Public Sans', sans-serif",
    'Source Serif 4': "'Source Serif 4', Georgia, serif",
    Lora: "'Lora', Georgia, serif",
  };

  const baseSizePx =
    cv.style.fontSize === 'sm' ? 10 : cv.style.fontSize === 'lg' ? 12 : 11;

  const visibleSections = cv.style.sectionOrder.filter(
    (s) => !cv.style.hiddenSections.includes(s)
  );

  const contactItems = [
    cv.personal.phone,
    cv.personal.email,
    cv.personal.address,
    cv.personal.linkedin,
    cv.personal.website,
  ].filter((x) => x && x.trim());

  const photoBox = (sizeClass = 'w-20 h-20', roundedClass = 'rounded-lg') => {
    if (!showPhoto) return null;
    if (cv.personal.photoUrl) {
      return (
        <img
          src={cv.personal.photoUrl}
          alt={cv.personal.fullName || 'Profile Photo'}
          referrerPolicy="no-referrer"
          className={`${sizeClass} ${roundedClass} object-cover border border-slate-200 shrink-0 bg-slate-100`}
        />
      );
    }
    const initials = (cv.personal.fullName || 'CV')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
    return (
      <div
        className={`${sizeClass} ${roundedClass} flex items-center justify-center font-semibold text-white shrink-0`}
        style={{ backgroundColor: accent }}
      >
        {initials || 'CV'}
      </div>
    );
  };

  const hasSectionData = (key: CVSectionKey): boolean => {
    switch (key) {
      case 'summary':
        return Boolean(
          (cv.useObjectiveInsteadOfSummary ? cv.careerObjective : cv.summary).trim()
        );
      case 'experience':
        return cv.experience.length > 0;
      case 'education':
        return cv.education.length > 0;
      case 'skills':
        return (
          cv.skills.technical.length > 0 ||
          cv.skills.soft.length > 0 ||
          cv.skills.industry.length > 0
        );
      case 'certifications':
        return cv.certifications.length > 0;
      case 'drivingLicence':
        return Boolean(cv.drivingLicence.classes.trim());
      case 'languages':
        return cv.languages.length > 0;
      case 'training':
        return cv.training.length > 0;
      case 'projects':
        return cv.projects.length > 0;
      case 'volunteer':
        return cv.volunteer.length > 0;
      case 'references':
        return cv.references.length > 0;
    }
  };

  const renderSectionTitle = (title: string) => {
    if (isMinimal) {
      return (
        <h2
          className="font-semibold tracking-wide uppercase pb-1 mb-2.5 border-b border-slate-200"
          style={{ fontSize: `${baseSizePx}px`, color: accent }}
        >
          {title}
        </h2>
      );
    }
    if (isClassic) {
      return (
        <h2
          className="font-bold tracking-wider uppercase pb-1 mb-2.5 border-b"
          style={{
            fontSize: `${baseSizePx + 0.5}px`,
            color: accent,
            borderColor: accent,
          }}
        >
          {title}
        </h2>
      );
    }
    if (isATS) {
      return (
        <h2
          className="font-bold uppercase pb-1 mb-2 border-b border-slate-900 text-slate-900"
          style={{ fontSize: `${baseSizePx + 1}px` }}
        >
          {title}
        </h2>
      );
    }
    return (
      <h2
        className="font-bold uppercase tracking-wider pb-1 mb-2.5 border-b border-slate-200"
        style={{ fontSize: `${baseSizePx}px`, color: accent }}
      >
        {title}
      </h2>
    );
  };

  const renderSectionBody = (key: CVSectionKey) => {
    switch (key) {
      case 'summary': {
        const text = cv.useObjectiveInsteadOfSummary ? cv.careerObjective : cv.summary;
        return <p className="leading-relaxed text-slate-700 whitespace-pre-line">{text}</p>;
      }

      case 'experience':
        return (
          <div className="space-y-3.5">
            {cv.experience.map((exp) => {
              const range = formatDateRange(exp.startDate, exp.endDate, exp.current);
              const respLines = exp.responsibilities
                .split(/\n+/)
                .map((l) => l.trim())
                .filter(Boolean);
              const achLines = exp.achievements
                .split(/\n+/)
                .map((l) => l.trim())
                .filter(Boolean);

              if (isEuropean) {
                return (
                  <div key={exp.id} className="cv-avoid-break grid grid-cols-12 gap-3">
                    <div className="col-span-3 text-slate-500 font-medium pt-0.5 tabular-nums">
                      {range || 'Dates'}
                      {exp.location && (
                        <div className="text-slate-400 font-normal mt-0.5">{exp.location}</div>
                      )}
                    </div>
                    <div className="col-span-9">
                      <div className="font-bold text-slate-900">{exp.jobTitle}</div>
                      <div className="font-semibold mb-1" style={{ color: accent }}>
                        {exp.company}
                      </div>
                      {respLines.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                          {respLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      )}
                      {achLines.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-800 mt-1 font-medium">
                          {achLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={exp.id} className="cv-avoid-break">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-bold text-slate-900">
                      {exp.jobTitle || 'Role'}
                    </div>
                    <div className="text-slate-500 shrink-0 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                      {range}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-semibold" style={{ color: accent }}>
                      {exp.company}
                    </span>
                    {exp.location && (
                      <span className="text-slate-500" style={{ fontSize: `${baseSizePx - 1}px` }}>
                        {exp.location}
                      </span>
                    )}
                  </div>
                  {respLines.length > 0 && (
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {respLines.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  )}
                  {achLines.length > 0 && (
                    <div className="mt-1.5">
                      <div className="font-semibold text-slate-800" style={{ fontSize: `${baseSizePx - 0.5}px` }}>
                        Key Achievements:
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                        {achLines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'education':
        return (
          <div className="space-y-2.5">
            {cv.education.map((edu) => (
              <div key={edu.id} className="cv-avoid-break flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">
                    {[edu.qualification, edu.fieldOfStudy].filter(Boolean).join(' — ')}
                  </div>
                  <div className="text-slate-600">{edu.institution}</div>
                </div>
                <div className="text-slate-500 shrink-0 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                  {formatDateRange(edu.startDate, edu.graduationDate, false)}
                </div>
              </div>
            ))}
          </div>
        );

      case 'skills': {
        const categories = [
          { label: 'Technical', items: cv.skills.technical },
          { label: 'Industry & Safety', items: cv.skills.industry },
          { label: 'Core & Soft', items: cv.skills.soft },
        ].filter((c) => c.items.length > 0);

        if (isCanadian || isTechGrid) {
          const flat = [...cv.skills.technical, ...cv.skills.industry, ...cv.skills.soft];
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-slate-700">
              {flat.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span style={{ color: accent }}>•</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="space-y-1.5 text-slate-700">
            {categories.map((cat) => (
              <div key={cat.label}>
                <span className="font-semibold text-slate-900">{cat.label}: </span>
                <span>{cat.items.join(' · ')}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'certifications':
        return (
          <div className="space-y-2">
            {cv.certifications.map((c) => (
              <div key={c.id} className="cv-avoid-break flex items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  {c.issuer && <span className="text-slate-600"> — {c.issuer}</span>}
                  {c.credentialId && (
                    <span className="text-slate-500"> (ID: {c.credentialId})</span>
                  )}
                </div>
                {c.date && (
                  <span className="text-slate-500 shrink-0 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                    {formatDateRange(c.date, '', false)}
                  </span>
                )}
              </div>
            ))}
          </div>
        );

      case 'drivingLicence':
        return (
          <div className="cv-avoid-break">
            <div className="font-semibold text-slate-900">
              {cv.drivingLicence.classes}
              {cv.drivingLicence.issuingCountry
                ? ` · Issued in ${cv.drivingLicence.issuingCountry}`
                : ''}
            </div>
            {cv.drivingLicence.notes && (
              <p className="text-slate-700 mt-0.5">{cv.drivingLicence.notes}</p>
            )}
          </div>
        );

      case 'languages':
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
            {cv.languages.map((l) => (
              <div key={l.id}>
                <span className="font-semibold text-slate-900">{l.language}</span>
                {l.proficiency && <span className="text-slate-600"> — {l.proficiency}</span>}
              </div>
            ))}
          </div>
        );

      case 'training':
        return (
          <div className="space-y-2">
            {cv.training.map((t) => (
              <div key={t.id} className="cv-avoid-break">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">{t.title}</span>
                  {t.date && (
                    <span className="text-slate-500 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                      {formatDateRange(t.date, '', false)}
                    </span>
                  )}
                </div>
                {(t.provider || t.details) && (
                  <div className="text-slate-600">
                    {[t.provider, t.details].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-2">
            {cv.projects.map((p) => (
              <div key={p.id} className="cv-avoid-break">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {p.name}
                    {p.role ? ` (${p.role})` : ''}
                  </span>
                  {p.date && (
                    <span className="text-slate-500 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                      {formatDateRange(p.date, '', false)}
                    </span>
                  )}
                </div>
                {p.description && <p className="text-slate-700 mt-0.5">{p.description}</p>}
              </div>
            ))}
          </div>
        );

      case 'volunteer':
        return (
          <div className="space-y-2">
            {cv.volunteer.map((v) => (
              <div key={v.id} className="cv-avoid-break">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {v.role} · {v.organization}
                  </span>
                  <span className="text-slate-500 tabular-nums" style={{ fontSize: `${baseSizePx - 1}px` }}>
                    {formatDateRange(v.startDate, v.endDate, !v.endDate)}
                  </span>
                </div>
                {v.description && <p className="text-slate-700 mt-0.5">{v.description}</p>}
              </div>
            ))}
          </div>
        );

      case 'references':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cv.references.map((r) => (
              <div key={r.id} className="cv-avoid-break">
                <div className="font-semibold text-slate-900">{r.name}</div>
                <div className="text-slate-600">
                  {[r.title, r.company].filter(Boolean).join(', ')}
                </div>
                {r.contact && <div className="text-slate-500">{r.contact}</div>}
              </div>
            ))}
          </div>
        );
    }
  };

  const renderSection = (key: CVSectionKey) => {
    if (!hasSectionData(key)) return null;
    const title =
      key === 'summary' && cv.useObjectiveInsteadOfSummary
        ? 'Career Objective'
        : SECTION_LABELS[key];

    if (isEuropass) {
      return (
        <section key={key} className="mb-4 grid grid-cols-12 gap-4 items-start">
          <div
            className="col-span-4 text-right font-bold uppercase tracking-wide pr-2 pt-0.5"
            style={{ fontSize: `${baseSizePx - 0.5}px`, color: accent }}
          >
            {title}
          </div>
          <div className="col-span-8 border-t border-slate-200 pt-1">
            {renderSectionBody(key)}
          </div>
        </section>
      );
    }

    return (
      <section key={key} className="mb-4">
        {renderSectionTitle(title)}
        {renderSectionBody(key)}
      </section>
    );
  };

  // Sidebar layouts (Modern Professional & Office Admin)
  const sidebarKeys: CVSectionKey[] = ['skills', 'languages', 'certifications', 'drivingLicence'];

  const renderSidebarLayout = (sidebarRight = false) => {
    const sideSections = visibleSections.filter((s) => sidebarKeys.includes(s) && hasSectionData(s));
    const mainSections = visibleSections.filter((s) => !sidebarKeys.includes(s) && hasSectionData(s));

    const sideCol = (
      <aside className="w-[32%] bg-slate-50 border-slate-200 p-6 space-y-5 shrink-0" style={{ borderRightWidth: sidebarRight ? 0 : 1, borderLeftWidth: sidebarRight ? 1 : 0 }}>
        {showPhoto && <div className="flex justify-start">{photoBox('w-24 h-24', 'rounded-xl')}</div>}
        <div>
          <h3 className="font-bold uppercase tracking-wider mb-2" style={{ fontSize: `${baseSizePx - 0.5}px`, color: accent }}>
            Contact
          </h3>
          <div className="space-y-1 text-slate-700 break-words">
            {contactItems.map((c, idx) => (
              <div key={idx}>{c}</div>
            ))}
            {cv.personal.nationality && <div>Nationality: {cv.personal.nationality}</div>}
            {cv.personal.dateOfBirth && <div>DOB: {cv.personal.dateOfBirth}</div>}
          </div>
        </div>
        {sideSections.map((key) => (
          <div key={key}>
            <h3 className="font-bold uppercase tracking-wider mb-2 pb-1 border-b border-slate-200" style={{ fontSize: `${baseSizePx - 0.5}px`, color: accent }}>
              {SECTION_LABELS[key]}
            </h3>
            {renderSectionBody(key)}
          </div>
        ))}
      </aside>
    );

    const mainCol = (
      <div className="flex-1 p-7">
        <header className="mb-5 pb-4 border-b-2" style={{ borderColor: accent }}>
          <h1 className="font-bold text-slate-900 leading-tight" style={{ fontSize: `${baseSizePx * 2.1}px` }}>
            {cv.personal.fullName || 'Your Full Name'}
          </h1>
          {cv.personal.professionalTitle && (
            <div className="font-semibold mt-1" style={{ fontSize: `${baseSizePx * 1.15}px`, color: accent }}>
              {cv.personal.professionalTitle}
            </div>
          )}
        </header>
        {mainSections.map((key) => renderSection(key))}
      </div>
    );

    return (
      <div className="flex min-h-[297mm]">
        {sidebarRight ? (
          <>
            {mainCol}
            {sideCol}
          </>
        ) : (
          <>
            {sideCol}
            {mainCol}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      id={id}
      className={`cv-page-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto overflow-hidden ${className}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontMap[cv.style.fontFamily] || fontMap['Plus Jakarta Sans'],
        fontSize: `${baseSizePx}px`,
        lineHeight: 1.45,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      {isModernSidebar && renderSidebarLayout(false)}
      {isOfficeRightRail && renderSidebarLayout(true)}

      {!isModernSidebar && !isOfficeRightRail && (
        <div>
          {/* HEADER VARIATIONS */}
          {isHeaderBand ? (
            <header
              className="px-9 py-6 text-white flex items-center justify-between gap-6"
              style={{ backgroundColor: accent }}
            >
              <div>
                <h1
                  className="font-bold leading-tight"
                  style={{ fontSize: `${baseSizePx * 2.1}px` }}
                >
                  {cv.personal.fullName || 'Your Full Name'}
                </h1>
                {cv.personal.professionalTitle && (
                  <div
                    className="font-medium text-white/90 mt-1"
                    style={{ fontSize: `${baseSizePx * 1.15}px` }}
                  >
                    {cv.personal.professionalTitle}
                  </div>
                )}
                {contactItems.length > 0 && (
                  <div
                    className="mt-2.5 text-white/85 flex flex-wrap gap-x-3 gap-y-0.5"
                    style={{ fontSize: `${baseSizePx - 1}px` }}
                  >
                    {contactItems.map((item, i) => (
                      <span key={i}>{item}</span>
                    ))}
                  </div>
                )}
                {(cv.personal.nationality || cv.personal.dateOfBirth) && (
                  <div
                    className="mt-1 text-white/75 flex flex-wrap gap-x-3"
                    style={{ fontSize: `${baseSizePx - 1.5}px` }}
                  >
                    {cv.personal.nationality && <span>Nationality: {cv.personal.nationality}</span>}
                    {cv.personal.dateOfBirth && <span>DOB: {cv.personal.dateOfBirth}</span>}
                  </div>
                )}
              </div>
              {photoBox('w-20 h-20', 'rounded-lg')}
            </header>
          ) : isClassic ? (
            <header className="px-9 pt-8 pb-4 text-center border-b-2" style={{ borderColor: accent }}>
              {showPhoto && <div className="flex justify-center mb-3">{photoBox('w-20 h-20', 'rounded-full')}</div>}
              <h1 className="font-bold text-slate-900" style={{ fontSize: `${baseSizePx * 2.1}px` }}>
                {cv.personal.fullName || 'Your Full Name'}
              </h1>
              {cv.personal.professionalTitle && (
                <div className="italic mt-1" style={{ fontSize: `${baseSizePx * 1.15}px`, color: accent }}>
                  {cv.personal.professionalTitle}
                </div>
              )}
              {contactItems.length > 0 && (
                <div className="mt-2 text-slate-600 flex flex-wrap justify-center gap-x-2.5 gap-y-0.5" style={{ fontSize: `${baseSizePx - 1}px` }}>
                  {contactItems.map((item, idx) => (
                    <span key={idx}>
                      {idx > 0 ? '· ' : ''}
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </header>
          ) : isEuropass ? (
            <header className="px-9 pt-7 pb-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 flex flex-col items-end pr-2">
                  <div className="font-bold tracking-wider uppercase text-right mb-2" style={{ color: accent, fontSize: `${baseSizePx - 1.5}px` }}>
                    Curriculum Vitae
                  </div>
                  {photoBox('w-20 h-20', 'rounded-md')}
                </div>
                <div className="col-span-8">
                  <h1 className="font-bold text-slate-900" style={{ fontSize: `${baseSizePx * 2.0}px` }}>
                    {cv.personal.fullName || 'Your Full Name'}
                  </h1>
                  {cv.personal.professionalTitle && (
                    <div className="font-semibold mt-0.5" style={{ color: accent, fontSize: `${baseSizePx * 1.1}px` }}>
                      {cv.personal.professionalTitle}
                    </div>
                  )}
                  <div className="mt-2 space-y-0.5 text-slate-600" style={{ fontSize: `${baseSizePx - 0.8}px` }}>
                    {contactItems.length > 0 && <div>{contactItems.join(' · ')}</div>}
                    {(cv.personal.nationality || cv.personal.dateOfBirth) && (
                      <div>
                        {[
                          cv.personal.nationality ? `Nationality: ${cv.personal.nationality}` : '',
                          cv.personal.dateOfBirth ? `Date of birth: ${cv.personal.dateOfBirth}` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
          ) : (
            <header
              className={`px-9 pt-8 pb-4 flex items-start justify-between gap-6 ${
                isATS ? 'border-b border-slate-900' : 'border-b border-slate-200'
              }`}
            >
              <div>
                <h1 className="font-bold text-slate-900 leading-tight" style={{ fontSize: `${baseSizePx * 2.1}px` }}>
                  {cv.personal.fullName || 'Your Full Name'}
                </h1>
                {cv.personal.professionalTitle && (
                  <div
                    className="font-semibold mt-1"
                    style={{
                      fontSize: `${baseSizePx * 1.15}px`,
                      color: isATS ? '#0f172a' : accent,
                    }}
                  >
                    {cv.personal.professionalTitle}
                  </div>
                )}
                {contactItems.length > 0 && (
                  <div className="mt-2 text-slate-600 flex flex-wrap gap-x-2.5 gap-y-0.5" style={{ fontSize: `${baseSizePx - 0.8}px` }}>
                    {contactItems.map((item, idx) => (
                      <span key={idx}>
                        {idx > 0 ? '· ' : ''}
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {!isCanadian && !isATS && (cv.personal.nationality || cv.personal.dateOfBirth) && (
                  <div className="mt-1 text-slate-500 flex flex-wrap gap-x-3" style={{ fontSize: `${baseSizePx - 1.2}px` }}>
                    {cv.personal.nationality && <span>Nationality: {cv.personal.nationality}</span>}
                    {cv.personal.dateOfBirth && <span>DOB: {cv.personal.dateOfBirth}</span>}
                  </div>
                )}
              </div>
              {photoBox('w-20 h-20', 'rounded-lg')}
            </header>
          )}

          {/* SINGAPORE SECTOR CREDENTIAL HIGHLIGHT STRIP */}
          {(isSkilled ||
            isTechGrid ||
            cv.templateId === 'marine-shipyard' ||
            cv.templateId === 'construction-worker' ||
            cv.templateId === 'heavy-driver-logistics' ||
            cv.templateId === 'driver-cv' ||
            cv.templateId === 'restaurant-fnb' ||
            cv.templateId === 'security-safety') &&
            (cv.certifications.length > 0 || Boolean(cv.drivingLicence.classes.trim())) && (
              <div className="mx-9 mt-4 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                {(cv.templateId === 'heavy-driver-logistics' || cv.templateId === 'driver-cv') &&
                  cv.drivingLicence.classes.trim() && (
                    <div>
                      <span
                        className="font-bold uppercase tracking-wide mr-2"
                        style={{ color: accent, fontSize: `${baseSizePx - 1}px` }}
                      >
                        Driving Licence:
                      </span>
                      <span className="text-slate-800 font-medium" style={{ fontSize: `${baseSizePx - 0.5}px` }}>
                        {cv.drivingLicence.classes}
                        {cv.drivingLicence.issuingCountry ? ` (${cv.drivingLicence.issuingCountry})` : ''}
                      </span>
                    </div>
                  )}
                {cv.certifications.length > 0 && (
                  <div>
                    <span
                      className="font-bold uppercase tracking-wide mr-2"
                      style={{ color: accent, fontSize: `${baseSizePx - 1}px` }}
                    >
                      {cv.templateId === 'marine-shipyard'
                        ? 'Marine & Shipyard Tickets:'
                        : cv.templateId === 'restaurant-fnb'
                        ? 'SFA Food Hygiene & Culinary:'
                        : cv.templateId === 'security-safety'
                        ? 'PLRD & WSH Credentials:'
                        : cv.templateId === 'process-oil-gas'
                        ? 'Process & Plant Safety:'
                        : 'Verified Credentials:'}
                    </span>
                    <span className="text-slate-700" style={{ fontSize: `${baseSizePx - 0.5}px` }}>
                      {cv.certifications.map((c) => c.name).filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            )}

          {/* MAIN CONTENT BODY */}
          <div className="px-9 py-6">
            {visibleSections.map((key) => renderSection(key))}
          </div>
        </div>
      )}
    </div>
  );
};
