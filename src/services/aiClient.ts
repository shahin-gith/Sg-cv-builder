import {
  AIJobOptimizationResponse,
  AIReviewResponse,
  AIRewriteResponse,
  CVDocument,
  RewriteAction,
  WritingStyle,
} from '../types/cv';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${res.status}`
    );
  }
  return data as T;
}

export function requestAIRewrite(params: {
  text: string;
  action: RewriteAction;
  style: WritingStyle;
  sourceLanguage?: 'auto' | 'en' | 'bn';
  context?: {
    jobTitle?: string;
    experienceText?: string;
    skills?: string[];
  };
}): Promise<AIRewriteResponse> {
  return postJson<AIRewriteResponse>('/api/ai/rewrite', params);
}

export function requestAICVReview(cv: CVDocument): Promise<AIReviewResponse> {
  return postJson<AIReviewResponse>('/api/ai/review', { cv });
}

export function requestAIJobOptimization(
  cv: CVDocument,
  jobDescription: string
): Promise<AIJobOptimizationResponse> {
  return postJson<AIJobOptimizationResponse>('/api/ai/optimize-job', {
    cv,
    jobDescription,
  });
}
