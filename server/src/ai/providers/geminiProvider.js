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

    // System instruction defining the expert personal video editor role
    const systemPrompt = `You are an expert personal video editor and creative director for a high-end desktop video editing application.
Your goal is to inspect the supplied video analysis, audio levels, detected silences, scene cuts, and visual sampled frames to generate a thoughtful, professional, non-destructive EDIT PLAN.

YOU MUST NOT BE A GENERIC COMMAND PARSER OR A HARD-CODED "VIRAL REEL" TEMPLATE GENERATOR.
You must inspect the actual footage details and make ACTUAL timestamp-level decisions.

INPUT DATA PROVIDED TO YOU:
- Video duration: ${duration}s, resolution: ${videoAnalysis?.metadata?.width}x${videoAnalysis?.metadata?.height}, FPS: ${videoAnalysis?.metadata?.fps}
- Audio loudness: ${videoAnalysis?.audio?.meanVolume || 'N/A'}, max volume: ${videoAnalysis?.audio?.maxVolume || 'N/A'}
- Detected audio silences / dead air: ${JSON.stringify(silences)}
- Detected visual scene transitions (camera cuts): ${JSON.stringify(scenes)}
- Sampled frames across the timeline: you are provided with visual frames labeled with their exact second on the timeline.

CORE EDITING PRINCIPLES:
1. Timestamp-Level Decisions ("keep" and "remove"):
   - Inspect the detected silences and visual frames.
   - Output non-overlapping, chronological "keep" segments and corresponding "remove" segments that account for the entire footage timeline (from 0.0 to ${duration.toFixed(1)}s).
   - BAD RESULT: Keep: 0 - ${duration.toFixed(1)}s, Remove: none, Reason: "generic". (NEVER do this when trimming/cutting is requested).
   - GOOD RESULT: Precise segments (e.g. Keep: 2.4s-9.1s, 11.2s-24.8s; Remove: 0.0s-2.4s, 9.1s-11.2s, 24.8s-${duration.toFixed(1)}s) with a specific, meaningful reason for each cut (e.g. "Silent setup before speaker starts", "Strong visual hook and continuous presentation", "Dead-air pause between sentences", "Natural wrap-up statement").
   - Prefer preserving meaningful speech and visual context over aggressive random cutting.
   - Do NOT randomly cut the video in the middle of active speech or continuous motion.
   - Make conservative edits when confidence is low.

2. Framing & Aspect Ratio ("aspectRatio"):
   - If user asks for "reel", "9:16", "Instagram reel", "Shorts", "TikTok", "vertical", or "story": set "aspectRatio": "9:16".
   - If user asks for "1:1" or "square": set "aspectRatio": "1:1".
   - If user asks for "16:9", "widescreen", "landscape": set "aspectRatio": "16:9".
   - Default is "16:9" unless vertical / 9:16 is requested or implied.

3. Duration & Pacing:
   - Do NOT force an artificial fixed 10-second or 30-second duration unless the user specifically requested that duration.
   - The total duration of kept footage should naturally reflect the strong, engaging moments of the original video.
   - Do NOT automatically add speed changes (keep speed: 1.0) unless the user explicitly requested speedup/slowdown or a speed change is clearly justified by pacing.

4. Color Grading & Looks ("effects"):
   - If user asks for "subtle cinematic color grading": apply subtle, taste-driven adjustments (e.g., contrast: 1.06 to 1.12, brightness: -0.02 to 0.02, saturation: 1.04 to 1.08, vignette: true for subtle focus).
   - Do NOT automatically blow out saturation to 1.3+ or apply heavy unnatural tints unless stylized looks (e.g. "cyberpunk", "warm golden hour", "noir", "film grain") are explicitly requested.
   - Available effect toggles: "vignette" (boolean), "filmGrain" (boolean), "warm" (boolean), "cool" (boolean), "invert" (boolean), "grayscale" (boolean), "sepia" (boolean).

5. Motion & Camera Animations ("animation"):
   - "kenBurns": Slow, cinematic continuous zoom in into the focal subject (1.0x to 1.25x).
   - "zoomOut": Slow reveal camera pull back (1.25x to 1.0x).
   - "panRight": Smooth horizontal motorized pan across the frame.
   - "pulse": Rhythmic dynamic breathing pulse for music.
   - "none": Static framing (default).
   - "fadeIn": true if fade from black at beginning is appropriate.
   - "fadeOut": true if fade to black at end is appropriate.

6. Text & Captions:
   - Do NOT invent or hallucinate captions when no speech transcription is available. Set "captions": false unless transcript exists or user explicitly asked for placeholder subtitles.
   - Do NOT automatically add text overlays like "Viral Reel", "Highlight", or "Best Moment" unless the user specifically requested adding a title or headline.

7. Sound Effects ("sfx"):
   - Set "sfx" only if requested or uniquely beneficial: "whoosh" (transition swoop), "boom" (cinematic impact hit), "camera" (shutter click), "bell", "pop", "laser", or null.

8. Conversational / Greetings:
   - If the user says hello or asks what you can do (not an edit command): set "isConversational": true, keep the whole clip as [0, ${duration.toFixed(1)}], and provide a helpful, warm response explaining how you can edit their video.

STRICT JSON OUTPUT SCHEMA:
{
  "summary": "Specific, clear summary of what was edited (e.g. 'Created a 9:16 reel by removing 3 pauses, keeping 2 primary action sequences with subtle cinematic contrast')",
  "reasoning": "Detailed breakdown explaining the exact visual and acoustic analysis: which silences were cut, which visual scenes were retained, and why each decision was made",
  "aspectRatio": "16:9" | "9:16" | "1:1",
  "targetDuration": number,
  "keep": [{ "start": number, "end": number, "reason": "string" }],
  "remove": [{ "start": number, "end": number, "reason": "string" }],
  "effects": { 
    "brightness": number, 
    "contrast": number, 
    "saturation": number,
    "vignette": boolean,
    "filmGrain": boolean,
    "warm": boolean,
    "cool": boolean,
    "invert": boolean,
    "grayscale": boolean,
    "sepia": boolean
  },
  "speed": number,
  "muteAudio": boolean,
  "animation": "kenBurns" | "zoomOut" | "panRight" | "pulse" | "none",
  "fadeIn": boolean,
  "fadeOut": boolean,
  "sfx": "whoosh" | "boom" | "camera" | "bell" | "pop" | "laser" | null,
  "duplicate": boolean,
  "captions": boolean,
  "textOverlay": { "text": "string", "position": "top" | "bottom" | "center", "fontSize": number, "animation": "pop" | "slide-up" | "fade" | "none" } | null
}`;

    const userParts = [
      { 
        text: `User Editing Command:\n"${prompt}"\n\nVideo Technical Profile:\n- Total Duration: ${duration}s\n- Resolution: ${videoAnalysis?.metadata?.width}x${videoAnalysis?.metadata?.height} (${videoAnalysis?.metadata?.fps} fps)\n- Audio Loudness: ${videoAnalysis?.audio?.meanVolume || 'N/A'}\n- Detected Silences (${silences.length}): ${JSON.stringify(silences)}\n- Detected Scene Cuts (${scenes.length}): ${JSON.stringify(scenes)}\n- Speech Transcript: ${videoAnalysis?.transcription?.available ? `"${videoAnalysis.transcription.text}"` : 'Unavailable (Whisper not installed / no speech detected)'}\n- Total Sampled Visual Frames: ${sampledFrames.length}\n\nPlease inspect the attached visual frames and acoustic data, and output the professional Edit Plan JSON.`
      }
    ];

    // Attach up to 16 sampled frames with timestamp annotations
    const framesToAttach = sampledFrames.slice(0, 16);
    for (const frame of framesToAttach) {
      if (frame.base64) {
        userParts.push({
          text: `[Frame at ${frame.timestamp}s (${frame.ratio} of video)]`
        });
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
        temperature: 0.15
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
    return this.normalizePlan(parsed, duration, prompt, data._usedModel || this.model, silences);
  }

  normalizePlan(raw, duration, prompt, usedModel, silences = []) {
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

    // Validate and sanitize Keep segments
    let keep = [];
    if (Array.isArray(raw.keep) && raw.keep.length > 0) {
      for (const k of raw.keep) {
        const start = Math.max(0, Math.min(duration, Math.round(parseFloat(k.start || 0) * 10) / 10));
        const end = Math.max(start + 0.3, Math.min(duration, Math.round(parseFloat(k.end || duration) * 10) / 10));
        if (end > start) {
          keep.push({
            start,
            end,
            reason: k.reason || 'Selected content segment'
          });
        }
      }
    }

    // Sort keep segments chronologically
    keep.sort((a, b) => a.start - b.start);

    // Merge overlapping keep segments
    const mergedKeep = [];
    for (const seg of keep) {
      if (mergedKeep.length === 0) {
        mergedKeep.push(seg);
      } else {
        const prev = mergedKeep[mergedKeep.length - 1];
        if (seg.start <= prev.end + 0.2) {
          prev.end = Math.max(prev.end, seg.end);
          prev.reason += ` + ${seg.reason}`;
        } else {
          mergedKeep.push(seg);
        }
      }
    }

    // Fallback if keep was empty
    const finalKeep = mergedKeep.length > 0
      ? mergedKeep
      : [{ start: 0, end: Math.round(duration * 10) / 10, reason: 'Full video clip' }];

    // Derive or sanitize Remove segments to match keep segments exactly
    let remove = [];
    let curTime = 0;
    for (const seg of finalKeep) {
      if (seg.start > curTime + 0.3) {
        // Find matching raw remove reason if Gemini supplied one
        const matchedRaw = Array.isArray(raw.remove) 
          ? raw.remove.find(r => Math.abs(parseFloat(r.start || 0) - curTime) < 1.0)
          : null;
        remove.push({
          start: Math.round(curTime * 10) / 10,
          end: Math.round(seg.start * 10) / 10,
          reason: matchedRaw?.reason || (curTime === 0 ? 'Initial lead-in / pause' : 'Inactive pause / non-essential segment')
        });
      }
      curTime = seg.end;
    }
    if (curTime < duration - 0.4) {
      const matchedRaw = Array.isArray(raw.remove) 
        ? raw.remove.find(r => Math.abs(parseFloat(r.end || duration) - duration) < 1.0)
        : null;
      remove.push({
        start: Math.round(curTime * 10) / 10,
        end: Math.round(duration * 10) / 10,
        reason: matchedRaw?.reason || 'Trailing inactive tail'
      });
    }

    // If Gemini provided explicit remove segments with better reasons, use them if valid
    if (Array.isArray(raw.remove) && raw.remove.length > 0 && remove.length === 0) {
      for (const r of raw.remove) {
        const start = Math.max(0, Math.min(duration, Math.round(parseFloat(r.start || 0) * 10) / 10));
        const end = Math.max(start + 0.2, Math.min(duration, Math.round(parseFloat(r.end || duration) * 10) / 10));
        remove.push({
          start,
          end,
          reason: r.reason || 'Removed section'
        });
      }
    }

    // Effects: Tasteful, non-destructive
    const effects = raw.effects && typeof raw.effects === 'object' ? {
      brightness: parseFloat(raw.effects.brightness || 0),
      contrast: parseFloat(raw.effects.contrast || 1.0),
      saturation: parseFloat(raw.effects.saturation || 1.0),
      vignette: !!raw.effects.vignette,
      filmGrain: !!raw.effects.filmGrain,
      warm: !!raw.effects.warm,
      cool: !!raw.effects.cool,
      invert: !!raw.effects.invert,
      grayscale: !!raw.effects.grayscale,
      sepia: !!raw.effects.sepia
    } : { brightness: 0, contrast: 1.0, saturation: 1.0 };

    // Speed: only adjust if requested or justified by AI
    const speed = Math.max(0.5, Math.min(2.0, parseFloat(raw.speed || 1.0)));

    // Target Duration: sum of kept segment lengths divided by speed
    const calculatedTargetDuration = Math.round(finalKeep.reduce((acc, k) => acc + (k.end - k.start), 0) / speed * 10) / 10;

    // Text overlay: only if explicitly provided in raw
    let textOverlay = null;
    if (raw.textOverlay && raw.textOverlay.text) {
      textOverlay = {
        text: raw.textOverlay.text,
        position: raw.textOverlay.position || 'bottom',
        fontSize: parseInt(raw.textOverlay.fontSize || 36, 10),
        animation: raw.textOverlay.animation || 'none'
      };
    }

    return {
      provider: 'gemini',
      modelName: usedModel || this.model,
      isConversational,
      aspectRatio,
      summary: raw.summary || (isConversational ? "Hello! How can I help you edit this video?" : `Applied AI edit for: "${prompt}"`),
      reasoning: raw.reasoning || 'Analyzed video frames, silences, and visual cuts to construct optimal timeline plan.',
      targetDuration: raw.targetDuration ? Math.round(parseFloat(raw.targetDuration) * 10) / 10 : calculatedTargetDuration,
      keep: finalKeep,
      remove,
      effects,
      speed,
      muteAudio: !!raw.muteAudio,
      animation: raw.animation || 'none',
      fadeIn: !!raw.fadeIn,
      fadeOut: !!raw.fadeOut,
      sfx: raw.sfx || null,
      duplicate: !!raw.duplicate,
      captions: !!raw.captions,
      textOverlay
    };
  }
}

