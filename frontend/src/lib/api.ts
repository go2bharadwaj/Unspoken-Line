import { AnalyzeSketchRequest, AnalyzeSketchResponse } from '../types';

export async function analyzeSketch(
  req: AnalyzeSketchRequest
): Promise<AnalyzeSketchResponse> {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}/api/v1/analyze-sketch`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
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
    const data = (await response.json()) as AnalyzeSketchResponse;
    return data;
  } catch {
    throw new Error('Unable to parse the reflection response from the sanctuary service.');
  }
}
