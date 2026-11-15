import {
  AnalyzeSketchRequest,
  AnalyzeSketchResponse,
  SummarizeReadingRequest,
} from '../types';
import { getIdToken } from './firebase';

export function analyzeSketch(req: AnalyzeSketchRequest): Promise<AnalyzeSketchResponse> {
  return postJson<AnalyzeSketchResponse>('/api/v1/analyze-sketch', req);
}

/** Background step after a reading; resolves to the new progression notes (S_n). */
export async function summarizeReading(req: SummarizeReadingRequest): Promise<string> {
  const { summary } = await postJson<{ summary: string }>('/api/v1/summarize-reading', req);
  return summary;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}${path}`;

  const token = await getIdToken();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Network connection failed';
    throw new Error(
      `Unable to connect to the sanctuary service (${errorMsg}). Please check your connection and try again.`
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errData = await response.json();
      // FastAPI 422s carry an array in `detail`; only surface plain strings.
      detail = typeof errData.detail === 'string' ? errData.detail : '';
    } catch {
      // Ignore json parse error for non-json response
    }
    throw new Error(
      detail
        ? `Sanctuary service error: ${detail}`
        : `Sanctuary service responded with status ${response.status}. Please try again.`
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('Unable to parse the reflection response from the sanctuary service.');
  }
}
