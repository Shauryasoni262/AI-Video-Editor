import { BaseAiProvider } from './baseProvider.js';

/**
 * Ollama Local AI Provider
 * Connects to a locally running Ollama instance (e.g. llama3, qwen2.5, mistral).
 * 100% free, runs completely on the user's computer.
 */

export class OllamaProvider extends BaseAiProvider {
  constructor(options = {}) {
    super('ollama');
    this.endpoint = options.endpoint || 'http://localhost:11434';
    this.model = options.model || 'llama3:latest';
  }

  isAvailable() {
    return true;
  }

  async testConnection() {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, { method: 'GET' });
      if (!res.ok) {
        return { success: false, message: `Ollama returned status ${res.status}` };
      }
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      return { 
        success: true, 
        message: `Connected to Ollama! Available models: ${models.join(', ') || 'none'}` 
      };
    } catch (err) {
      return { 
        success: false, 
        message: `Ollama not reachable at ${this.endpoint}. Please make sure Ollama is running.` 
      };
    }
  }

  async generateEditPlan({ prompt, videoAnalysis, projectContext, activeClip }) {
    const duration = videoAnalysis?.metadata?.duration || activeClip?.duration || 10;
    const silences = videoAnalysis?.audio?.silences || [];

    const promptMessage = `You are a professional video editor AI. Given a video duration of ${duration} seconds and user instruction: "${prompt}", create a structured edit plan JSON adhering to this schema:
{
  "summary": "Short explanation",
  "reasoning": "Reason for edits",
  "keep": [{"start": 0.0, "end": ${duration}, "reason": "content"}],
  "remove": [],
  "effects": {"brightness": 0, "contrast": 1.0, "saturation": 1.0},
  "speed": 1.0,
  "captions": false,
  "textOverlay": null
}
Return ONLY valid JSON.`;

    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: promptMessage,
        format: 'json',
        stream: false
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const parsed = JSON.parse(data.response || '{}');
    return {
      provider: 'ollama',
      modelName: this.model,
      summary: parsed.summary || `Local Ollama edit for: "${prompt}"`,
      reasoning: parsed.reasoning || 'Computed timeline changes using local LLM reasoning.',
      targetDuration: parsed.targetDuration || duration,
      keep: parsed.keep || [{ start: 0, end: duration, reason: 'Full video' }],
      remove: parsed.remove || [],
      effects: parsed.effects || { brightness: 0, contrast: 1.0, saturation: 1.0 },
      speed: parsed.speed || 1.0,
      captions: !!parsed.captions,
      textOverlay: parsed.textOverlay || null
    };
  }
}
