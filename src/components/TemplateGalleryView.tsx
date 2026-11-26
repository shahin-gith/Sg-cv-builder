import React, { useMemo, useState } from 'react';
import { Eye, FilePlus2, Search, X } from 'lucide-react';
import {
  CV_TEMPLATES,
  filterTemplates,
  TEMPLATE_CATEGORIES,
} from '../data/templates';
import {
  TemplateCategory,
  TemplateDefinition,
  TemplateId,
  UserProfile,
} from '../types/cv';
import { cloneProfileToCV } from '../utils/cvLogic';
import { CVDocumentRenderer } from './CVDocumentRenderer';
import { CVThumbnail } from './CVThumbnail';

interface TemplateGalleryViewProps {
  profile: UserProfile;
  onSelectTemplateToCreate: (templateId: TemplateId, cvName?: string) => void;
}

const TINT_STYLES: Record<
  NonNullable<TemplateDefinition['sectorTint']>,
  string
> = {
  sky: 'border-sky-200 bg-sky-50/35 hover:border-sky-300',
  amber: 'border-amber-200 bg-amber-50/35 hover:border-amber-300',
  teal: 'border-teal-200 bg-teal-50/35 hover:border-teal-300',
  rose: 'border-rose-200 bg-rose-50/35 hover:border-rose-300',
  indigo: 'border-indigo-200 bg-indigo-50/35 hover:border-indigo-300',
  emerald: 'border-emerald-200 bg-emerald-50/35 hover:border-emerald-300',
  slate: 'border-slate-200 bg-white hover:border-slate-300',
};

export const TemplateGalleryView: React.FC<TemplateGalleryViewProps> = ({
  profile,
  onSelectTemplateToCreate,
}) => {
  const [category, setCategory] = useState<'All' | TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewWithPhoto, setPreviewWithPhoto] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(
    null
  );
  const [customName, setCustomName] = useState('');

  const filteredTemplates = useMemo(
    () => filterTemplates(category, searchQuery),
    [category, searchQuery]
  );

  const buildPreviewCV = (tpl: TemplateDefinition) => {
    const cv = cloneProfileToCV(profile, tpl.id);
    cv.style.showPhoto = tpl.supportsPhoto
      ? previewWithPhoto && tpl.defaultShowPhoto
      : false;
    return cv;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Singapore &amp; International CV Templates ({CV_TEMPLATES.length})
          </h1>
          <p className="text-sm text-slate-700 mt-1">
            Singapore, European &amp; global A4 templates — all auto-filled from your Saved Profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-sky-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search job: welder, chef, driver..."
              aria-label="Search Singapore job templates"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setPreviewWithPhoto((v) => !v)}
            className="px-3.5 py-2 rounded-xl border border-sky-200 bg-white text-xs font-semibold text-slate-700 hover:bg-sky-50 whitespace-nowrap"
          >
            Preview: {previewWithPhoto ? 'Photo On' : 'No Photo'}
          </button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-sky-100 rounded-xl">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-sky-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            No templates matched &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
          >
            Show All {CV_TEMPLATES.length} Templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => {
            const previewCV = buildPreviewCV(tpl);
            const tintClass = TINT_STYLES[tpl.sectorTint ?? 'slate'];
            return (
              <article
                key={tpl.id}
                className={`border rounded-2xl overflow-hidden flex flex-col transition-colors ${tintClass}`}
              >
                <CVThumbnail cv={previewCV} heightClass="h-60" />

                <div className="p-5 flex-1 flex flex-col justify-between gap-4 bg-white/80">
                  <div className="space-y-1.5">
                    <h2 className="font-bold text-base text-slate-900">
                      {tpl.name}
                    </h2>
                    <div className="text-xs text-slate-500">
                      {tpl.category} · {tpl.layoutTag}
                      {tpl.atsOptimized ? ' · ATS-Readable' : ''}
                      {tpl.supportsPhoto ? ' · Photo Optional' : ' · No Photo'}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">
                      {tpl.description}
                    </p>
                    {tpl.occupations && tpl.occupations.length > 0 && (
                      <div className="text-[11px] font-medium text-blue-800 pt-1">
                        Ideal for: {tpl.occupations.slice(0, 4).join(' · ')}
                      </div>
                    )}
                    {tpl.disclaimer && (
                      <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTemplateToCreate(tpl.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
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
      )}

      {/* Full A4 Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewTemplate.name}`}
        >
          <div className="bg-white border border-sky-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-sky-100 bg-sky-50/70">
              <div>
                <h2 className="font-bold text-slate-900">
                  {previewTemplate.name}
                </h2>
                <p className="text-xs text-slate-600">
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
                  className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs text-slate-900 w-56 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplateToCreate(previewTemplate.id, customName);
                    setPreviewTemplate(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Create CV with Template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  aria-label="Close preview"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-white"
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
