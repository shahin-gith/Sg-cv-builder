import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  requestAICVReview,
  requestAIJobOptimization,
} from '../services/aiClient';
import {
  AIJobOptimizationResponse,
  AIReviewResponse,
  CVDocument,
} from '../types/cv';
import { runLocalCVDiagnostics } from '../utils/cvLogic';

interface CVReviewViewProps {
  cvs: CVDocument[];
  onUpdateCV: (updated: CVDocument) => void;
}

export const CVReviewView: React.FC<CVReviewViewProps> = ({
  cvs,
  onUpdateCV,
}) => {
  const [selectedId, setSelectedId] = useState<string>(cvs[0]?.id ?? '');
  const [activeMode, setActiveMode] = useState<'review' | 'job'>('review');

  const selectedCV = useMemo(
    () => cvs.find((c) => c.id === selectedId) ?? cvs[0],
    [cvs, selectedId]
  );

  const localDiagnostics = useMemo(
    () => (selectedCV ? runLocalCVDiagnostics(selectedCV) : null),
    [selectedCV]
  );

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<AIReviewResponse | null>(null);

  const [jobDescription, setJobDescription] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<AIJobOptimizationResponse | null>(
    null
  );
  const [appliedSummary, setAppliedSummary] = useState(false);

  if (!selectedCV) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Create a CV first to run AI Review or Job Description Optimization.
      </div>
    );
  }

  const handleRunReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await requestAICVReview(selectedCV);
      setAiReview(res);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'CV review failed.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRunJobOptimize = async () => {
    if (!jobDescription.trim()) {
      setJobError('Please paste a job description first.');
      return;
    }
    setJobLoading(true);
    setJobError(null);
    try {
      const res = await requestAIJobOptimization(selectedCV, jobDescription);
      setJobResult(res);
      setAppliedSummary(false);
    } catch (err) {
      setJobError(err instanceof Error ? err.message : 'Job analysis failed.');
    } finally {
      setJobLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI CV Review & Job Description Optimizer
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit grammar, date consistency, ATS readability, and tailor your CV to a target job posting without inventing experience.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Select CV:
          </label>
          <select
            value={selectedCV.id}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setAiReview(null);
              setJobResult(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveMode('review')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeMode === 'review'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          CV Quality Review & Score
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('job')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeMode === 'job'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Job Description Optimizer
        </button>
      </div>

      {activeMode === 'review' ? (
        <div className="space-y-6">
          {/* Instant Structural Check + AI Trigger */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Structural & Date Pre-Check ({selectedCV.name})
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {aiReview
                  ? `${aiReview.overallScore} / 100`
                  : `${localDiagnostics?.estimatedBaselineScore ?? 0} / 100 Baseline`}
              </div>
              <p className="text-xs text-slate-500">
                Feedback guides clarity and completeness; it does not guarantee job selection or specific ATS outcomes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunReview}
              disabled={reviewLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {reviewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {reviewLoading ? 'Analyzing CV...' : 'Run Full AI CV Review'}
            </button>
          </div>

          {reviewError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reviewError}
            </div>
          )}

          {/* Local Pre-Check Details */}
          {localDiagnostics && !aiReview && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Missing Information Checks
                </h3>
                {localDiagnostics.missingInfoWarnings.length === 0 ? (
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    All essential personal, summary, experience, and skill fields are present.
                  </p>
                ) : (
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
                    {localDiagnostics.missingInfoWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Date & Repetition Checks
                </h3>
                {localDiagnostics.dateConsistencyNotes.length === 0 &&
                localDiagnostics.repeatedContent.length === 0 ? (
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    No employment date conflicts or repeated bullet lines detected.
                  </p>
                ) : (
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
                    {localDiagnostics.dateConsistencyNotes.map((n, i) => (
                      <li key={`d-${i}`}>{n}</li>
                    ))}
                    {localDiagnostics.repeatedContent.map((r, i) => (
                      <li key={`r-${i}`}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Full Gemini AI Review Output */}
          {aiReview && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Professional Summary Quality
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiReview.summaryQuality}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    ATS Readability Assessment
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiReview.atsReadability}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Grammar & Spelling Findings
                  </h3>
                  {aiReview.grammarFindings.length === 0 ? (
                    <p className="text-xs text-emerald-700">No major grammar issues detected.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
                      {aiReview.grammarFindings.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Missing Information Warnings
                  </h3>
                  {aiReview.missingInfoWarnings.length === 0 ? (
                    <p className="text-xs text-emerald-700">No critical fields missing.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-amber-800 space-y-1">
                      {aiReview.missingInfoWarnings.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Date & Repetition Checks
                  </h3>
                  {aiReview.dateConsistencyNotes.length === 0 &&
                  aiReview.repeatedContent.length === 0 ? (
                    <p className="text-xs text-emerald-700">Consistent timeline and wording.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
                      {aiReview.dateConsistencyNotes.map((d, i) => (
                        <li key={`ad-${i}`}>{d}</li>
                      ))}
                      {aiReview.repeatedContent.map((r, i) => (
                        <li key={`ar-${i}`}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {aiReview.weakDescriptions.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Descriptions to Strengthen
                  </h3>
                  <div className="space-y-3">
                    {aiReview.weakDescriptions.map((w, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1"
                      >
                        <div className="text-xs font-semibold text-slate-900">
                          {w.section}
                        </div>
                        <div className="text-xs text-slate-500">
                          Current: {w.currentText}
                        </div>
                        <div className="text-xs text-blue-800 font-medium">
                          Suggestion: {w.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Section-by-Section Feedback
                </h3>
                <div className="divide-y divide-slate-100">
                  {aiReview.sectionFeedback.map((s, i) => (
                    <div key={i} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {s.section}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{s.feedback}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          s.status === 'Strong'
                            ? 'text-emerald-700'
                            : s.status === 'Missing'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {aiReview.disclaimer}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                Paste Target Job Description
              </label>
              <button
                type="button"
                onClick={() =>
                  setJobDescription(
                    'Senior Building Maintenance Technician (Singapore)\nRequirements:\n- Minimum 5 years hands-on experience in commercial LV switchgear, chiller pumps, and AHU VFD maintenance.\n- Valid BCA CoreTrade Electrical or WSH safety certification.\n- Experience managing Permit-to-Work (PTW) and preventive CMMS schedules.\n- Class 3 driving licence preferred for multi-site support.'
                  )
                }
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Load Sample Singapore Job Posting
              </button>
            </div>
            <textarea
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting requirements, responsibilities, and desired skills here..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {jobError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {jobError}
              </div>
            )}
            <button
              type="button"
              onClick={handleRunJobOptimize}
              disabled={jobLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
            >
              {jobLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {jobLoading ? 'Matching Against Profile...' : 'Analyze & Optimize CV'}
            </button>
          </div>

          {jobResult && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Target Role</div>
                  <div className="text-lg font-bold text-slate-900">
                    {jobResult.roleTitle}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Profile Alignment</div>
                  <div className="text-2xl font-bold text-blue-700 tabular-nums">
                    {jobResult.matchScore}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Matched Skills Already in Your CV
                  </h3>
                  <p className="text-sm text-slate-700">
                    {jobResult.matchedSkills.length > 0
                      ? jobResult.matchedSkills.join(' · ')
                      : 'No direct skill overlaps identified yet.'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Missing Skills / Gaps (Not Added Automatically)
                  </h3>
                  <p className="text-sm text-slate-700">
                    {jobResult.missingSkillsGap.length > 0
                      ? jobResult.missingSkillsGap.join(' · ')
                      : 'Your current CV covers the listed requirements well.'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    Tailored Professional Summary (Grounded in Your Real Experience)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCV({
                        ...selectedCV,
                        summary: jobResult.tailoredSummary,
                        updatedAt: new Date().toISOString(),
                      });
                      setAppliedSummary(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
                  >
                    {appliedSummary ? 'Applied to CV!' : 'Apply Summary to CV'}
                  </button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  {jobResult.tailoredSummary}
                </p>
              </div>

              {jobResult.recommendedExperienceToEmphasize.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Experience to Emphasize
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {jobResult.recommendedExperienceToEmphasize.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {jobResult.bulletSuggestions.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Suggested Improvements to Existing Descriptions
                  </h3>
                  {jobResult.bulletSuggestions.map((b, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                    >
                      <div className="text-xs font-semibold text-slate-900">
                        {b.experienceTitle}
                      </div>
                      <div className="text-xs text-slate-500">
                        Original: {b.originalText}
                      </div>
                      <div className="text-xs text-blue-800 font-medium">
                        Suggested: {b.suggestedText}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Why: {b.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">{jobResult.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
