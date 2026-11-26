import React, { useEffect, useState } from 'react';
import { Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { requestAIRewrite } from '../services/aiClient';
import { AIRewriteResponse, RewriteAction, WritingStyle } from '../types/cv';

interface AIWritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialText: string;
  defaultAction?: RewriteAction;
  context?: {
    jobTitle?: string;
    experienceText?: string;
    skills?: string[];
  };
  onApply: (acceptedText: string, suggestedSkills?: string[]) => void;
}

const STYLES: WritingStyle[] = [
  'Professional',
  'Concise',
  'Formal',
  'Achievement-focused',
  'ATS-friendly',
];

const ACTIONS: Array<{ value: RewriteAction; label: string }> = [
  { value: 'rewrite', label: 'Rewrite Professionally' },
  { value: 'grammar', label: 'Fix Grammar & Spelling' },
  { value: 'bengali-to-english', label: 'Bengali to English' },
  { value: 'summary', label: 'Generate Summary' },
  { value: 'objective', label: 'Improve Career Objective' },
  { value: 'suggest-skills', label: 'Suggest Relevant Skills' },
];

export const AIWritingModal: React.FC<AIWritingModalProps> = ({
  isOpen,
  onClose,
  title,
  initialText,
  defaultAction = 'rewrite',
  context,
  onApply,
}) => {
  const [sourceText, setSourceText] = useState(initialText);
  const [action, setAction] = useState<RewriteAction>(defaultAction);
  const [style, setStyle] = useState<WritingStyle>('Professional');
  const [sourceLanguage, setSourceLanguage] = useState<'auto' | 'en' | 'bn'>(
    defaultAction === 'bengali-to-english' ? 'bn' : 'auto'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIRewriteResponse | null>(null);
  const [editableOutput, setEditableOutput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSourceText(initialText);
      setAction(defaultAction);
      setSourceLanguage(defaultAction === 'bengali-to-english' ? 'bn' : 'auto');
      setError(null);
      setResult(null);
      setEditableOutput('');
    }
  }, [isOpen, initialText, defaultAction]);

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!sourceText.trim()) {
      setError('Please enter or paste text first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestAIRewrite({
        text: sourceText,
        action,
        style,
        sourceLanguage,
        context,
      });
      setResult(res);
      setEditableOutput(res.correctedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Truthful AI assistance — never invents experience, credentials, or employers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI assistant"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Task Mode
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as RewriteAction)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Writing Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as WritingStyle)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Input Language
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) =>
                  setSourceLanguage(e.target.value as 'auto' | 'en' | 'bn')
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="auto">Auto-detect (English / Bengali)</option>
                <option value="en">English</option>
                <option value="bn">Bengali (বাংলা → Professional English)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Original Text (English or Bengali)
              </label>
              <textarea
                rows={7}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste your draft or write in simple English / Bengali..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                AI Suggestion (Editable Before Applying)
              </label>
              <textarea
                rows={7}
                value={editableOutput}
                onChange={(e) => setEditableOutput(e.target.value)}
                placeholder="Click 'Generate Suggestion' to view side-by-side improvements here..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="text-sm text-slate-800">
                <span className="font-semibold">Summary of improvements: </span>
                {result.explanation}
              </div>
              {result.issuesFound.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Checks & Fixes Applied
                  </div>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                    {result.issuesFound.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.suggestedSkills && result.suggestedSkills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Skills Grounded in Your Experience
                  </div>
                  <p className="text-xs text-slate-700">
                    {result.suggestedSkills.join(' · ')}
                  </p>
                </div>
              )}
              <div className="text-xs text-slate-500">
                {result.preservedFactsNotice}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Analyzing...' : 'Generate Suggestion'}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setEditableOutput('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => {
                if (editableOutput.trim()) {
                  onApply(editableOutput.trim(), result?.suggestedSkills);
                  onClose();
                }
              }}
              disabled={!editableOutput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              Accept & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
