import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  User, 
  CheckCircle2, 
  Undo2, 
  X, 
  ArrowRight, 
  Check, 
  Copy,
  Film, 
  Scissors, 
  Palette, 
  Volume2, 
  Video, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Layers, 
  Wand2, 
  Loader2,
  Settings,
  Cpu,
  Eye,
  Sliders
} from 'lucide-react';

function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <button
      type="button"
      className={`ai-copy-btn ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : `Copy ${label}`}
    >
      {copied ? <Check size={11} className="copy-check-icon" /> : <Copy size={11} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

const ACTION_LABELS = {
  TRIM_START: 'Trim from Start',
  TRIM_END: 'Trim from End',
  SET_DURATION: 'Set Duration',
  SET_SPEED: 'Playback Speed',
  SET_EFFECT: 'Color & Look',
  CLEAR_EFFECTS: 'Reset Effects',
  MUTE_AUDIO: 'Mute Audio',
  SPLIT: 'Split Clip',
  SPLIT_AT_PLAYHEAD: 'Razor Split',
  ADD_TEXT: 'Text Title',
  ADD_AUDIO_TRACK: 'Soundtrack',
  REMOVE_BORING_PARTS: 'Smart Jump-Cut',
  CREATE_REEL: '10s Social Reel'
};

export default function AiAssistant({
  onAnalyzeCommand,
  onApplyAction,
  plannedAction,
  onCancelPlannedAction,
  onUndoLastEdit,
  onClearHistory,
  onOpenSettings,
  activeProvider = 'local-brain',
  commandHistory = [],
  isProcessing = false,
  activeClip
}) {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const streamBottomRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'trim', label: 'Trim & Cut', icon: Scissors },
    { id: 'color', label: 'Color & Look', icon: Palette },
    { id: 'speed_audio', label: 'Speed & Audio', icon: Volume2 },
    { id: 'reels', label: 'Social Reels', icon: Video }
  ];

  const commandsByCategory = {
    trim: [
      { text: 'Remove the first 5 seconds', label: 'Trim first 5s', icon: Scissors, badge: '5s cut' },
      { text: 'Make this 30 seconds', label: 'Make 30s long', icon: Clock, badge: '30s duration' },
      { text: 'Remove boring parts and keep the best moments', label: 'Remove boring parts', icon: Wand2, badge: 'smart-cut' },
      { text: 'Split at playhead', label: 'Split at playhead', icon: Scissors, badge: 'razor' }
    ],
    color: [
      { text: 'Make this brighter', label: 'Make this brighter', icon: Palette, badge: '+15% light' },
      { text: 'Boost vibrant saturation', label: 'Vibrant pop', icon: Palette, badge: 'saturated' },
      { text: 'Add captions and make it slightly cinematic', label: 'Make cinematic', icon: Palette, badge: 'cinematic' },
      { text: 'Make it black and white', label: 'Black & white', icon: Palette, badge: 'monochrome' }
    ],
    speed_audio: [
      { text: 'Increase speed to 1.25x', label: 'Speed 1.25x', icon: Wand2, badge: 'faster' },
      { text: 'Slow down to 0.5x', label: 'Slow-motion 0.5x', icon: Wand2, badge: 'slow-mo' },
      { text: 'Remove original audio', label: 'Mute video audio', icon: Volume2, badge: 'mute' },
      { text: 'Add this song', label: 'Add background music', icon: Volume2, badge: 'soundtrack' }
    ],
    reels: [
      { text: 'Make a clean Instagram reel from this video', label: 'Make Instagram Reel', icon: Video, badge: 'reel' },
      { text: 'Add text Epic Moment', label: 'Add title overlay', icon: Layers, badge: 'title' },
      { text: 'Add captions', label: 'Add subtitles', icon: Layers, badge: 'subtitles' },
      { text: 'Mirror video horizontally', label: 'Mirror / Flip', icon: Video, badge: 'flip' }
    ]
  };

  const getFilteredCommands = () => {
    if (selectedCategory === 'all') {
      return Object.values(commandsByCategory).flat();
    }
    return commandsByCategory[selectedCategory] || [];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    onAnalyzeCommand(prompt.trim(), requireConfirmation);
    setPrompt('');
  };

  const handleChipClick = (cmdText) => {
    if (isProcessing) return;
    onAnalyzeCommand(cmdText, requireConfirmation);
  };

  // Scroll to bottom of chat when history or planned action updates
  useEffect(() => {
    if (streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory.length, plannedAction, isProcessing]);

  return (
    <div className="ai-assistant-wrapper">
      {/* 1. Sleek AI Studio Header */}
      <div className="ai-console-header">
        <div className="ai-console-brand">
          <div className="ai-glow-avatar">
            <Sparkles size={16} className="ai-sparkle-icon" />
          </div>
          <div className="ai-console-meta">
            <div className="ai-console-title">AI Video Copilot</div>
            <div className="ai-engine-status">
              <span className="ai-live-pulse" />
              <span>
                {activeProvider === 'gemini' 
                  ? 'Gemini Multimodal Brain' 
                  : (activeProvider === 'ollama' ? 'Ollama Local LLM' : 'Intelligent Local Video Brain')}
              </span>
            </div>
          </div>
        </div>

        <div className="ai-header-actions">
          {activeClip && (
            <div className="ai-target-pill" title={`Target: ${activeClip.name}`}>
              <Film size={11} />
              <span className="ai-target-name">{activeClip.name}</span>
            </div>
          )}
          {onOpenSettings && (
            <button 
              type="button"
              className="ai-settings-btn"
              onClick={onOpenSettings}
              title="AI Brain & Provider Settings"
            >
              <Settings size={13} />
            </button>
          )}
          {commandHistory.length > 0 && onClearHistory && (
            <button 
              type="button"
              className="ai-clear-history-btn" 
              onClick={onClearHistory}
              title="Clear chat history"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Quick Filters */}
      <div className="ai-category-strip">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button 
              key={cat.id}
              type="button"
              className={`ai-cat-pill ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Icon size={12} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Action Pills Cloud */}
      <div className="ai-chips-carousel">
        {getFilteredCommands().map((cmd, i) => {
          const Icon = cmd.icon || Sparkles;
          return (
            <button 
              key={i} 
              type="button"
              className="ai-modern-chip"
              onClick={() => handleChipClick(cmd.text)}
              disabled={isProcessing}
              title={`Click to execute: "${cmd.text}"`}
            >
              <Icon size={12} className="ai-chip-icon" />
              <span className="ai-chip-text">{cmd.label || cmd.text}</span>
              <span className="ai-chip-badge">{cmd.badge}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Natural Chronological Chat Stream */}
      <div className="ai-chat-stream">
        {commandHistory.length === 0 && !plannedAction && !isProcessing && (
          <div className="ai-empty-chat">
            <div className="ai-empty-illustration">
              <Sparkles size={28} />
            </div>
            <div className="ai-empty-title">AI Video Editing Brain Ready</div>
            <div className="ai-empty-subtitle">
              Ask natural requests like "Make a clean Instagram reel", "Remove boring parts and keep the best moments", or "Make it slightly cinematic".
            </div>
          </div>
        )}

        {/* History Messages */}
        {commandHistory.map((item, idx) => (
          <div key={item.id || idx} className={`ai-message-card ${item.undone ? 'undone' : ''}`}>
            {/* User Speech Card */}
            <div className="ai-user-bubble">
              <div className="ai-user-avatar">
                <User size={12} />
              </div>
              <div className="ai-user-content">
                <div className="ai-user-header">
                  <div className="ai-time-stamp">{item.timestamp}</div>
                  <CopyButton text={item.prompt} label="prompt" />
                </div>
                <div className="ai-user-text">"{item.prompt}"</div>
              </div>
            </div>

            {/* AI Execution Card */}
            <div className={`ai-result-block ${item.isConversational ? 'conversational' : ''}`}>
              <div className="ai-result-top">
                <div className="ai-action-chip">
                  {item.isConversational ? (
                    <Sparkles size={13} style={{ color: '#818cf8' }} />
                  ) : (
                    <CheckCircle2 size={13} className={item.undone ? 'muted' : 'emerald'} />
                  )}
                  <span>{item.friendlyTitle || ACTION_LABELS[item.actionType] || 'AI Edit Applied'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CopyButton 
                    text={item.description || item.error || item.friendlyTitle || 'AI Edit'} 
                    label="response" 
                  />
                  {!item.isConversational && (!item.undone ? (
                    <button 
                      type="button"
                      className="ai-undo-trigger"
                      onClick={() => onUndoLastEdit(idx)}
                      title="Undo this specific edit"
                    >
                      <RotateCcw size={11} />
                      <span>Undo Edit</span>
                    </button>
                  ) : (
                    <span className="ai-undone-flag">⤺ Reverted</span>
                  ))}
                </div>
              </div>

              <div className="ai-result-desc" style={{ whiteSpace: 'pre-line' }}>
                {item.undone 
                  ? 'This edit was successfully rolled back.' 
                  : (item.description || item.error || 'Timeline updated successfully.')}
              </div>

              {item.isConversational && (
                <div className="ai-conversational-suggestions">
                  <button type="button" className="ai-suggest-chip" onClick={() => handleChipClick('Make a clean Instagram reel from this video')}>
                    ✨ Make Instagram Reel
                  </button>
                  <button type="button" className="ai-suggest-chip" onClick={() => handleChipClick('Remove boring parts and keep best moments')}>
                    ✂️ Remove boring parts
                  </button>
                  <button type="button" className="ai-suggest-chip" onClick={() => handleChipClick('Make it brighter and slightly cinematic')}>
                    🎨 Make cinematic
                  </button>
                </div>
              )}

              {/* Before/After diff summary if available */}
              {!item.undone && !item.isConversational && item.plannedChanges && item.plannedChanges.length > 0 && (
                <div className="ai-inline-diff-tags">
                  {item.plannedChanges.map((ch, i) => (
                    <span key={i} className="ai-diff-tag">
                      {ch.label}: <span className="diff-old">{ch.from}</span> → <span className="diff-new">{ch.to}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner Indicator */}
        {isProcessing && (
          <div className="ai-processing-card">
            <Loader2 size={16} className="ai-spin-icon" />
            <div className="processing-text-col">
              <span className="processing-title">Analyzing Video & Planning Edit...</span>
              <span className="processing-sub">Inspecting duration, loudness, silences, scenes & representative frames</span>
            </div>
          </div>
        )}

        {/* 5. Rich Interactive Edit Plan Card (Appears at bottom of stream) */}
        {plannedAction && (
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="ai-proposal-tag">
                <Wand2 size={14} />
                <span>
                  {plannedAction.plan?.summary 
                    ? `AI Edit Plan (${plannedAction.providerUsed || 'AI Brain'})`
                    : `Ready to Apply: ${ACTION_LABELS[plannedAction.action?.type] || 'Timeline Edit'}`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CopyButton 
                  text={`Prompt: "${plannedAction.prompt}"\n${plannedAction.plan?.summary ? 'Summary: ' + plannedAction.plan.summary + '\n' : ''}${plannedAction.plan?.reasoning ? 'Reasoning: ' + plannedAction.plan.reasoning : ''}`} 
                  label="plan" 
                />
                <button 
                  type="button"
                  className="btn-icon-subtle" 
                  onClick={onCancelPlannedAction}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="ai-proposal-prompt">
              "{plannedAction.prompt}"
            </div>

            {/* AI Reasoning Block */}
            {plannedAction.plan?.reasoning && (
              <div className="ai-plan-reasoning-box">
                <span className="reasoning-label">AI Reasoning & Analysis:</span>
                <span className="reasoning-content">{plannedAction.plan.reasoning}</span>
              </div>
            )}

            {/* Video Analysis Metrics Tag Strip */}
            {plannedAction.videoAnalysis && (
              <div className="ai-analysis-tag-strip">
                <span className="analysis-tag">⏱️ {plannedAction.videoAnalysis.duration}s clip</span>
                <span className="analysis-tag">📐 {plannedAction.videoAnalysis.resolution}</span>
                <span className="analysis-tag">
                  {plannedAction.videoAnalysis.silenceCount > 0 
                    ? `🔇 ${plannedAction.videoAnalysis.silenceCount} silences` 
                    : '🔊 Audio steady'}
                </span>
                {plannedAction.videoAnalysis.sampledFrameCount > 0 && (
                  <span className="analysis-tag">🖼️ {plannedAction.videoAnalysis.sampledFrameCount} frames inspected</span>
                )}
              </div>
            )}

            {/* Sampled Thumbnails Preview Strip (Visual Proof) */}
            {plannedAction.videoAnalysis?.sampledThumbnails && plannedAction.videoAnalysis.sampledThumbnails.length > 0 && (
              <div className="ai-sampled-thumbnails-row">
                <div className="thumbnails-label">Inspected Video Moments:</div>
                <div className="thumbnails-grid">
                  {plannedAction.videoAnalysis.sampledThumbnails.map((thumbUrl, idx) => (
                    <img 
                      key={idx} 
                      src={thumbUrl} 
                      alt={`Sample frame ${idx + 1}`} 
                      className="ai-sample-thumb" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Keep Segments Breakdown */}
            {plannedAction.plan?.keep && plannedAction.plan.keep.length > 0 && (
              <div className="ai-plan-segments-box">
                <div className="segments-heading keep">
                  <Check size={12} />
                  <span>Kept Timeline Segments:</span>
                </div>
                {plannedAction.plan.keep.map((k, i) => (
                  <div key={i} className="segment-row keep">
                    <span className="segment-time">{k.start.toFixed(1)}s → {k.end.toFixed(1)}s</span>
                    <span className="segment-reason">{k.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Removed Segments Breakdown */}
            {plannedAction.plan?.remove && plannedAction.plan.remove.length > 0 && (
              <div className="ai-plan-segments-box remove">
                <div className="segments-heading remove">
                  <Scissors size={12} />
                  <span>Removed / Cut Segments:</span>
                </div>
                {plannedAction.plan.remove.map((r, i) => (
                  <div key={i} className="segment-row remove">
                    <span className="segment-time">{r.start.toFixed(1)}s → {r.end.toFixed(1)}s</span>
                    <span className="segment-reason">{r.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Visual Adjustments Strip (Speed, Effects, Captions) */}
            {plannedAction.plan && (
              <div className="ai-plan-adjustments-strip">
                {plannedAction.plan.speed && plannedAction.plan.speed !== 1 && (
                  <span className="adj-pill">⚡ Speed: {plannedAction.plan.speed}x</span>
                )}
                {plannedAction.plan.effects?.contrast && plannedAction.plan.effects.contrast !== 1 && (
                  <span className="adj-pill">🎨 Contrast: {plannedAction.plan.effects.contrast}x</span>
                )}
                {plannedAction.plan.effects?.saturation && plannedAction.plan.effects.saturation !== 1 && (
                  <span className="adj-pill">✨ Saturation: {plannedAction.plan.effects.saturation}x</span>
                )}
                {plannedAction.plan.effects?.brightness && plannedAction.plan.effects.brightness !== 0 && (
                  <span className="adj-pill">☀️ Brightness: {plannedAction.plan.effects.brightness > 0 ? '+' : ''}{plannedAction.plan.effects.brightness}</span>
                )}
                {plannedAction.plan.captions && (
                  <span className="adj-pill">📝 Captions Enabled</span>
                )}
                {plannedAction.plan.textOverlay && (
                  <span className="adj-pill">💬 Title: "{plannedAction.plan.textOverlay.text}"</span>
                )}
              </div>
            )}

            {/* Legacy Planned Changes Fallback */}
            {!plannedAction.plan && plannedAction.action?.plannedChanges && (
              <div className="ai-proposal-diff-box">
                <div className="ai-diff-heading">Summary of Proposed Edits:</div>
                {plannedAction.action.plannedChanges.map((change, idx) => (
                  <div key={idx} className="ai-diff-row">
                    <span className="ai-diff-label">{change.label}</span>
                    <div className="ai-diff-flow">
                      <span className="ai-diff-old">{change.from}</span>
                      <ArrowRight size={11} className="ai-diff-arrow" />
                      <span className="ai-diff-new">{change.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ai-proposal-buttons">
              <button 
                type="button"
                className="ai-btn-apply"
                onClick={() => onApplyAction(plannedAction)}
              >
                <Check size={14} />
                <span>Apply AI Edit to Timeline</span>
              </button>
              <button 
                type="button"
                className="ai-btn-cancel" 
                onClick={onCancelPlannedAction}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={streamBottomRef} />
      </div>

      {/* 6. Settings Bar (Confirmation toggle) */}
      <div className="ai-controls-footer-bar">
        <label className="ai-toggle-label" htmlFor="confirmCheck">
          <input 
            type="checkbox" 
            id="confirmCheck"
            checked={requireConfirmation} 
            onChange={(e) => setRequireConfirmation(e.target.checked)}
            className="ai-styled-checkbox"
          />
          <span>Review AI edit plan before applying</span>
        </label>
      </div>

      {/* 7. Floating Modern Prompt Input Console */}
      <form onSubmit={handleSubmit} className="ai-input-console">
        <div className="ai-input-sparkle">
          <Sparkles size={15} />
        </div>
        <input 
          type="text" 
          className="ai-console-input" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          placeholder="Ask AI: e.g. Make an Instagram reel, remove boring parts..."
          disabled={isProcessing}
        />
        {prompt.trim() && (
          <button 
            type="button" 
            className="ai-clear-btn"
            onClick={() => setPrompt('')}
          >
            <X size={14} />
          </button>
        )}
        <button 
          type="submit" 
          className="ai-submit-button" 
          disabled={!prompt.trim() || isProcessing}
          title="Execute AI Command (Enter ↵)"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
