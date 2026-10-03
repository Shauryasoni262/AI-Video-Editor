import fs from 'fs';
import path from 'path';
import { GeminiProvider } from './providers/geminiProvider.js';
import { OllamaProvider } from './providers/ollamaProvider.js';
import { LocalBrainProvider } from './providers/localBrainProvider.js';
import { analyzeVideo } from './videoAnalyzer.js';
import { SpeechToTextEngine } from './speechToText.js';

export class AiManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.settingsFile = path.join(storageDir, 'settings.json');
    this.settings = this.loadSettings();

    this.localBrain = new LocalBrainProvider();
    this.speechToText = new SpeechToTextEngine({ enabled: this.settings.whisperEnabled });
  }

  loadSettings() {
    const defaults = {
      provider: process.env.GEMINI_API_KEY ? 'gemini' : 'local-brain',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      geminiModel: 'gemini-1.5-flash',
      ollamaEndpoint: 'http://localhost:11434',
      ollamaModel: 'llama3:latest',
      localAiEnabled: true,
      whisperEnabled: false,
      videoAnalysisEnabled: true
    };

    if (fs.existsSync(this.settingsFile)) {
      try {
        const raw = fs.readFileSync(this.settingsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
      } catch (err) {
        console.warn('Failed parsing settings.json:', err.message);
      }
    }

    return defaults;
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf-8');
    this.speechToText = new SpeechToTextEngine({ enabled: this.settings.whisperEnabled });
    return this.getPublicSettings();
  }

  getPublicSettings() {
    const key = this.settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const maskedKey = key ? (key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '••••••••') : '';

    return {
      provider: this.settings.provider,
      hasGeminiKey: !!key,
      maskedKey,
      geminiModel: this.settings.geminiModel,
      ollamaEndpoint: this.settings.ollamaEndpoint,
      ollamaModel: this.settings.ollamaModel,
      localAiEnabled: this.settings.localAiEnabled,
      whisperEnabled: this.settings.whisperEnabled,
      videoAnalysisEnabled: this.settings.videoAnalysisEnabled
    };
  }

  getProvider(providerName) {
    const name = providerName || this.settings.provider;
    const apiKey = this.settings.geminiApiKey || process.env.GEMINI_API_KEY || '';

    if (name === 'gemini') {
      return new GeminiProvider({
        apiKey,
        model: this.settings.geminiModel
      });
    }

    if (name === 'ollama') {
      return new OllamaProvider({
        endpoint: this.settings.ollamaEndpoint,
        model: this.settings.ollamaModel
      });
    }

    return this.localBrain;
  }

  async testConnection(providerName) {
    const provider = this.getProvider(providerName);
    return await provider.testConnection();
  }

  /**
   * Main Edit Brain Execution Pipeline:
   * User Command
   *   ↓
   * Video Analysis Tools (Metadata, Silences, Scenes, Sampled Frames)
   *   ↓
   * Real AI Model (Gemini / Ollama / Local Video Brain)
   *   ↓
   * Structured Edit Plan
   */
  async planEdit({ prompt, filePath, activeClip, projectContext }) {
    if (!prompt || !prompt.trim()) {
      throw new Error('A prompt or command is required.');
    }

    // 1. Run Real Video Analysis Tools if file is provided
    let videoAnalysis = null;
    if (filePath && fs.existsSync(filePath)) {
      try {
        videoAnalysis = await analyzeVideo(filePath, this.storageDir);
      } catch (err) {
        console.warn('Video analysis warning:', err.message);
      }
    }

    // Fallback minimal context if no active file
    if (!videoAnalysis) {
      videoAnalysis = {
        metadata: {
          duration: activeClip?.duration || projectContext?.totalDuration || 12,
          width: 1920,
          height: 1080,
          fps: 30,
          hasAudio: true
        },
        audio: { hasAudio: true, silences: [], meanVolume: '-20 dB' },
        scenes: { detectedCuts: [] },
        sampledFrames: []
      };
    }

    // 2. Select AI Provider
    let provider = this.getProvider();
    let usedProviderName = provider.name;
    let fallbackTriggered = false;
    let plan = null;

    try {
      if (provider.name === 'gemini' && !provider.isAvailable()) {
        console.log('Gemini API key missing, falling back to Local Video Brain.');
        provider = this.localBrain;
        usedProviderName = 'local-brain';
        fallbackTriggered = true;
      }

      plan = await provider.generateEditPlan({
        prompt,
        videoAnalysis,
        projectContext,
        activeClip
      });
    } catch (err) {
      console.warn(`Primary provider ${usedProviderName} error (${err.message}). Falling back to Local Video Brain.`);
      provider = this.localBrain;
      usedProviderName = 'local-brain';
      fallbackTriggered = true;
      plan = await provider.generateEditPlan({
        prompt,
        videoAnalysis,
        projectContext,
        activeClip
      });
    }

    // Clean videoAnalysis for JSON response (omit massive base64 strings)
    const clientAnalysisSummary = {
      duration: videoAnalysis.metadata.duration,
      resolution: `${videoAnalysis.metadata.width}x${videoAnalysis.metadata.height}`,
      hasAudio: videoAnalysis.metadata.hasAudio,
      silenceCount: videoAnalysis.audio?.silences?.length || 0,
      detectedScenes: videoAnalysis.scenes?.detectedCuts?.length || 0,
      sampledFrameCount: videoAnalysis.sampledFrames?.length || 0,
      sampledThumbnails: (videoAnalysis.sampledFrames || []).map(f => f.localUrl)
    };

    return {
      success: true,
      providerUsed: usedProviderName,
      fallbackTriggered,
      plan,
      videoAnalysis: clientAnalysisSummary
    };
  }
}
