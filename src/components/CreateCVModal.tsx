import React, { useState } from 'react';
import { FilePlus2, X } from 'lucide-react';
import { CV_TEMPLATES } from '../data/templates';
import { TemplateId, UserProfile } from '../types/cv';

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
    'modern-professional'
  );
  const [cvName, setCvName] = useState(
    `${profile.personal.fullName || 'My'} — Tailored CV`
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create New CV"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Create New CV (Auto-Prefilled from Profile)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your personal info, experience, skills, and certifications will be prefilled automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create CV dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              CV Title / Version Name
            </label>
            <input
              type="text"
              value={cvName}
              onChange={(e) => setCvName(e.target.value)}
              placeholder="e.g., Singapore Facilities Technician CV"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-700 mb-2">
              Choose Starting Template (You can switch anytime without losing data)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CV_TEMPLATES.map((tpl) => {
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`text-left p-3.5 rounded-xl border transition-colors ${
                      active
                        ? 'border-blue-700 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {tpl.name}
                      </span>
                      {active && (
                        <span className="text-xs font-semibold text-blue-700">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tpl.category} · {tpl.layoutTag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onCreate(selectedTemplate, cvName);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Create & Open Editor
          </button>
        </div>
      </div>
    </div>
  );
};
