/**
 * adviceService.ts
 * 
 * Frontend service that calls the backend /api/advice endpoint.
 * NO fallback templates. NO direct Gemini API calls.
 * If the backend fails, returns null so the UI can show an error message.
 */

export interface AdviceInput {
  mood: string;
  energy_level: number;
  note?: string;
  gratitude?: string;
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
    const variationSeed = input.variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (import.meta.env.DEV) {
      console.debug('[adviceService] Sending to /api/advice:', {
        mood, energy_level, note: note.slice(0, 50), gratitude: gratitude.slice(0, 50),
        recentEntriesCount: recentEntries.length, variationSeed
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          energy_level,
          note,
          gratitude,
          recentEntries,
          variationSeed
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[adviceService] API returned status ${response.status}:`, errorData);
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
      return {
        success: false,
        advice: null,
        error: AI_UNAVAILABLE_MESSAGE
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.warn('[adviceService] Request timed out after 10s');
      } else {
        console.warn('[adviceService] Request failed:', error.message || error);
      }

      return {
        success: false,
        advice: null,
        error: AI_UNAVAILABLE_MESSAGE
      };
    }
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
