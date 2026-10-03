import { BaseAiProvider } from './baseProvider.js';

/**
 * Google Gemini AI Provider (Gemini 1.5 Flash / 2.0 Flash)
 * Supports multimodal reasoning: prompt + metadata + silences/scenes + sampled video frames.
 * Returns strict structured Edit Plan JSON.
 */

export class GeminiProvider extends BaseAiProvider {
  constructor(options = {}) {
    super('gemini');
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options.model || 'gemini-1.5-flash';
  }

  isAvailable() {
    return !!(this.apiKey && this.apiKey.trim().length > 10);
  }

  async testConnection() {
    if (!this.isAvailable()) {
      return { success: false, message: 'No Gemini API key configured.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: 'Respond with JSON {"status": "ok"}' }] }],
        generationConfig: { response_mime_type: 'application/json' }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.error?.message || `HTTP ${res.status} error` };
      }

      return { success: true, message: `Connected to Google ${this.model} successfully!` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async generateEditPlan({ prompt, videoAnalysis, projectContext, activeClip }) {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured.');
    }

    const duration = videoAnalysis?.metadata?.duration || activeClip?.duration || 10;
    const silences = videoAnalysis?.audio?.silences || [];
    const scenes = videoAnalysis?.scenes?.detectedCuts || [];
    const sampledFrames = videoAnalysis?.sampledFrames || [];

    // System instruction defining the edit brain role
    const systemPrompt = `You are an expert AI video editor and director for a desktop video editing application.
Your goal is to understand the user's natural language creative request and generate a precise, sensible, non-destructive EDIT PLAN.
You are given:
- Video metadata (duration: ${duration}s, resolution: ${videoAnalysis?.metadata?.width}x${videoAnalysis?.metadata?.height}, FPS: ${videoAnalysis?.metadata?.fps})
- Audio analysis (loudness: ${videoAnalysis?.audio?.meanVolume || 'N/A'}, detected silences: ${JSON.stringify(silences)})
- Visual scene changes at timestamps: ${JSON.stringify(scenes)}
- Sampled frames across the timeline representing key moments

RULES FOR EDITING:
1. Conservative & Sensible: Never randomly cut or destroy footage. Only cut what the user asked for or what is clearly dead air/unneeded.
2. Timestamps: All timestamps in "keep" and "remove" must be between 0.0 and ${duration.toFixed(1)} seconds.
3. Keep Segments: List the exact time intervals to preserve on the timeline.
4. Color/Effects: brightness (-0.5 to +0.5, default 0), contrast (0.5 to 1.5, default 1.0), saturation (0.0 to 2.0, default 1.0).
5. Speed: Playback speed (0.25 to 4.0, default 1.0).
6. Response MUST be valid JSON adhering strictly to the schema provided.`;

    const userParts = [
      { text: `User Editing Command: "${prompt}"\n\nVideo Context:\nDuration: ${duration}s\nDetected Silences: ${JSON.stringify(silences)}\nDetected Scene Transitions: ${JSON.stringify(scenes)}\n\nPlease reason about the footage and output the structured Edit Plan JSON.` }
    ];

    // Attach up to 4 sampled frames for visual understanding
    for (const frame of sampledFrames.slice(0, 4)) {
      if (frame.base64) {
        userParts.push({
          inlineData: {
            mimeType: frame.mimeType || 'image/jpeg',
            data: frame.base64
          }
        });
      }
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsed = JSON.parse(candidateText);
    return this.normalizePlan(parsed, duration, prompt);
  }

  normalizePlan(raw, duration, prompt) {
    const keep = Array.isArray(raw.keep) && raw.keep.length > 0
      ? raw.keep.map(k => ({
          start: Math.max(0, Math.min(duration, parseFloat(k.start || 0))),
          end: Math.max(0.1, Math.min(duration, parseFloat(k.end || duration))),
          reason: k.reason || 'Selected content segment'
        }))
      : [{ start: 0, end: duration, reason: 'Full video clip' }];

    const remove = Array.isArray(raw.remove)
      ? raw.remove.map(r => ({
          start: Math.max(0, Math.min(duration, parseFloat(r.start || 0))),
          end: Math.max(0, Math.min(duration, parseFloat(r.end || duration))),
          reason: r.reason || 'Removed section'
        }))
      : [];

    const effects = raw.effects && typeof raw.effects === 'object' ? {
      brightness: parseFloat(raw.effects.brightness || 0),
      contrast: parseFloat(raw.effects.contrast || 1.0),
      saturation: parseFloat(raw.effects.saturation || 1.0)
    } : { brightness: 0, contrast: 1.0, saturation: 1.0 };

    return {
      provider: 'gemini',
      modelName: this.model,
      summary: raw.summary || `Applied AI edit for: "${prompt}"`,
      reasoning: raw.reasoning || 'Analyzed video frames, silences and pacing to construct optimal timeline plan.',
      targetDuration: raw.targetDuration || keep.reduce((acc, k) => acc + (k.end - k.start), 0),
      keep,
      remove,
      effects,
      speed: parseFloat(raw.speed || 1.0),
      muteAudio: !!raw.muteAudio,
      captions: !!raw.captions,
      textOverlay: raw.textOverlay ? {
        text: raw.textOverlay.text || 'Highlight',
        position: raw.textOverlay.position || 'bottom',
        fontSize: parseInt(raw.textOverlay.fontSize || 40, 10)
      } : null
    };
  }
}
