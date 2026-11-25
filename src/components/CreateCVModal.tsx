import React, { useMemo, useState } from 'react';
import { FilePlus2, Search, X } from 'lucide-react';
import {
  CV_TEMPLATES,
  filterTemplates,
  TEMPLATE_CATEGORIES,
} from '../data/templates';
import { TemplateCategory, TemplateId, UserProfile } from '../types/cv';

interface CreateCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onCreate: (templateId: TemplateId, cvName: string) => void;
}

export const CreateCVModal: React.FC<CreateCVModalProps> = ({
  isOpen,
  onClose,
  profile,
  onCreate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(
    'construction-worker'
  );
  const [cvName, setCvName] = useState(
    `${profile.personal.fullName || 'My'} — Tailored CV`
  );
  const [category, setCategory] = useState<'All' | TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleTemplates = useMemo(
    () => filterTemplates(category, searchQuery),
    [category, searchQuery]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create New CV"
    >
      <div className="bg-white border border-sky-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create New CV (Auto-Prefilled from Your Profile)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Choose from {CV_TEMPLATES.length} Singapore &amp; international templates. Switch anytime without losing data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create CV dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-white/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              CV Title / Job Version Name (সিভির নাম লিখুন)
            </label>
            <input
              type="text"
              value={cvName}
              onChange={(e) => setCvName(e.target.value)}
              placeholder="e.g., Marine Welder CV or Hotel Housekeeping Supervisor CV"
              className="w-full rounded-xl border border-sky-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800">
                Choose Template ({visibleTemplates.length} available)
              </div>
              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-sky-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search marine, chef, hotel, driver..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    category === cat
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-sky-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleTemplates.map((tpl) => {
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`text-left p-3.5 rounded-xl border transition-colors ${
                      active
                        ? 'border-blue-600 bg-sky-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-sky-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {tpl.name}
                      </span>
                      {active && (
                        <span className="text-xs font-bold text-blue-700">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tpl.category} · {tpl.layoutTag}
                    </div>
                    {tpl.occupations && tpl.occupations.length > 0 && (
                      <div className="text-[11px] text-blue-800 mt-1 truncate">
                        {tpl.occupations.slice(0, 3).join(' · ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-sky-100 bg-sky-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onCreate(selectedTemplate, cvName);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Create &amp; Open Editor
          </button>
        </div>
      </div>
    </div>
  );
};
