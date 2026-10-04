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
  Sliders,
  Maximize2,
  Minimize2
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
  ADD_SFX: 'Sound Effect (SFX)',
  DUPLICATE_CLIP: 'Duplicate Clip',
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
  activeClip,
  isExpanded = false,
  onToggleExpand
}) {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const streamBottomRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'trim', label: 'Trim & Cut', icon: Scissors },
    { id: 'motion', label: 'Motion & FX', icon: Wand2 },
    { id: 'color', label: 'Color & Looks', icon: Palette },
    { id: 'speed_audio', label: 'Audio & SFX', icon: Volume2 },
    { id: 'reels', label: 'Social & Titles', icon: Video }
  ];

  const commandsByCategory = {
    trim: [
      { text: 'Remove the first 5 seconds', label: 'Trim first 5s', icon: Scissors, badge: '5s cut' },
      { text: 'Make this 30 seconds', label: 'Make 30s long', icon: Clock, badge: '30s duration' },
      { text: 'Remove boring parts and keep the best moments', label: 'Remove boring parts', icon: Wand2, badge: 'smart-cut' },
      { text: 'Split at playhead', label: 'Split at playhead', icon: Scissors, badge: 'razor' },
      { text: 'Duplicate this clip', label: 'Duplicate Clip (Ctrl+D)', icon: Copy, badge: 'duplicate' }
    ],
    motion: [
      { text: 'Add Ken Burns slow zoom in effect', label: 'Ken Burns Zoom In', icon: Wand2, badge: 'zoom' },
      { text: 'Add slow pan right motion', label: 'Slow Pan Right', icon: Wand2, badge: 'pan' },
      { text: 'Fade in from black and fade out at end', label: 'Fade In & Out', icon: Layers, badge: 'fade' },
      { text: 'Add pulse motion animation', label: 'Pulse Motion', icon: Wand2, badge: 'pulse' }
    ],
    color: [
      { text: 'Add cinematic vignette shadow around edges', label: 'Add Vignette', icon: Palette, badge: 'vignette' },
      { text: 'Apply warm golden hour sun glow', label: 'Golden Hour Look', icon: Palette, badge: 'warm' },
      { text: 'Give it a cyberpunk neon teal look', label: 'Cyberpunk Neon', icon: Palette, badge: 'cyberpunk' },
      { text: 'Add 35mm vintage film grain texture', label: '35mm Film Grain', icon: Palette, badge: 'film grain' },
      { text: 'Make this brighter', label: 'Make this brighter', icon: Palette, badge: '+15% light' },
      { text: 'Boost vibrant saturation', label: 'Vibrant pop', icon: Palette, badge: 'saturated' },
      { text: 'Make it black and white', label: 'Black & white', icon: Palette, badge: 'monochrome' }
    ],
    speed_audio: [
      { text: 'Add whoosh transition sound effect', label: 'Whoosh SFX', icon: Volume2, badge: 'sfx' },
      { text: 'Add cinematic boom impact sound', label: 'Cinematic Boom SFX', icon: Volume2, badge: 'sfx' },
      { text: 'Add camera shutter click sound', label: 'Camera Click SFX', icon: Volume2, badge: 'sfx' },
      { text: 'Increase speed to 1.25x', label: 'Speed 1.25x', icon: Wand2, badge: 'faster' },
      { text: 'Slow down to 0.5x', label: 'Slow-motion 0.5x', icon: Wand2, badge: 'slow-mo' },
      { text: 'Remove original audio', label: 'Mute video audio', icon: Volume2, badge: 'mute' }
    ],
    reels: [
      { text: 'Make a clean Instagram reel 9:16 from this video', label: 'Make 9:16 Reel', icon: Video, badge: '9:16 reel' },
      { text: 'Add animated title Epic Moment', label: 'Pop Title Overlay', icon: Layers, badge: 'title' },
      { text: 'Add captions and subtitles', label: 'Add Subtitles', icon: Layers, badge: 'subtitles' },
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

          {/* Toggle quick suggestion chips for extra chat space */}
          <button
            type="button"
            className={`ai-settings-btn ${showSuggestions ? 'active' : ''}`}
            onClick={() => setShowSuggestions(!showSuggestions)}
            title={showSuggestions ? "Hide quick suggestions (maximizes workspace)" : "Show quick suggestions"}
          >
            <Wand2 size={13} />
          </button>

          {/* Expand to wide view toggle */}
          {onToggleExpand && (
            <button 
              type="button"
              className={`ai-settings-btn ${isExpanded ? 'active' : ''}`}
              onClick={onToggleExpand}
              title={isExpanded ? "Collapse to standard width (390px)" : "Expand to wide studio view (520px)"}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
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

      {/* 2. Category Quick Filters & Action Pills (Collapsible) */}
      {showSuggestions && (
        <>
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
        </>
      )}

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

            {/* Visual Adjustments Strip (Aspect Ratio, Speed, Effects, Captions) */}
            {plannedAction.plan && (
              <div className="ai-plan-adjustments-strip">
                {Boolean(plannedAction.plan.aspectRatio) && (
                  <span className="adj-pill" style={{ background: 'rgba(236, 72, 153, 0.18)', borderColor: 'rgba(236, 72, 153, 0.5)', color: '#f472b6', fontWeight: 600 }}>
                    📱 Frame: {plannedAction.plan.aspectRatio} {plannedAction.plan.aspectRatio === '9:16' ? '(Vertical Reel)' : plannedAction.plan.aspectRatio === '1:1' ? '(Square)' : '(Landscape)'}
                  </span>
                )}
                {Boolean(plannedAction.plan.speed && plannedAction.plan.speed !== 1) && (
                  <span className="adj-pill">⚡ Speed: {plannedAction.plan.speed}x</span>
                )}
                {Boolean(plannedAction.plan.effects?.contrast && plannedAction.plan.effects.contrast !== 1) && (
                  <span className="adj-pill">🎨 Contrast: {plannedAction.plan.effects.contrast}x</span>
                )}
                {Boolean(plannedAction.plan.effects?.saturation && plannedAction.plan.effects.saturation !== 1) && (
                  <span className="adj-pill">✨ Saturation: {plannedAction.plan.effects.saturation}x</span>
                )}
                {Boolean(typeof plannedAction.plan.effects?.brightness === 'number' && plannedAction.plan.effects.brightness !== 0) && (
                  <span className="adj-pill">☀️ Brightness: {plannedAction.plan.effects.brightness > 0 ? '+' : ''}{plannedAction.plan.effects.brightness}</span>
                )}
                {Boolean(plannedAction.plan.captions) && (
                  <span className="adj-pill">📝 Captions Enabled</span>
                )}
                {Boolean(plannedAction.plan.textOverlay) && (
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
