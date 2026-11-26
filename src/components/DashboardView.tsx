import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  FilePlus2,
  FileUp,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { CV_TEMPLATES, getTemplateById } from '../data/templates';
import { CVDocument, UserProfile } from '../types/cv';
import { exportCVToPDF } from '../utils/pdfExporter';
import { CVThumbnail } from './CVThumbnail';

interface DashboardViewProps {
  cvs: CVDocument[];
  profile: UserProfile;
  firebaseUser: User | null;
  onOpenAuthModal: () => void;
  onNavigate: (
    view:
      | 'dashboard'
      | 'smart-generator'
      | 'cvs'
      | 'templates'
      | 'profile'
      | 'ai-assistant'
      | 'review'
  ) => void;
  onCreateNewCV: () => void;
  onOpenImportPdf: () => void;
  onOpenCV: (id: string) => void;
  onDuplicateCV: (id: string) => void;
  onRenameCV: (id: string, newName: string) => void;
  onDeleteCV: (id: string) => void;
  showAllOnly?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cvs,
  profile,
  firebaseUser,
  onOpenAuthModal,
  onNavigate,
  onCreateNewCV,
  onOpenImportPdf,
  onOpenCV,
  onDuplicateCV,
  onRenameCV,
  onDeleteCV,
  showAllOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const sortedCVs = useMemo(() => {
    return [...cvs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [cvs]);

  const filteredCVs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedCVs;
    return sortedCVs.filter((cv) => {
      const tpl = getTemplateById(cv.templateId);
      return (
        cv.name.toLowerCase().includes(q) ||
        tpl.name.toLowerCase().includes(q) ||
        cv.personal.professionalTitle.toLowerCase().includes(q)
      );
    });
  }, [sortedCVs, searchQuery]);

  const recentCVs = sortedCVs.slice(0, 3);

  const handleDownload = async (cv: CVDocument) => {
    setExportingId(cv.id);
    try {
      await exportCVToPDF(cv);
    } finally {
      setExportingId(null);
    }
  };

  const formatUpdated = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div className="space-y-7">
      {!showAllOnly && (
        <>
          {/* Clean Compact Header */}
          <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                CareerCraft SG Workspace
              </h1>
              <p className="text-sm text-slate-700 mt-1">
                23 Singapore &amp; international templates · Bengali → English AI · A4 PDF &amp; Print
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('smart-generator')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                <Wand2 className="w-4 h-4" />
                1-Box AI CV
              </button>
              <button
                type="button"
                onClick={onCreateNewCV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-slate-800 text-sm font-semibold hover:bg-sky-50 transition-colors whitespace-nowrap"
              >
                <FilePlus2 className="w-4 h-4 text-blue-700" />
                Create New CV
              </button>
              <button
                type="button"
                onClick={onOpenImportPdf}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-slate-800 text-sm font-semibold hover:bg-sky-50 transition-colors whitespace-nowrap"
              >
                <FileUp className="w-4 h-4 text-blue-700" />
                Import PDF
              </button>
            </div>
          </section>

          {/* Clean 4-Card Quick Action Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                firebaseUser
                  ? 'border-emerald-200 bg-emerald-50/75 hover:border-emerald-300'
                  : 'border-sky-200 bg-sky-50/75 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Google Cloud Sync</span>
                {firebaseUser ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-700" />
                )}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                {firebaseUser ? firebaseUser.email : 'Sign in with Google'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {firebaseUser ? 'Synced' : 'Save across devices'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="text-left bg-amber-50/75 border border-amber-200 rounded-2xl p-4 hover:border-amber-300 transition-colors"
            >
              <div className="text-xs font-bold text-amber-900">Templates</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {CV_TEMPLATES.length}
              </div>
              <div className="text-xs text-amber-900 font-semibold mt-0.5">
                Browse All Sectors →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ai-assistant')}
              className="text-left bg-violet-50/75 border border-violet-200 rounded-2xl p-4 hover:border-violet-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-bold text-violet-900">
                <span>AI Writing</span>
                <Sparkles className="w-4 h-4 text-violet-700" />
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1.5">
                বাংলা → English &amp; Grammar
              </div>
              <div className="text-xs text-violet-800 font-semibold mt-0.5">
                Open Studio →
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-left bg-emerald-50/75 border border-emerald-200 rounded-2xl p-4 hover:border-emerald-300 transition-colors"
            >
              <div className="text-xs font-bold text-emerald-900">Saved CVs</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {cvs.length}
              </div>
              <div className="text-xs text-emerald-800 font-semibold mt-0.5 truncate">
                Profile: {profile.personal.fullName || 'Edit Master'} →
              </div>
            </button>
          </section>

          {/* Recently Edited CVs */}
          {recentCVs.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Recently Edited CVs
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('cvs')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  View all CVs ({cvs.length})
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {recentCVs.map((cv) => {
                  const tpl = getTemplateById(cv.templateId);
                  return (
                    <div
                      key={`recent-${cv.id}`}
                      className="bg-white border border-sky-200/80 rounded-2xl overflow-hidden flex flex-col"
                    >
                      <CVThumbnail cv={cv} heightClass="h-44" />
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 truncate">
                            {cv.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <span>{tpl.name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              Edited {formatUpdated(cv.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onOpenCV(cv.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateCV(cv.id)}
                            aria-label={`Duplicate ${cv.name}`}
                            title="Duplicate CV"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-slate-900"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(cv)}
                            disabled={exportingId === cv.id}
                            aria-label={`Download PDF for ${cv.name}`}
                            title="Download A4 PDF"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-slate-900 disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Full My CVs Library */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {showAllOnly ? 'My CVs' : 'All Saved CVs'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Maintain multiple role-specific CV versions synced inside your Google Account.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-sky-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CVs or templates..."
                aria-label="Search CVs"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-sky-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showAllOnly && (
              <button
                type="button"
                onClick={onCreateNewCV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 whitespace-nowrap"
              >
                <FilePlus2 className="w-4 h-4" />
                New CV
              </button>
            )}
          </div>
        </div>

        {filteredCVs.length === 0 ? (
          <div className="bg-white border border-sky-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {cvs.length === 0 ? 'You have no saved CVs yet.' : 'No CVs match your search.'}
            </p>
            <p className="text-xs text-slate-500">
              Create a new CV prefilled from your Saved Profile or choose a template from the gallery.
            </p>
            <button
              type="button"
              onClick={onCreateNewCV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800"
            >
              <FilePlus2 className="w-4 h-4" />
              Create New CV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCVs.map((cv) => {
              const tpl = getTemplateById(cv.templateId);
              const isRenaming = renamingId === cv.id;
              const isConfirmDelete = deletingId === cv.id;

              return (
                <article
                  key={cv.id}
                  className="bg-white border border-sky-200/80 rounded-2xl overflow-hidden flex flex-col"
                >
                  <CVThumbnail cv={cv} heightClass="h-52" />
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    {isRenaming ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (renameValue.trim()) {
                            onRenameCV(cv.id, renameValue);
                          }
                          setRenamingId(null);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          aria-label="Rename CV"
                          autoFocus
                          className="flex-1 rounded-lg border border-blue-500 px-2.5 py-1.5 text-sm focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div>
                        <h3 className="font-bold text-slate-900 truncate">
                          {cv.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <span>{tpl.name}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {formatUpdated(cv.updatedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isConfirmDelete ? (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-red-700">
                          Delete this CV?
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCV(cv.id);
                              setDeletingId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenCV(cv.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit CV
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(cv)}
                          disabled={exportingId === cv.id}
                          aria-label={`Download PDF for ${cv.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-sky-50 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateCV(cv.id)}
                          aria-label={`Duplicate ${cv.name}`}
                          title="Duplicate CV"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-sky-50"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(cv.id);
                            setRenameValue(cv.name);
                          }}
                          aria-label={`Rename ${cv.name}`}
                          title="Rename CV"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-sky-50 text-xs font-semibold px-2"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(cv.id)}
                          aria-label={`Delete ${cv.name}`}
                          title="Delete CV"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-slate-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
