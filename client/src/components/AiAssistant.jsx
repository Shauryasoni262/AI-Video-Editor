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
  Terminal, 
  Check, 
  Film,
  Zap,
  Sliders,
  Scissors,
  Palette,
  Volume2,
  Video,
  CornerDownLeft,
  RotateCcw
} from 'lucide-react';

export default function AiAssistant({
  onAnalyzeCommand,
  onApplyAction,
  plannedAction,
  onCancelPlannedAction,
  onUndoLastEdit,
  commandHistory = [],
  isProcessing,
  activeClip
}) {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const historyBottomRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'trim', label: 'Trim & Cut', icon: Scissors },
    { id: 'color', label: 'Color & Look', icon: Palette },
    { id: 'audio_speed', label: 'Audio & Speed', icon: Volume2 },
    { id: 'creative', label: 'Text & Reels', icon: Video }
  ];

  const commandsByCategory = {
    trim: [
      { text: 'Remove the first 5 seconds', badge: '5s cut' },
      { text: 'Make this 30 seconds', badge: '30s duration' },
      { text: 'Remove the boring parts', badge: 'jump-cut' },
      { text: 'Split at playhead', badge: 'razor' }
    ],
    color: [
      { text: 'Make it brighter', badge: '+15% light' },
      { text: 'Boost vibrant saturation', badge: 'punchy' },
      { text: 'Make it black and white', badge: 'B&W' },
      { text: 'Vintage sepia look', badge: 'retro' }
    ],
    audio_speed: [
      { text: 'Increase speed to 1.25x', badge: '1.25x' },
      { text: 'Slow down to 0.5x', badge: '0.5x' },
      { text: 'Remove original audio', badge: 'mute' },
      { text: 'Add this song', badge: 'soundtrack' }
    ],
    creative: [
      { text: 'Add text Epic Moment', badge: 'title' },
      { text: 'Add captions', badge: 'subtitles' },
      { text: 'Make a clean short reel from this video', badge: 'viral reel' },
      { text: 'Mirror video horizontally', badge: 'flip' }
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

  // Scroll to bottom of chat when history updates
  useEffect(() => {
    if (historyBottomRef.current) {
      historyBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory, plannedAction]);

  return (
    <div className="ai-assistant-wrapper">
      {/* 1. Sleek AI Engine Header Console */}
      <div className="ai-console-header">
        <div className="ai-console-brand">
          <div className="ai-glow-avatar">
            <Sparkles size={16} className="ai-sparkle-icon" />
          </div>
          <div className="ai-console-meta">
            <div className="ai-console-title">Timeline AI Copilot</div>
            <div className="ai-engine-status">
              <span className="ai-live-pulse" />
              <span>100% Local Engine • Zero Latency</span>
            </div>
          </div>
        </div>

        {/* Target context badge */}
        {activeClip && (
          <div className="ai-target-pill" title={`Target: ${activeClip.name}`}>
            <Film size={11} />
            <span className="ai-target-name">{activeClip.name}</span>
            <span className="ai-target-badge">{activeClip.speed || 1}x</span>
          </div>
        )}
      </div>

      {/* 2. Interactive Planned Action Card (If any pending confirmation) */}
      {plannedAction && (
        <div className="ai-proposal-card">
          <div className="ai-proposal-header">
            <div className="ai-proposal-tag">
              <Sparkles size={13} />
              <span>PROPOSED ACTION: {plannedAction.action.type}</span>
            </div>
            <button 
              className="btn-icon-subtle" 
              onClick={onCancelPlannedAction}
              title="Dismiss proposal"
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
              <div className="ai-diff-heading">Planned Timeline Mutations:</div>
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
              className="ai-btn-apply"
              onClick={() => onApplyAction(plannedAction)}
            >
              <Check size={14} />
              <span>Apply to Timeline</span>
            </button>
            <button 
              className="ai-btn-cancel" 
              onClick={onCancelPlannedAction}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Category Filter Tabs */}
      <div className="ai-category-strip">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button 
              key={cat.id}
              className={`ai-cat-pill ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Icon size={12} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Filtered Prompt Chips */}
      <div className="ai-chips-carousel">
        {getFilteredCommands().map((cmd, i) => (
          <button 
            key={i} 
            className="ai-modern-chip"
            onClick={() => handleChipClick(cmd.text)}
            disabled={isProcessing}
            title={cmd.text}
          >
            <span className="ai-chip-text">{cmd.text}</span>
            <span className="ai-chip-badge">{cmd.badge}</span>
          </button>
        ))}
      </div>

      {/* 5. Conversation History Stream */}
      <div className="ai-chat-stream">
        <div className="ai-stream-divider">
          <span>Execution History & Edits</span>
        </div>

        {commandHistory.map((item, idx) => (
          <div key={idx} className={`ai-message-card ${item.undone ? 'undone' : ''}`}>
            {/* User message header */}
            <div className="ai-msg-header">
              <div className="ai-user-bubble">
                <User size={11} />
                <span className="ai-user-text">"{item.prompt}"</span>
              </div>
              <span className="ai-time-stamp">{item.timestamp}</span>
            </div>

            {/* AI Action Result */}
            <div className="ai-result-block">
              <div className="ai-result-top">
                <div className="ai-action-chip">
                  <CheckCircle2 size={12} className={item.undone ? 'muted' : 'emerald'} />
                  <span>{item.actionType || 'MUTATION'}</span>
                </div>

                {!item.undone ? (
                  <button 
                    className="ai-undo-trigger"
                    onClick={() => onUndoLastEdit(idx)}
                    title="Undo this specific AI edit"
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
                  ? 'This modification was rolled back.' 
                  : (item.description || item.error || 'Timeline updated successfully.')}
              </div>
            </div>
          </div>
        ))}

        {commandHistory.length === 0 && !plannedAction && (
          <div className="ai-empty-chat">
            <div className="ai-empty-illustration">
              <Sparkles size={28} />
            </div>
            <div className="ai-empty-title">Ready for AI Directing</div>
            <div className="ai-empty-subtitle">
              Ask to trim seconds, adjust colors, increase speed, mute audio, or click any prompt pill above.
            </div>
          </div>
        )}

        <div ref={historyBottomRef} />
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
          <span>Review action proposal before applying</span>
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
          placeholder="Instruct AI: e.g. Make it brighter, remove first 5s..."
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
          title="Send to AI Assistant (Enter ↵)"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
