import React, { useMemo, useState } from 'react';
import { Eye, FilePlus2, X } from 'lucide-react';
import { CV_TEMPLATES } from '../data/templates';
import { TemplateCategory, TemplateDefinition, TemplateId, UserProfile } from '../types/cv';
import { cloneProfileToCV } from '../utils/cvLogic';
import { CVDocumentRenderer } from './CVDocumentRenderer';
import { CVThumbnail } from './CVThumbnail';

interface TemplateGalleryViewProps {
  profile: UserProfile;
  onSelectTemplateToCreate: (templateId: TemplateId, cvName?: string) => void;
}

const CATEGORIES: Array<'All' | TemplateCategory> = [
  'All',
  'Corporate & Executive',
  'International & European',
  'Skilled Trades & Operations',
];

export const TemplateGalleryView: React.FC<TemplateGalleryViewProps> = ({
  profile,
  onSelectTemplateToCreate,
}) => {
  const [category, setCategory] = useState<'All' | TemplateCategory>('All');
  const [previewWithPhoto, setPreviewWithPhoto] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(
    null
  );
  const [customName, setCustomName] = useState('');

  const filteredTemplates = useMemo(() => {
    if (category === 'All') return CV_TEMPLATES;
    return CV_TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  const buildPreviewCV = (tpl: TemplateDefinition) => {
    const cv = cloneProfileToCV(profile, tpl.id);
    cv.style.showPhoto = tpl.supportsPhoto ? previewWithPhoto && tpl.defaultShowPhoto : false;
    return cv;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CV Template Gallery</h1>
          <p className="text-sm text-slate-600 mt-1">
            13 distinct A4 templates for Singapore, European, Canadian, and international job applications. Every template automatically prefills from your Saved Profile.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewWithPhoto((v) => !v)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            Preview Mode: {previewWithPhoto ? 'Photo Enabled' : 'No Photo'}
          </button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((tpl) => {
          const previewCV = buildPreviewCV(tpl);
          return (
            <article
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <CVThumbnail cv={previewCV} heightClass="h-60" />

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-base text-slate-900">
                      {tpl.name}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-500">
                    {tpl.category} · {tpl.layoutTag}
                    {tpl.atsOptimized ? ' · ATS-Readable' : ''}
                    {tpl.supportsPhoto ? ' · Photo Optional' : ' · No Photo'}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {tpl.description}
                  </p>
                  {tpl.disclaimer && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2">
                      {tpl.disclaimer}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTemplate(tpl);
                      setCustomName(
                        `${profile.personal.fullName || 'My'} — ${tpl.name}`
                      );
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTemplateToCreate(tpl.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 whitespace-nowrap"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Use This Template
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full A4 Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewTemplate.name}`}
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {previewTemplate.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {previewTemplate.category} · {previewTemplate.layoutTag}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Name for your new CV..."
                  aria-label="New CV Name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 w-56 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplateToCreate(previewTemplate.id, customName);
                    setPreviewTemplate(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Create CV with Template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  aria-label="Close preview"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center">
              <CVDocumentRenderer cv={buildPreviewCV(previewTemplate)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
