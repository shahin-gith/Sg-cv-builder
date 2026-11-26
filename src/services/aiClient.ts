import {
  AIGenerateCVResponse,
  AIJobOptimizationResponse,
  AIReviewResponse,
  AIRewriteResponse,
  CVDocument,
  RewriteAction,
  WritingStyle,
} from '../types/cv';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const attempt = async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { res, data } = await attempt();
  const isTransientGatewayStatus = res.status === 404 || res.status === 502 || res.status === 503;
  if (!res.ok && isTransientGatewayStatus && typeof data?.error !== 'string') {
    await new Promise((r) => setTimeout(r, 700));
    ({ res, data } = await attempt());
  }

  if (!res.ok) {
    if (typeof data?.error === 'string' && data.error.trim()) {
      throw new Error(data.error);
    }
    if (res.status === 404) {
      throw new Error(
        'AI server route could not be reached (404). Please refresh the page and try again.'
      );
    }
    throw new Error(`Request failed with status ${res.status}`);
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

export function requestGenerateCustomCV(params: {
  rawText: string;
  targetMarket?: 'auto' | 'singapore' | 'europe' | 'canada' | 'global';
  writingStyle?: WritingStyle;
}): Promise<AIGenerateCVResponse> {
  return postJson<AIGenerateCVResponse>('/api/ai/generate-cv', params);
}
