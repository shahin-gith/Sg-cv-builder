import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  LayoutTemplate,
  Plus,
  Printer,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CV_TEMPLATES, getTemplateById, SECTION_LABELS } from '../data/templates';
import {
  CVDocument,
  CVFontFamily,
  CVFontSize,
  RewriteAction,
  TemplateId,
} from '../types/cv';
import {
  createHistory,
  generateId,
  HistoryState,
  pushHistoryState,
  redoHistoryState,
  reorderSections,
  switchCVTemplate,
  toggleSectionVisibility,
  undoHistoryState,
} from '../utils/cvLogic';
import { exportCVToPDF } from '../utils/pdfExporter';
import { AIWritingModal } from './AIWritingModal';
import { CVDocumentRenderer } from './CVDocumentRenderer';
import { FieldHint } from './FieldHint';

interface CVEditorViewProps {
  cv: CVDocument;
  onSaveCV: (updated: CVDocument) => void;
  onDuplicateCV: (cv: CVDocument) => void;
  onBack: () => void;
  showFieldGuides: boolean;
  onToggleFieldGuides: () => void;
  autoSaveLabel: string;
}

const ACCENT_PRESETS = [
  '#1D4ED8',
  '#0F172A',
  '#0369A1',
  '#0F766E',
  '#B45309',
  '#334155',
];

const FONT_OPTIONS: CVFontFamily[] = [
  'Plus Jakarta Sans',
  'DM Sans',
  'Public Sans',
  'Source Serif 4',
  'Lora',
];

export const CVEditorView: React.FC<CVEditorViewProps> = ({
  cv,
  onSaveCV,
  onDuplicateCV,
  onBack,
  showFieldGuides,
  onToggleFieldGuides,
  autoSaveLabel,
}) => {
  const [history, setHistory] = useState<HistoryState<CVDocument>>(() =>
    createHistory(structuredClone(cv))
  );
  const present = history.present;
  const tpl = getTemplateById(present.templateId);

  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [editorMode, setEditorMode] = useState<'content' | 'design'>('content');
  const [previewZoom, setPreviewZoom] = useState(0.68);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');
  const [newSkillCat, setNewSkillCat] = useState<'technical' | 'industry' | 'soft'>(
    'technical'
  );

  const [aiModal, setAiModal] = useState<{
    open: boolean;
    title: string;
    initialText: string;
    action: RewriteAction;
    onApply: (text: string, skills?: string[]) => void;
  } | null>(null);

  const updateCV = (updater: (prev: CVDocument) => CVDocument) => {
    setHistory((h) => {
      const next = updater(structuredClone(h.present));
      next.updatedAt = new Date().toISOString();
      onSaveCV(next);
      return pushHistoryState(h, next);
    });
  };

  const handleUndo = () => {
    setHistory((h) => {
      const prev = undoHistoryState(h);
      onSaveCV(prev.present);
      return prev;
    });
  };

  const handleRedo = () => {
    setHistory((h) => {
      const next = redoHistoryState(h);
      onSaveCV(next.present);
      return next;
    });
  };

  const handleManualSave = () => {
    onSaveCV(present);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      await exportCVToPDF(present);
    } finally {
      setExporting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 320;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          updateCV((prev) => ({
            ...prev,
            personal: { ...prev.personal, photoUrl: dataUrl },
            style: { ...prev.style, showPhoto: tpl.supportsPhoto ? true : false },
          }));
        }
      };
      if (typeof reader.result === 'string') img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSwitchTemplate = (newId: TemplateId) => {
    updateCV((prev) => switchCVTemplate(prev, newId, true));
    setTemplateModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top Editor Action Bar (sticky on desktop only so mobile stays <=15% sticky height) */}
      <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 lg:sticky lg:top-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <input
            type="text"
            value={present.name}
            onChange={(e) =>
              updateCV((prev) => ({ ...prev, name: e.target.value }))
            }
            aria-label="CV Document Name"
            className="font-semibold text-sm sm:text-base text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white rounded-md px-2 py-1 min-w-[140px] max-w-[260px] truncate focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.past.length === 0}
            aria-label="Undo change"
            title="Undo"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={history.future.length === 0}
            aria-label="Redo change"
            title="Redo"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Template: {tpl.name}
          </button>

          <button
            type="button"
            onClick={() => onDuplicateCV(present)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>

          <button
            type="button"
            onClick={handleManualSave}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            {savedToast ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {savedToast ? 'Saved' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Mobile Edit / Preview Switcher */}
      <div className="no-print lg:hidden bg-white border-b border-slate-200 px-4 py-2">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMobilePane('edit')}
            className={`py-2 rounded-md text-xs font-semibold ${
              mobilePane === 'edit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Edit CV Details
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`py-2 rounded-md text-xs font-semibold ${
              mobilePane === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Live A4 Preview
          </button>
        </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE: FORM & CUSTOMIZATION */}
        <div
          className={`no-print lg:col-span-5 bg-white border-r border-slate-200 overflow-y-auto max-h-[calc(100vh-8rem)] ${
            mobilePane === 'edit' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
            <div className="flex flex-1 items-center gap-1.5 min-w-[200px]">
              <button
                type="button"
                onClick={() => setEditorMode('content')}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  editorMode === 'content'
                    ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CV Content
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('design')}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  editorMode === 'design'
                    ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Layout & Sections
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleFieldGuides}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guide: {showFieldGuides ? 'On' : 'Off'}
            </button>
          </div>
          <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Device auto-save active</span>
            <span className="font-mono-tabular">{autoSaveLabel}</span>
          </div>

          {editorMode === 'design' ? (
            <div className="p-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Accent Color
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          style: { ...p.style, accentColor: hex },
                        }))
                      }
                      aria-label={`Select accent color ${hex}`}
                      className={`w-8 h-8 rounded-lg border-2 ${
                        present.style.accentColor === hex
                          ? 'border-slate-900 scale-105'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <input
                    type="color"
                    value={present.style.accentColor}
                    onChange={(e) =>
                      updateCV((p) => ({
                        ...p,
                        style: { ...p.style, accentColor: e.target.value },
                      }))
                    }
                    aria-label="Custom accent color"
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Font Family
                  </label>
                  <select
                    value={present.style.fontFamily}
                    onChange={(e) =>
                      updateCV((p) => ({
                        ...p,
                        style: {
                          ...p.style,
                          fontFamily: e.target.value as CVFontFamily,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Font Size
                  </label>
                  <select
                    value={present.style.fontSize}
                    onChange={(e) =>
                      updateCV((p) => ({
                        ...p,
                        style: {
                          ...p.style,
                          fontSize: e.target.value as CVFontSize,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="sm">Compact (10pt)</option>
                    <option value="md">Standard (11pt)</option>
                    <option value="lg">Comfortable (12pt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      Show Profile Photo
                    </div>
                    <div className="text-xs text-slate-500">
                      {tpl.supportsPhoto
                        ? 'Toggle photo visibility on this CV'
                        : `${tpl.name} is designed as a photo-free template`}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!tpl.supportsPhoto}
                    checked={tpl.supportsPhoto && present.style.showPhoto}
                    onChange={(e) =>
                      updateCV((p) => ({
                        ...p,
                        style: { ...p.style, showPhoto: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                </label>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Section Order & Visibility
                </h3>
                <div className="space-y-2">
                  {present.style.sectionOrder.map((key, idx) => {
                    const isHidden = present.style.hiddenSections.includes(key);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70"
                      >
                        <span
                          className={`text-xs font-medium ${
                            isHidden ? 'text-slate-400 line-through' : 'text-slate-800'
                          }`}
                        >
                          {SECTION_LABELS[key]}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCV((p) => ({
                                ...p,
                                style: {
                                  ...p.style,
                                  sectionOrder: reorderSections(
                                    p.style.sectionOrder,
                                    idx,
                                    idx - 1
                                  ),
                                },
                              }))
                            }
                            disabled={idx === 0}
                            aria-label={`Move ${SECTION_LABELS[key]} up`}
                            className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-35"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCV((p) => ({
                                ...p,
                                style: {
                                  ...p.style,
                                  sectionOrder: reorderSections(
                                    p.style.sectionOrder,
                                    idx,
                                    idx + 1
                                  ),
                                },
                              }))
                            }
                            disabled={idx === present.style.sectionOrder.length - 1}
                            aria-label={`Move ${SECTION_LABELS[key]} down`}
                            className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-35"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCV((p) => ({
                                ...p,
                                style: {
                                  ...p.style,
                                  hiddenSections: toggleSectionVisibility(
                                    p.style.hiddenSections,
                                    key
                                  ),
                                },
                              }))
                            }
                            aria-label={
                              isHidden
                                ? `Show ${SECTION_LABELS[key]}`
                                : `Hide ${SECTION_LABELS[key]}`
                            }
                            className="p-1.5 rounded bg-white border border-slate-200 text-slate-600"
                          >
                            {isHidden ? (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-blue-700" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-7">
              {/* Personal Info */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Personal Information
                  </h3>
                  {tpl.supportsPhoto && (
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {present.personal.photoUrl ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={present.personal.fullName}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, fullName: e.target.value },
                        }))
                      }
                      placeholder="Full Name"
                      aria-label="Full Name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="fullName" visible={showFieldGuides} />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={present.personal.professionalTitle}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: {
                            ...p.personal,
                            professionalTitle: e.target.value,
                          },
                        }))
                      }
                      placeholder="Professional Title"
                      aria-label="Professional Title"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="professionalTitle" visible={showFieldGuides} />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={present.personal.phone}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, phone: e.target.value },
                        }))
                      }
                      placeholder="Phone"
                      aria-label="Phone"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="phone" visible={showFieldGuides} />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={present.personal.email}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, email: e.target.value },
                        }))
                      }
                      placeholder="Email"
                      aria-label="Email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="email" visible={showFieldGuides} />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={present.personal.address}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, address: e.target.value },
                        }))
                      }
                      placeholder="Address"
                      aria-label="Address"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="address" visible={showFieldGuides} />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={present.personal.nationality}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, nationality: e.target.value },
                        }))
                      }
                      placeholder="Nationality (Optional)"
                      aria-label="Nationality"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="nationality" visible={showFieldGuides} />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={present.personal.linkedin}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          personal: { ...p.personal, linkedin: e.target.value },
                        }))
                      }
                      placeholder="LinkedIn URL"
                      aria-label="LinkedIn"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <FieldHint guideKey="linkedin" visible={showFieldGuides} />
                  </div>
                </div>
              </section>

              {/* Summary / Objective */}
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                      {present.useObjectiveInsteadOfSummary
                        ? 'Career Objective'
                        : 'Professional Summary'}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          useObjectiveInsteadOfSummary: !p.useObjectiveInsteadOfSummary,
                        }))
                      }
                      className="text-[11px] font-medium text-slate-600 underline whitespace-nowrap shrink-0"
                    >
                      Switch to{' '}
                      {present.useObjectiveInsteadOfSummary ? 'Summary' : 'Objective'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAiModal({
                          open: true,
                          title: present.useObjectiveInsteadOfSummary
                            ? 'বাংলা → English Career Objective'
                            : 'বাংলা → English Summary & AI সাজান',
                          initialText: present.useObjectiveInsteadOfSummary
                            ? present.careerObjective
                            : present.summary,
                          action: 'bengali-to-english',
                          onApply: (text) =>
                            updateCV((p) =>
                              p.useObjectiveInsteadOfSummary
                                ? { ...p, careerObjective: text }
                                : { ...p, summary: text }
                            ),
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      বাংলা → English AI সাজান
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiModal({
                          open: true,
                          title: 'AI Summary & Grammar Assistant',
                          initialText: present.useObjectiveInsteadOfSummary
                            ? present.careerObjective
                            : present.summary,
                          action: present.useObjectiveInsteadOfSummary
                            ? 'objective'
                            : 'summary',
                          onApply: (text) =>
                            updateCV((p) =>
                              p.useObjectiveInsteadOfSummary
                                ? { ...p, careerObjective: text }
                                : { ...p, summary: text }
                            ),
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                    >
                      Improve English
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={
                    present.useObjectiveInsteadOfSummary
                      ? present.careerObjective
                      : present.summary
                  }
                  onChange={(e) =>
                    updateCV((p) =>
                      p.useObjectiveInsteadOfSummary
                        ? { ...p, careerObjective: e.target.value }
                        : { ...p, summary: e.target.value }
                    )
                  }
                  placeholder="Write in English or Bengali (বাংলায় লিখলেও AI দিয়ে ইংরেজিতে সাজাতে পারবেন)..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <FieldHint
                  guideKey={
                    present.useObjectiveInsteadOfSummary ? 'careerObjective' : 'summary'
                  }
                  visible={showFieldGuides}
                />
              </section>

              {/* Work Experience */}
              <section className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Work Experience
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCV((p) => ({
                        ...p,
                        experience: [
                          {
                            id: generateId('exp'),
                            company: '',
                            jobTitle: '',
                            location: 'Singapore',
                            startDate: '',
                            endDate: '',
                            current: false,
                            responsibilities: '',
                            achievements: '',
                          },
                          ...p.experience,
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Role
                  </button>
                </div>
                {present.experience.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={exp.jobTitle}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id
                                ? { ...x, jobTitle: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="Job Title"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.filter((x) => x.id !== exp.id),
                          }))
                        }
                        aria-label="Remove role"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id ? { ...x, company: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Company"
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={exp.location}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id
                                ? { ...x, location: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="Location"
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id
                                ? { ...x, startDate: e.target.value }
                                : x
                            ),
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      />
                      <input
                        type="month"
                        disabled={exp.current}
                        value={exp.current ? '' : exp.endDate}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id ? { ...x, endDate: e.target.value } : x
                            ),
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) =>
                            updateCV((p) => ({
                              ...p,
                              experience: p.experience.map((x) =>
                                x.id === exp.id
                                  ? { ...x, current: e.target.checked }
                                  : x
                              ),
                            }))
                          }
                        />
                        Current
                      </label>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-slate-600">
                          Responsibilities
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAiModal({
                                open: true,
                                title: `বাংলা → English — ${exp.jobTitle || 'Role'}`,
                                initialText: exp.responsibilities,
                                action: 'bengali-to-english',
                                onApply: (text) =>
                                  updateCV((p) => ({
                                    ...p,
                                    experience: p.experience.map((x) =>
                                      x.id === exp.id
                                        ? { ...x, responsibilities: text }
                                        : x
                                    ),
                                  })),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 whitespace-nowrap"
                          >
                            <Sparkles className="w-3 h-3" />
                            বাংলা → English AI সাজান
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAiModal({
                                open: true,
                                title: `AI Rewrite — ${exp.jobTitle || 'Role'}`,
                                initialText: exp.responsibilities,
                                action: 'rewrite',
                                onApply: (text) =>
                                  updateCV((p) => ({
                                    ...p,
                                    experience: p.experience.map((x) =>
                                      x.id === exp.id
                                        ? { ...x, responsibilities: text }
                                        : x
                                    ),
                                  })),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 whitespace-nowrap"
                          >
                            AI Rewrite
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={exp.responsibilities}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id
                                ? { ...x, responsibilities: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="Write daily duties in English or Bengali..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <FieldHint guideKey="responsibilities" visible={showFieldGuides} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-slate-600">
                          Key Achievements (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAiModal({
                              open: true,
                              title: `বাংলা → English Achievements — ${exp.jobTitle || 'Role'}`,
                              initialText: exp.achievements,
                              action: 'bengali-to-english',
                              onApply: (text) =>
                                updateCV((p) => ({
                                  ...p,
                                  experience: p.experience.map((x) =>
                                    x.id === exp.id
                                      ? { ...x, achievements: text }
                                      : x
                                  ),
                                })),
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 whitespace-nowrap"
                        >
                          <Sparkles className="w-3 h-3" />
                          বাংলা → English AI সাজান
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={exp.achievements}
                        onChange={(e) =>
                          updateCV((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id
                                ? { ...x, achievements: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="Highlight awards, zero accidents, or time/cost savings..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <FieldHint guideKey="achievements" visible={showFieldGuides} />
                    </div>
                  </div>
                ))}
              </section>

              {/* Skills */}
              <section className="space-y-2.5 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Skills</h3>
                <div className="flex gap-2">
                  <select
                    value={newSkillCat}
                    onChange={(e) =>
                      setNewSkillCat(
                        e.target.value as 'technical' | 'industry' | 'soft'
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="technical">Technical</option>
                    <option value="industry">Industry</option>
                    <option value="soft">Soft</option>
                  </select>
                  <input
                    type="text"
                    value={newSkillText}
                    onChange={(e) => setNewSkillText(e.target.value)}
                    placeholder="Add skill..."
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = newSkillText.trim();
                      if (!v) return;
                      updateCV((p) => ({
                        ...p,
                        skills: {
                          ...p.skills,
                          [newSkillCat]: [...p.skills[newSkillCat], v],
                        },
                      }));
                      setNewSkillText('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
                <FieldHint guideKey="skills" visible={showFieldGuides} />
                <div className="flex flex-wrap gap-1.5">
                  {(['technical', 'industry', 'soft'] as const).map((cat) =>
                    present.skills[cat].map((sk, idx) => (
                      <span
                        key={`${cat}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-800"
                      >
                        {sk}
                        <button
                          type="button"
                          onClick={() =>
                            updateCV((p) => ({
                              ...p,
                              skills: {
                                ...p.skills,
                                [cat]: p.skills[cat].filter((_, i) => i !== idx),
                              },
                            }))
                          }
                          aria-label={`Remove ${sk}`}
                          className="text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </section>

              {/* Education, Driving Licence, Certifications & Additional Sections */}
              <section className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Education
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCV((p) => ({
                        ...p,
                        education: [
                          ...p.education,
                          {
                            id: generateId('edu'),
                            institution: '',
                            qualification: '',
                            fieldOfStudy: '',
                            startDate: '',
                            graduationDate: '',
                          },
                        ],
                      }))
                    }
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    + Add Education
                  </button>
                </div>
                <FieldHint guideKey="education" visible={showFieldGuides} />
                {present.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="grid grid-cols-2 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50"
                  >
                    <input
                      type="text"
                      value={edu.qualification}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id
                              ? { ...x, qualification: e.target.value }
                              : x
                          ),
                        }))
                      }
                      placeholder="Qualification"
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id
                              ? { ...x, institution: e.target.value }
                              : x
                          ),
                        }))
                      }
                      placeholder="Institution"
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </section>

              <section className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  Driving Licence
                </h3>
                <input
                  type="text"
                  value={present.drivingLicence.classes}
                  onChange={(e) =>
                    updateCV((p) => ({
                      ...p,
                      drivingLicence: {
                        ...p.drivingLicence,
                        classes: e.target.value,
                      },
                    }))
                  }
                  placeholder="Driving Licence Classes (e.g., Singapore Class 3)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <FieldHint guideKey="drivingLicence" visible={showFieldGuides} />
              </section>

              <section className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Certifications & Languages
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          certifications: [
                            ...p.certifications,
                            {
                              id: generateId('cert'),
                              name: '',
                              issuer: '',
                              date: '',
                              credentialId: '',
                            },
                          ],
                        }))
                      }
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      + Cert
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          languages: [
                            ...p.languages,
                            { id: generateId('lang'), language: '', proficiency: '' },
                          ],
                        }))
                      }
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      + Language
                    </button>
                  </div>
                </div>

                {present.certifications.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          certifications: p.certifications.map((x) =>
                            x.id === c.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Certification"
                      className="col-span-6 rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={c.issuer}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          certifications: p.certifications.map((x) =>
                            x.id === c.id ? { ...x, issuer: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Issuer"
                      className="col-span-4 rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          certifications: p.certifications.filter((x) => x.id !== c.id),
                        }))
                      }
                      className="col-span-2 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {present.languages.map((l) => (
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={l.language}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          languages: p.languages.map((x) =>
                            x.id === l.id ? { ...x, language: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Language"
                      className="col-span-5 rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={l.proficiency}
                      onChange={(e) =>
                        updateCV((p) => ({
                          ...p,
                          languages: p.languages.map((x) =>
                            x.id === l.id ? { ...x, proficiency: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Proficiency"
                      className="col-span-5 rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCV((p) => ({
                          ...p,
                          languages: p.languages.filter((x) => x.id !== l.id),
                        }))
                      }
                      className="col-span-2 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <FieldHint guideKey="certifications" visible={showFieldGuides} />
              </section>
            </div>
          )}
        </div>

        {/* RIGHT PANE: LIVE A4 PREVIEW */}
        <div
          className={`lg:col-span-7 bg-slate-100 overflow-auto max-h-[calc(100vh-8rem)] flex flex-col ${
            mobilePane === 'preview' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="no-print flex items-center justify-between px-5 py-2.5 bg-slate-200/70 border-b border-slate-300/70 text-xs text-slate-600 sticky top-0 z-10">
            <div>
              <span className="font-semibold text-slate-800">{tpl.name}</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>A4 Format (210 × 297 mm)</span>
              {tpl.disclaimer && (
                <span className="ml-2 text-amber-800">
                  · Not officially affiliated with Europass
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(0.4, +(z - 0.08).toFixed(2)))}
                aria-label="Zoom out preview"
                className="p-1.5 rounded bg-white border border-slate-300 text-slate-700"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono-tabular w-11 text-center">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(1.1, +(z + 0.08).toFixed(2)))}
                aria-label="Zoom in preview"
                className="p-1.5 rounded bg-white border border-slate-300 text-slate-700"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 flex justify-center items-start overflow-auto">
            <div
              className="print-only-container"
              style={{
                width: `${210 * previewZoom}mm`,
                minHeight: `${297 * previewZoom}mm`,
              }}
            >
              <CVDocumentRenderer cv={present} scale={previewZoom} />
            </div>
          </div>
        </div>
      </div>

      {/* Instant Template Switcher Modal */}
      {templateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Switch CV Template"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Switch CV Template
                </h2>
                <p className="text-xs text-slate-500">
                  All your entered information will be preserved cleanly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                aria-label="Close template switcher"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CV_TEMPLATES.map((t) => {
                const active = t.id === present.templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSwitchTemplate(t.id)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      active
                        ? 'border-blue-700 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {t.name}
                      </span>
                      {active && (
                        <span className="text-xs font-semibold text-blue-700">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.category} · {t.layoutTag}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {aiModal?.open && (
        <AIWritingModal
          isOpen={aiModal.open}
          onClose={() => setAiModal(null)}
          title={aiModal.title}
          initialText={aiModal.initialText}
          defaultAction={aiModal.action}
          context={{
            jobTitle: present.personal.professionalTitle,
            experienceText: present.experience
              .map((e) => `${e.jobTitle} at ${e.company}: ${e.responsibilities}`)
              .join('\n'),
          }}
          onApply={aiModal.onApply}
        />
      )}
    </div>
  );
};
