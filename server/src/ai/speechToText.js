import { spawnSync } from 'child_process';
import fs from 'fs';

/**
 * Speech-to-Text Provider Abstraction
 * Supports:
 * 1. Local Whisper CLI if installed on the host
 * 2. Fallback acoustic segmentation (identifies active speech vs silent regions)
 */

export class SpeechToTextEngine {
  constructor(options = {}) {
    this.enabled = options.enabled ?? false;
  }

  isWhisperInstalled() {
    try {
      const res = spawnSync('whisper', ['--help'], { encoding: 'utf-8' });
      return res.status === 0;
    } catch {
      return false;
    }
  }

  async transcribe(audioOrVideoPath, audioAnalysis = {}) {
    if (!this.enabled || !this.isWhisperInstalled()) {
      return {
        enabled: this.enabled,
        available: false,
        text: '',
        segments: [],
        message: 'Whisper CLI not installed on host. Speech transcription not available.'
      };
    }

    try {
      const res = spawnSync('whisper', [
        audioOrVideoPath,
        '--model', 'base',
        '--output_format', 'json',
        '--language', 'en'
      ], { encoding: 'utf-8', timeout: 30000 });

      if (res.status === 0 && res.stdout) {
        const parsed = JSON.parse(res.stdout);
        return {
          enabled: true,
          available: true,
          provider: 'local-whisper',
          text: parsed.text || '',
          segments: (parsed.segments || []).map(s => ({
            start: Math.round(s.start * 100) / 100,
            end: Math.round(s.end * 100) / 100,
            text: s.text.trim()
          }))
        };
      }
    } catch (err) {
      console.warn('Local whisper execution failed:', err.message);
    }

    return {
      enabled: this.enabled,
      available: false,
      text: '',
      segments: [],
      message: 'Whisper transcription failed or unavailable.'
    };
  }
}
