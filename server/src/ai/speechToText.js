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
    if (!this.enabled) {
      return {
        enabled: false,
        text: '',
        segments: []
      };
    }

    if (this.isWhisperInstalled()) {
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
    }

    // Fallback: estimate speech activity from non-silent segments
    const silences = audioAnalysis.silences || [];
    const duration = audioAnalysis.duration || 10;
    const speechSegments = [];
    let currentPos = 0;

    for (const sil of silences) {
      if (sil.start > currentPos + 0.5) {
        speechSegments.push({
          start: currentPos,
          end: sil.start,
          text: '[Spoken Dialogue / Audio Highlight]'
        });
      }
      currentPos = sil.end;
    }

    if (currentPos < duration - 0.5) {
      speechSegments.push({
        start: currentPos,
        end: duration,
        text: '[Spoken Dialogue / Audio Highlight]'
      });
    }

    return {
      enabled: this.enabled,
      provider: 'acoustic-speech-detector',
      text: speechSegments.length > 0 ? speechSegments.map(s => s.text).join(' ') : '',
      segments: speechSegments
    };
  }
}
