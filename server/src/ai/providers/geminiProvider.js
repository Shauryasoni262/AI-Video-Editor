import { BaseAiProvider } from './baseProvider.js';

/**
 * Google Gemini AI Provider (Gemini 3.8 Flash)
 * Supports multimodal reasoning: prompt + metadata + silences/scenes + sampled video frames.
 * Uses stable v1 API with automatic retry on temporary high-demand (503/429) spikes.
 * Returns strict structured Edit Plan JSON.
 */

export class GeminiProvider extends BaseAiProvider {
  constructor(options = {}) {
    super('gemini');
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options.model || 'gemini-3.8-flash';
  }

  isAvailable() {
    return !!(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Helper: call Gemini API with automatic retry on 503 demand spikes
   * and seamless failover to gemini-2.5-flash if 3.8-flash hits daily free quota cap.
   */
  async callGeminiApi(payload, maxAttempts = 3) {
    const modelsToTry = [this.model];
    if (this.model !== 'gemini-2.5-flash') {
      modelsToTry.push('gemini-2.5-flash');
    }

    let lastError = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Google GenAI requires v1beta for response_mime_type: 'application/json'
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.status === 200) {
            const data = await res.json();
            data._usedModel = modelName;
            return data;
          }

          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status} error`;
          lastError = new Error(errMsg);

          // If quota exceeded (429), switch immediately to next candidate model (e.g. 2.5-flash)
          if (res.status === 429 && errMsg.includes('Quota exceeded')) {
            console.warn(`[Gemini] ${modelName} quota exceeded. Trying backup model...`);
            break;
          }

          // If high-demand spike (503), wait and retry
          if (res.status === 503 || res.status === 429) {
            if (attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, 1200 * attempt));
              continue;
            }
          } else {
            break;
          }
        } catch (netErr) {
          lastError = netErr;
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
    }

    throw lastError || new Error(`Failed to generate content with ${this.model}`);
  }

  async testConnection() {
    if (!this.isAvailable()) {
      return { success: false, message: 'No Gemini API key configured.' };
    }

    try {
      const payload = {
        contents: [{ parts: [{ text: 'Respond with JSON {"status": "ok"}' }] }],
        generationConfig: { response_mime_type: 'application/json' }
      };

      const res = await this.callGeminiApi(payload, 3);
      const activeModel = res._usedModel || this.model;
      return { success: true, message: `Connected to Google ${activeModel} successfully (v1beta JSON API)!` };
    } catch (err) {
      return { success: false, message: err.message || 'Gemini connection failed' };
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
    const systemPrompt = `You are an expert AI video editor and creative director for a desktop video editing application.
Your goal is to understand the user's natural language creative request and generate a precise, high-impact, non-destructive EDIT PLAN.
You are given:
- Video metadata (duration: ${duration}s, resolution: ${videoAnalysis?.metadata?.width}x${videoAnalysis?.metadata?.height}, FPS: ${videoAnalysis?.metadata?.fps})
- Audio analysis (loudness: ${videoAnalysis?.audio?.meanVolume || 'N/A'}, detected silences: ${JSON.stringify(silences)})
- Visual scene changes at timestamps: ${JSON.stringify(scenes)}
- Sampled frames across the timeline representing key moments

RULES FOR EDITING:
1. Frame Aspect Ratio ("aspectRatio"):
   - If the user asks for "9:16", "reel", "Instagram reel", "Shorts", "TikTok", "vertical", "story", or "frame 9:16": ALWAYS set "aspectRatio": "9:16".
   - If the user asks for "1:1" or "square": set "aspectRatio": "1:1".
   - If the user asks for "16:9", "widescreen", "horizontal": set "aspectRatio": "16:9".
   - Default is "16:9" unless specified or implied.

2. Social Reels & Viral Cuts ("reel", "shorts", "tiktok"):
   - If the user asks to "Make this a clean Instagram reel" or "make reel":
     - Set "aspectRatio": "9:16".
     - NEVER return the entire raw clip unchanged! A reel needs a snappy hook and dynamic pacing.
     - Extract the best high-energy segment (e.g. 5.0s to 8.0s) from the video or cut off idle lead-in/lead-out.
     - Set snappy speed (e.g. 1.1x to 1.2x) to maintain fast mobile engagement.
     - Boost vibrant colors (contrast: 1.15, saturation: 1.25).
     - Add an engaging title textOverlay (e.g. "Highlight", "Must See").

3. Trimming & Silences:
   - When asked to "Remove boring parts" or "keep best moments":
     - Cut out any detected silences or trim the initial static 1-2 seconds and trailing idle buffer.
     - Timestamps in "keep" and "remove" must be between 0.0 and ${duration.toFixed(1)} seconds.

4. Frame-Only Changes ("make it 9:16 frame"):
   - Set "aspectRatio": "9:16". Keep duration as requested, and note in summary that framing has been adapted to 9:16 vertical reel.

5. Color/Effects: brightness (-0.5 to +0.5, default 0), contrast (0.5 to 1.5, default 1.0), saturation (0.0 to 2.0, default 1.0).
6. Speed: Playback speed (0.25 to 4.0, default 1.0).
7. GREETINGS & QUESTIONS: If the user says hello/hi, or asks what you can do (not an editing request):
   Set "isConversational": true, keep the whole clip as [0, duration], no effects or speed changes, and in "summary" give a friendly greeting. In "reasoning", explain 3-4 creative ways you can edit their video (e.g. "Make an Instagram reel", "Remove boring parts", "Make it brighter").

JSON OUTPUT SCHEMA:
{
  "summary": "Short user-facing summary of what was edited",
  "reasoning": "Explanation of how you analyzed the footage, silences, and framing",
  "aspectRatio": "16:9" | "9:16" | "1:1",
  "targetDuration": number,
  "keep": [{ "start": number, "end": number, "reason": "string" }],
  "remove": [{ "start": number, "end": number, "reason": "string" }],
  "effects": { "brightness": number, "contrast": number, "saturation": number },
  "speed": number,
  "muteAudio": boolean,
  "captions": boolean,
  "textOverlay": { "text": "string", "position": "top" | "bottom" | "center", "fontSize": number } | null
}`;

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

    const data = await this.callGeminiApi(payload, 3);
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini returned an empty response.');
    }

    // Clean any markdown code fences if model returned ```json ... ```
    let cleanedJson = candidateText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(cleanedJson);
    return this.normalizePlan(parsed, duration, prompt, data._usedModel || this.model);
  }

  normalizePlan(raw, duration, prompt, usedModel) {
    const isConversational = !!raw.isConversational || /^(hi|hello|hey|greetings|hola|sup|yo|what can you do|help)\b/i.test(prompt.trim());

    // Determine Aspect Ratio
    let aspectRatio = raw.aspectRatio;
    if (!aspectRatio) {
      if (/9:?16|reel|vertical|shorts?|tiktok|story/i.test(prompt)) {
        aspectRatio = '9:16';
      } else if (/1:?1|square/i.test(prompt)) {
        aspectRatio = '1:1';
      } else if (/16:?9|horizontal|landscape|widescreen/i.test(prompt)) {
        aspectRatio = '16:9';
      } else {
        aspectRatio = '16:9';
      }
    }

    // Sensible Reel Handling: If user wanted a reel or boring parts removed, but AI returned full clip unchanged
    let rawKeep = raw.keep;
    let rawRemove = raw.remove;
    const wantsReel = /reel|instagram|tiktok|short/i.test(prompt);
    const wantsBoringRemoved = /boring|silence|dead air/i.test(prompt);

    if ((wantsReel || wantsBoringRemoved) && Array.isArray(rawKeep) && rawKeep.length === 1 && rawKeep[0].start <= 0.1 && rawKeep[0].end >= duration - 0.2) {
      // Create punchy reel cut (e.g. drop 1.5s lead-in, keep peak 6-8s)
      const leadCut = Math.min(1.5, duration * 0.15);
      const targetReelDur = Math.min(7.0, duration - leadCut);
      const reelEnd = Math.min(duration, leadCut + targetReelDur);

      rawKeep = [{
        start: Math.round(leadCut * 10) / 10,
        end: Math.round(reelEnd * 10) / 10,
        reason: 'Peak engagement viral moment for Instagram Reel'
      }];
      rawRemove = [
        ...(leadCut > 0 ? [{ start: 0, end: Math.round(leadCut * 10) / 10, reason: 'Slow intro setup' }] : []),
        ...(reelEnd < duration ? [{ start: Math.round(reelEnd * 10) / 10, end: duration, reason: 'Excess footage past optimal reel length' }] : [])
      ];
    }

    const keep = Array.isArray(rawKeep) && rawKeep.length > 0
      ? rawKeep.map(k => ({
          start: Math.max(0, Math.min(duration, parseFloat(k.start || 0))),
          end: Math.max(0.1, Math.min(duration, parseFloat(k.end || duration))),
          reason: k.reason || 'Selected content segment'
        }))
      : [{ start: 0, end: duration, reason: 'Full video clip' }];

    const remove = Array.isArray(rawRemove)
      ? rawRemove.map(r => ({
          start: Math.max(0, Math.min(duration, parseFloat(r.start || 0))),
          end: Math.max(0.1, Math.min(duration, parseFloat(r.end || duration))),
          reason: r.reason || 'Removed section'
        }))
      : [];

    const effects = raw.effects && typeof raw.effects === 'object' ? {
      brightness: parseFloat(raw.effects.brightness || 0),
      contrast: parseFloat(raw.effects.contrast || 1.0),
      saturation: parseFloat(raw.effects.saturation || 1.0)
    } : { brightness: 0, contrast: 1.0, saturation: 1.0 };

    if (wantsReel && effects.saturation === 1.0) {
      effects.saturation = 1.25; // Social media vibrant pop
      effects.contrast = 1.12;
    }

    let speed = parseFloat(raw.speed || 1.0);
    if (wantsReel && speed === 1.0) {
      speed = 1.1; // Snappy pacing for reels
    }

    return {
      provider: 'gemini',
      modelName: usedModel || this.model,
      isConversational,
      aspectRatio,
      summary: raw.summary || (isConversational ? "Hello! How can I help you edit this video?" : `Applied AI edit for: "${prompt}"`),
      reasoning: raw.reasoning || 'Analyzed video frames, silences and pacing to construct optimal timeline plan.',
      targetDuration: raw.targetDuration || keep.reduce((acc, k) => acc + (k.end - k.start), 0),
      keep,
      remove,
      effects,
      speed,
      muteAudio: !!raw.muteAudio,
      captions: !!raw.captions,
      textOverlay: raw.textOverlay ? {
        text: raw.textOverlay.text || 'Highlight',
        position: raw.textOverlay.position || 'bottom',
        fontSize: parseInt(raw.textOverlay.fontSize || 40, 10)
      } : (wantsReel ? { text: '✨ Best Moment', position: 'bottom', fontSize: 36 } : null)
    };
  }
}

