import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Cpu, 
  Key, 
  ExternalLink,
  Loader2,
  Volume2,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { fetchAiSettings, saveAiSettings, testAiProvider } from '../utils/api';

export default function AiSettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [provider, setProvider] = useState('local-brain');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3:latest');
  const [localAiEnabled, setLocalAiEnabled] = useState(true);
  const [whisperEnabled, setWhisperEnabled] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      fetchAiSettings().then(data => {
        if (data) {
          setProvider(data.provider || 'local-brain');
          setGeminiModel(data.geminiModel || 'gemini-1.5-flash');
          setOllamaEndpoint(data.ollamaEndpoint || 'http://localhost:11434');
          setOllamaModel(data.ollamaModel || 'llama3:latest');
          setLocalAiEnabled(data.localAiEnabled ?? true);
          setWhisperEnabled(data.whisperEnabled ?? false);
          setHasGeminiKey(data.hasGeminiKey ?? false);
          setMaskedKey(data.maskedKey || '');
        }
      }).catch(err => console.warn('Could not load AI settings:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // First save if user typed a new key
      if (geminiApiKey) {
        await saveAiSettings({ geminiApiKey });
      }
      const res = await testAiProvider(provider);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        provider,
        geminiModel,
        ollamaEndpoint,
        ollamaModel,
        localAiEnabled,
        whisperEnabled
      };
      if (geminiApiKey) {
        payload.geminiApiKey = geminiApiKey;
      }
      const updated = await saveAiSettings(payload);
      if (onSettingsUpdated) {
        onSettingsUpdated(updated.settings);
      }
      onClose();
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ai-settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="ai-settings-avatar">
              <Sparkles size={16} />
            </div>
            <span>AI Brain & Provider Settings</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Provider Selection */}
          <div className="settings-field-group">
            <label className="settings-label">Active AI Editing Provider</label>
            <div className="provider-grid">
              <div 
                className={`provider-card ${provider === 'local-brain' ? 'selected' : ''}`}
                onClick={() => setProvider('local-brain')}
              >
                <div className="provider-card-header">
                  <Cpu size={16} className="provider-icon" />
                  <span className="provider-name">Local Video Brain</span>
                </div>
                <div className="provider-desc">
                  100% Free & Offline. Analyzes real FFmpeg silences, scenes & loudness. Zero API keys required.
                </div>
                <div className="provider-badge free">Free • Offline</div>
              </div>

              <div 
                className={`provider-card ${provider === 'gemini' ? 'selected' : ''}`}
                onClick={() => setProvider('gemini')}
              >
                <div className="provider-card-header">
                  <Sparkles size={16} className="provider-icon gemini-accent" />
                  <span className="provider-name">Google Gemini</span>
                </div>
                <div className="provider-desc">
                  Multimodal LLM. Inspects sampled video frames + audio to create professional director plans.
                </div>
                <div className="provider-badge gemini">Free Tier API Key</div>
              </div>

              <div 
                className={`provider-card ${provider === 'ollama' ? 'selected' : ''}`}
                onClick={() => setProvider('ollama')}
              >
                <div className="provider-card-header">
                  <Cpu size={16} className="provider-icon ollama-accent" />
                  <span className="provider-name">Ollama (Local LLM)</span>
                </div>
                <div className="provider-desc">
                  Self-hosted LLMs running on your local machine (e.g. Llama 3, Qwen 2.5).
                </div>
                <div className="provider-badge ollama">Local LLM</div>
              </div>
            </div>
          </div>

          {/* Gemini Settings */}
          {provider === 'gemini' && (
            <div className="provider-details-card">
              <div className="details-heading">
                <Key size={14} />
                <span>Gemini API Configuration (Stored Securely on Backend)</span>
              </div>

              <div className="settings-input-row">
                <label className="input-sublabel">Gemini API Key</label>
                <div className="key-input-wrapper">
                  <input 
                    type="password"
                    className="settings-text-input"
                    placeholder={hasGeminiKey ? `Configured: ${maskedKey}` : "Paste your Gemini API key (AIzaSy...)"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  {hasGeminiKey && !geminiApiKey && (
                    <span className="key-active-badge">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  )}
                </div>
                <div className="input-help-text">
                  You can get a free API key from{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="link-highlight"
                  >
                    Google AI Studio <ExternalLink size={10} style={{ display: 'inline' }} />
                  </a>
                  {' '}or set <code>GEMINI_API_KEY</code> in <code>.env</code>.
                </div>
              </div>

              <div className="settings-input-row">
                <label className="input-sublabel">Model</label>
                <select 
                  className="settings-select"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast, Free Tier, Multimodal)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen, High Speed)</option>
                </select>
              </div>
            </div>
          )}

          {/* Ollama Settings */}
          {provider === 'ollama' && (
            <div className="provider-details-card">
              <div className="details-heading">
                <Cpu size={14} />
                <span>Ollama Local Server Configuration</span>
              </div>

              <div className="settings-input-row">
                <label className="input-sublabel">Ollama Host URL</label>
                <input 
                  type="text"
                  className="settings-text-input"
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className="settings-input-row">
                <label className="input-sublabel">Model Name</label>
                <input 
                  type="text"
                  className="settings-text-input"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3:latest"
                />
              </div>
            </div>
          )}

          {/* Features Toggles */}
          <div className="features-toggle-group">
            <label className="toggle-item">
              <input 
                type="checkbox"
                checked={whisperEnabled}
                onChange={(e) => setWhisperEnabled(e.target.checked)}
                className="ai-styled-checkbox"
              />
              <div className="toggle-text">
                <span className="toggle-title">Whisper Speech-to-Text</span>
                <span className="toggle-sub">Detect spoken dialogue using local Whisper engine if available.</span>
              </div>
            </label>

            <label className="toggle-item">
              <input 
                type="checkbox"
                checked={localAiEnabled}
                onChange={(e) => setLocalAiEnabled(e.target.checked)}
                className="ai-styled-checkbox"
              />
              <div className="toggle-text">
                <span className="toggle-title">Video Analysis Tools</span>
                <span className="toggle-sub">Extract silence intervals, loudness, scene changes and sample frames.</span>
              </div>
            </label>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`test-status-banner ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            type="button"
            className="btn btn-ghost"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 size={14} className="ai-spin-icon" /> : <Sparkles size={14} />}
            <span>Test Connection</span>
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="ai-spin-icon" /> : <Check size={14} />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
