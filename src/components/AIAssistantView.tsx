import React, { useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { requestAIRewrite } from '../services/aiClient';
import {
  AIRewriteResponse,
  CVDocument,
  RewriteAction,
  WritingStyle,
} from '../types/cv';

interface AIAssistantViewProps {
  cvs: CVDocument[];
  onApplySummaryToCV: (cvId: string, summaryText: string) => void;
}

const STYLES: WritingStyle[] = [
  'Professional',
  'Concise',
  'Formal',
  'Achievement-focused',
  'ATS-friendly',
];

const ACTIONS: Array<{ value: RewriteAction; label: string }> = [
  { value: 'grammar', label: 'Fix Grammar & Spelling' },
  { value: 'rewrite', label: 'Rewrite Professionally' },
  { value: 'bengali-to-english', label: 'Bengali → Professional English' },
  { value: 'summary', label: 'Generate Professional Summary' },
  { value: 'objective', label: 'Improve Career Objective' },
  { value: 'suggest-skills', label: 'Suggest Skills from Experience' },
];

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  cvs,
  onApplySummaryToCV,
}) => {
  const [text, setText] = useState(
    'আমি সিঙ্গাপুরে ৫ বছর ধরে ইলেকট্রিক্যাল টেকনিশিয়ান হিসেবে কাজ করছি। সুইচগিয়ার মেইনটেন্যান্স এবং সেফটি চেক করি।'
  );
  const [action, setAction] = useState<RewriteAction>('bengali-to-english');
  const [style, setStyle] = useState<WritingStyle>('Professional');
  const [sourceLang, setSourceLang] = useState<'auto' | 'en' | 'bn'>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIRewriteResponse | null>(null);
  const [editedOutput, setEditedOutput] = useState('');
  const [selectedCvId, setSelectedCvId] = useState(cvs[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [appliedToast, setAppliedToast] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter text in English or Bengali.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestAIRewrite({
        text,
        action,
        style,
        sourceLanguage: sourceLang,
      });
      setResult(res);
      setEditedOutput(res.correctedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI Writing Assistant Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Correct grammar and spelling, rewrite simple English into formal business prose, or convert Bengali descriptions into professional English without inventing fake experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAction('grammar');
              setSourceLang('en');
              setText(
                'i am work as delivery driver in singapore for 4 year. i have class 3 licence and clean record no accident. i responsible for daily cargo deliver on time.'
              );
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Load English Grammar Sample
          </button>
          <button
            type="button"
            onClick={() => {
              setAction('bengali-to-english');
              setSourceLang('bn');
              setText(
                'আমি সিঙ্গাপুরে ৫ বছর ধরে ইলেকট্রিক্যাল টেকনিশিয়ান হিসেবে কাজ করছি। সুইচগিয়ার মেইনটেন্যান্স এবং সেফটি চেক করি।'
              );
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Load Bengali Sample
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Assistant Mode
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as RewriteAction)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              value={sourceLang}
              onChange={(e) =>
                setSourceLang(e.target.value as 'auto' | 'en' | 'bn')
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="auto">Auto-detect (English / Bengali)</option>
              <option value="en">English</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Original Description (English or Bengali)
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Professional English Output (Editable)
            </label>
            <textarea
              rows={8}
              value={editedOutput}
              onChange={(e) => setEditedOutput(e.target.value)}
              placeholder="Your rewritten text will appear side-by-side here..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Processing...' : 'Run AI Assistant'}
          </button>

          {editedOutput && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(editedOutput);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>

              {cvs.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    aria-label="Target CV"
                    className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    {cvs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCvId && editedOutput.trim()) {
                        onApplySummaryToCV(selectedCvId, editedOutput.trim());
                        setAppliedToast(true);
                        setTimeout(() => setAppliedToast(false), 2500);
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                  >
                    {appliedToast ? 'Applied to Summary!' : 'Apply as CV Summary'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
            <div className="text-sm text-slate-800">
              <span className="font-semibold">What changed: </span>
              {result.explanation}
            </div>
            {result.issuesFound.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                {result.issuesFound.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
            {result.suggestedSkills && result.suggestedSkills.length > 0 && (
              <div className="text-xs text-slate-700">
                <span className="font-semibold">Suggested Skills: </span>
                {result.suggestedSkills.join(' · ')}
              </div>
            )}
            <div className="text-xs text-slate-500">{result.preservedFactsNotice}</div>
          </div>
        )}
      </div>
    </div>
  );
};
