import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User,
  CheckCircle2, 
  Undo2, 
  X, 
  ArrowRight, 
  Check, 
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
  Loader2
} from 'lucide-react';

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
      { text: 'Remove the boring parts', label: 'Smart jump-cut', icon: Wand2, badge: 'auto-cut' },
      { text: 'Split at playhead', label: 'Split at playhead', icon: Scissors, badge: 'razor' }
    ],
    color: [
      { text: 'Make it brighter', label: 'Increase brightness', icon: Palette, badge: '+15% light' },
      { text: 'Boost vibrant saturation', label: 'Vibrant pop', icon: Palette, badge: 'saturated' },
      { text: 'Make it black and white', label: 'Black & white', icon: Palette, badge: 'monochrome' },
      { text: 'Vintage sepia look', label: 'Vintage sepia', icon: Palette, badge: 'retro' }
    ],
    speed_audio: [
      { text: 'Increase speed to 1.25x', label: 'Speed 1.25x', icon: Wand2, badge: 'faster' },
      { text: 'Slow down to 0.5x', label: 'Slow-motion 0.5x', icon: Wand2, badge: 'slow-mo' },
      { text: 'Remove original audio', label: 'Mute video audio', icon: Volume2, badge: 'mute' },
      { text: 'Add this song', label: 'Add background music', icon: Volume2, badge: 'soundtrack' }
    ],
    reels: [
      { text: 'Make a clean short reel from this video', label: 'Create 10s Social Reel', icon: Video, badge: 'viral reel' },
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
              <span>Local Engine • Instant Processing</span>
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
            <div className="ai-empty-title">AI Video Assistant Ready</div>
            <div className="ai-empty-subtitle">
              Click any quick action pill above or type a natural instruction below (e.g., "Make a clean short reel", "Trim first 5s", "Make it brighter").
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
                <div className="ai-user-text">"{item.prompt}"</div>
                <div className="ai-time-stamp">{item.timestamp}</div>
              </div>
            </div>

            {/* AI Execution Card */}
            <div className="ai-result-block">
              <div className="ai-result-top">
                <div className="ai-action-chip">
                  <CheckCircle2 size={13} className={item.undone ? 'muted' : 'emerald'} />
                  <span>{item.friendlyTitle || ACTION_LABELS[item.actionType] || 'Timeline Updated'}</span>
                </div>

                {!item.undone ? (
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
                )}
              </div>

              <div className="ai-result-desc">
                {item.undone 
                  ? 'This edit was successfully rolled back.' 
                  : (item.description || item.error || 'Timeline updated successfully.')}
              </div>

              {/* Before/After diff summary if available */}
              {!item.undone && item.plannedChanges && item.plannedChanges.length > 0 && (
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
            <span>Analyzing prompt & planning timeline edit...</span>
          </div>
        )}

        {/* 5. Interactive Proposed Action Card (Appears at bottom of stream) */}
        {plannedAction && (
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="ai-proposal-tag">
                <Wand2 size={14} />
                <span>Ready to Apply: {ACTION_LABELS[plannedAction.action.type] || 'Timeline Edit'}</span>
              </div>
              <button 
                type="button"
                className="btn-icon-subtle" 
                onClick={onCancelPlannedAction}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            <div className="ai-proposal-prompt">
              "{plannedAction.prompt}"
            </div>

            <div className="ai-proposal-desc">
              {plannedAction.action.description}
            </div>

            {plannedAction.action.plannedChanges && (
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
                <span>Apply to Timeline</span>
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
          <span>Preview edits before applying</span>
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
          placeholder="Ask AI: e.g. Make a clean reel, brighten, cut 5s..."
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
