import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { requestGenerateCustomCV } from '../services/aiClient';
import { CVDocument, UserProfile, WritingStyle } from '../types/cv';
import {
  buildGeneratedCVFromAI,
  ONE_BOX_SAMPLE_BENGALI,
  ONE_BOX_SAMPLE_ENGLISH,
  TargetMarket,
} from '../utils/cvGenerator';

interface SmartCVGeneratorViewProps {
  profile: UserProfile;
  onCreatedCV: (cv: CVDocument) => void;
}

const STYLES: WritingStyle[] = [
  'Professional',
  'ATS-friendly',
  'Concise',
  'Formal',
  'Achievement-focused',
];

export const SmartCVGeneratorView: React.FC<SmartCVGeneratorViewProps> = ({
  profile,
  onCreatedCV,
}) => {
  const [rawText, setRawText] = useState('');
  const [targetMarket, setTargetMarket] = useState<TargetMarket>('auto');
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('Professional');
  const [includePhoto, setIncludePhoto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (rawText.trim().length < 10) {
      setError('Please enter the person’s CV details in the box below (name, role, experience, skills).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const aiData = await requestGenerateCustomCV({
        rawText: rawText.trim(),
        targetMarket,
        writingStyle,
      });

      const generatedCV = buildGeneratedCVFromAI(aiData, {
        targetMarket,
        includePhoto,
        existingPhotoUrl: profile.personal.photoUrl || '',
      });

      onCreatedCV(generatedCV);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate CV right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            1-Box AI Custom CV Builder
          </h1>
          <p className="text-sm text-slate-700 mt-1">
            একটি বক্সেই ব্যক্তির সব তথ্য (বাংলা বা ইংরেজি) দিন — AI সেরা টেমপ্লেট বেছে নিয়ে কাস্টমাইজযোগ্য CV বানিয়ে দিবে।
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setRawText(ONE_BOX_SAMPLE_BENGALI);
              setError(null);
            }}
            className="px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-indigo-900 hover:bg-indigo-50 whitespace-nowrap"
          >
            Load Bengali Sample
          </button>
          <button
            type="button"
            onClick={() => {
              setRawText(ONE_BOX_SAMPLE_ENGLISH);
              setError(null);
            }}
            className="px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs font-semibold text-sky-900 hover:bg-sky-50 whitespace-nowrap"
          >
            Load English Sample
          </button>
        </div>
      </div>

      {/* Concise 3-Step Instructions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-1">
          <div className="text-xs font-bold text-sky-900">1. সব তথ্য এক বক্সে লিখুন</div>
          <p className="text-xs text-slate-700 leading-relaxed">
            নাম, ফোন, ইমেইল, পেশা, অভিজ্ঞতা, সার্টিফিকেট, লাইসেন্স, শিক্ষা ও স্কিল বাংলা বা ইংরেজিতে লিখুন/পেস্ট করুন।
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-1">
          <div className="text-xs font-bold text-indigo-900">2. AI টেমপ্লেট ও ইংরেজি সাজাবে</div>
          <p className="text-xs text-slate-700 leading-relaxed">
            AI আপনার পেশা বুঝে সঠিক টেমপ্লেট, কালার ও প্রফেশনাল ইংরেজি CV তৈরি করবে (কোনো ভুয়া তথ্য যোগ করবে না)।
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1">
          <div className="text-xs font-bold text-emerald-900">3. সাথে সাথে কাস্টমাইজ করুন</div>
          <p className="text-xs text-slate-700 leading-relaxed">
            তৈরি হওয়ার পর লাইভ এডিটরে টেমপ্লেট, রঙ, ফন্ট, ছবি ও সেকশন বদলে PDF ডাউনলোড বা প্রিন্ট করুন।
          </p>
        </div>
      </section>

      {/* Main Single Input Workspace */}
      <div className="bg-white border border-sky-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Job Market
            </label>
            <select
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value as TargetMarket)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="auto">Auto-Detect Best Template</option>
              <option value="singapore">Singapore Sectors</option>
              <option value="europe">Europe (Europass-Inspired)</option>
              <option value="canada">Canada (Resume Standard)</option>
              <option value="global">Global / Corporate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Writing Style
            </label>
            <select
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value as WritingStyle)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <span className="text-xs font-semibold text-slate-800">
                Include Photo Slot
              </span>
              <input
                type="checkbox"
                checked={includePhoto}
                onChange={(e) => setIncludePhoto(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
            </label>
          </div>
        </div>

        <div>
          <label
            htmlFor="one-box-cv-input"
            className="block text-xs font-bold text-slate-800 mb-1.5"
          >
            All CV Information (Name, Contact, Role, Experience, Education, Certificates, Skills — বাংলা / English)
          </label>
          <textarea
            id="one-box-cv-input"
            rows={11}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`উদাহরণ:\nনাম: ... | পেশা: ... | ফোন: ... | ইমেইল: ...\nঅভিজ্ঞতা: কোম্পানি, সময়কাল ও কাজের বিবরণ...\nসার্টিফিকেট / লাইসেন্স: ...\nশিক্ষা ও স্কিল: ...`}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/25 px-4 py-3 text-sm text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              No fake facts added · Editable in Live A4 Editor right after generation
            </span>
            <span className="font-mono-tabular">{rawText.length} chars</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 shadow-xs transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {loading ? 'Building Your Custom CV...' : 'Generate Customizable CV'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Opens automatically in Live Customizer
          </span>
        </div>
      </div>
    </div>
  );
};
