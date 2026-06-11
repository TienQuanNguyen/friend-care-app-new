/**
 * adviceService.ts
 * 
 * Frontend service that calls the backend /api/advice endpoint.
 * NO fallback templates. NO direct Gemini API calls.
 * If the backend fails, returns null so the UI can show an error message.
 */

export interface AdviceInput {
  currentUser?: {
    id: string;
    display_name?: string;
    email?: string;
  };
  mood: string;
  energy_level: number;
  note?: string;
  gratitude?: string;
  personalRecentEntries?: Array<{
    id?: string;
    created_by: string;
    creator_name?: string;
    created_at?: string;
    entry_date?: string;
    mood: string;
    energy_level: number;
    note?: string;
    gratitude?: string;
    ai_advice?: string;
  }>;
  sharedRecentEntries?: Array<{
    id?: string;
    created_by: string;
    creator_name?: string;
    created_at?: string;
    entry_date?: string;
    mood: string;
    energy_level: number;
    note?: string;
    gratitude?: string;
  }>;
  recentEntries?: Array<{
    date: string;
    mood: string;
    energy: number;
    note?: string;
    gratitude?: string;
  }>;
  variationSeed?: string;
}

export interface AdviceResult {
  success: boolean;
  advice: string | null;
  error?: string;
}

const AI_UNAVAILABLE_MESSAGE = 'Hiện chưa tạo được lời khuyên AI. Bạn thử lại sau nhé.';
const REQUEST_TIMEOUT_MS = 50000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1200;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (milliseconds: number) =>
  new Promise(resolve => window.setTimeout(resolve, milliseconds));

export const adviceService = {
  /**
   * Call backend /api/advice to get AI-generated advice.
   * Returns AdviceResult with success=false if anything goes wrong.
   * NEVER generates fake template advice locally.
   */
  async getAIAdvice(input: AdviceInput): Promise<AdviceResult> {
    const mood = input.mood || 'Bình yên';
    const energy_level = (typeof input.energy_level === 'number' && input.energy_level >= 1 && input.energy_level <= 10)
      ? input.energy_level : 5;
    const note = input.note || '';
    const gratitude = input.gratitude || '';
    const recentEntries = Array.isArray(input.recentEntries) ? input.recentEntries : [];
    const personalRecentEntries = Array.isArray(input.personalRecentEntries) ? input.personalRecentEntries : [];
    const sharedRecentEntries = Array.isArray(input.sharedRecentEntries) ? input.sharedRecentEntries : [];
    const variationSeed = input.variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (import.meta.env.DEV) {
      console.debug('[adviceService] Sending to /api/advice:', {
        currentUser: input.currentUser,
        mood, energy_level, note: note.slice(0, 50), gratitude: gratitude.slice(0, 50),
        personalRecentEntriesCount: personalRecentEntries.length,
        sharedRecentEntriesCount: sharedRecentEntries.length,
        variationSeed
      });
    }

    const requestBody = JSON.stringify({
      currentUser: input.currentUser,
      mood,
      energy_level,
      note,
      gratitude,
      personalRecentEntries,
      sharedRecentEntries,
      recentEntries,
      variationSeed
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch('/api/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`[adviceService] API returned status ${response.status}:`, errorData);

          if (attempt < MAX_ATTEMPTS && RETRYABLE_STATUS_CODES.has(response.status)) {
            await wait(RETRY_DELAY_MS);
            continue;
          }

          return {
            success: false,
            advice: null,
            error: AI_UNAVAILABLE_MESSAGE
          };
        }

        const data = await response.json();
        if (data && typeof data.advice === 'string' && data.advice.trim().length > 0) {
          return {
            success: true,
            advice: data.advice.trim()
          };
        }

        console.warn('[adviceService] API returned invalid data:', data);
      } catch (error: unknown) {
        const isAbortError = error instanceof DOMException && error.name === 'AbortError';
        console.warn(
          isAbortError
            ? `[adviceService] Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
            : '[adviceService] Request failed:',
          isAbortError ? undefined : error
        );

        if (attempt < MAX_ATTEMPTS) {
          await wait(RETRY_DELAY_MS);
          continue;
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    return {
      success: false,
      advice: null,
      error: AI_UNAVAILABLE_MESSAGE
    };
  },

  /**
   * Backwards-compatible wrapper. Returns the advice string or a short error message.
   * Used by MoodJournal.tsx handleSubmit.
   */
  async getAdvice(input: AdviceInput): Promise<string> {
    const result = await this.getAIAdvice(input);
    if (result.success && result.advice) {
      return result.advice;
    }
    // Return empty string so caller knows it failed
    return '';
  }
};
