import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  CheckCircle2, 
  Undo2, 
  X, 
  ArrowRight, 
  Terminal, 
  AlertCircle,
  Check,
  Film
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
  const [requireConfirmation, setRequireConfirmation] = useState(true);

  const sampleCommands = [
    'Remove the first 5 seconds',
    'Make it brighter',
    'Increase speed to 1.25x',
    'Remove original audio',
    'Add text Epic Moment',
    'Make this 30 seconds',
    'Remove the boring parts',
    'Add this song',
    'Add captions',
    'Make a clean short reel from this video'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    onAnalyzeCommand(prompt.trim(), requireConfirmation);
    setPrompt('');
  };

  const handleChipClick = (cmd) => {
    if (isProcessing) return;
    onAnalyzeCommand(cmd, requireConfirmation);
  };

  return (
    <div className="ai-panel">
      {/* Banner */}
      <div className="ai-header-banner">
        <div className="ai-banner-title">
          <Sparkles size={16} />
          <span>Timeline AI Controller</span>
        </div>
        <div className="ai-banner-desc">
          Type natural language commands to directly mutate the timeline and control FFmpeg.
        </div>
        {activeClip && (
          <div style={{ fontSize: '10px', color: '#a5b4fc', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Film size={11} />
            <span>Target: <strong>{activeClip.name}</strong></span>
          </div>
        )}
      </div>

      {/* 3. SHOW THE PLANNED ACTION BEFORE EXECUTING IT */}
      {plannedAction && (
        <div className="ai-planned-card">
          <div className="ai-planned-header">
            <div className="ai-planned-title">
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <span>Planned Edit: {plannedAction.action.type}</span>
            </div>
            <button className="btn-icon" onClick={onCancelPlannedAction} title="Dismiss">
              <X size={14} />
            </button>
          </div>

          <div className="ai-planned-prompt">
            "{plannedAction.prompt}"
          </div>

          <div className="ai-planned-desc">
            {plannedAction.action.description}
          </div>

          {plannedAction.action.plannedChanges && (
            <div className="ai-changes-table">
              {plannedAction.action.plannedChanges.map((change, idx) => (
                <div key={idx} className="ai-change-row">
                  <span className="ai-change-label">{change.label}</span>
                  <div className="ai-change-values">
                    <span className="ai-change-from">{change.from}</span>
                    <ArrowRight size={10} style={{ color: 'var(--text-dim)' }} />
                    <span className="ai-change-to">{change.to}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ai-planned-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => onApplyAction(plannedAction)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Check size={14} />
              <span>Apply Edit to Timeline</span>
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={onCancelPlannedAction}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div>
        <div className="ai-chips-title" style={{ marginBottom: '8px' }}>
          Suggested Natural Language Edits
        </div>
        <div className="ai-chips-container">
          {sampleCommands.map((cmd, i) => (
            <button 
              key={i} 
              className="ai-chip" 
              onClick={() => handleChipClick(cmd)}
              disabled={isProcessing}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Execution History & Undo Support */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="ai-chips-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Executed Actions & History</span>
          <Terminal size={12} />
        </div>

        <div className="ai-history-list">
          {commandHistory.map((item, idx) => (
            <div key={idx} className="ai-history-item">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="ai-history-prompt">
                  <Bot size={13} style={{ color: 'var(--primary)' }} />
                  <span>"{item.prompt}"</span>
                </div>
                {/* 4. ALLOW THE USER TO UNDO THE AI EDIT */}
                {!item.undone && (
                  <button 
                    className="btn-undo-ai"
                    onClick={() => onUndoLastEdit(idx)}
                    title="Undo this AI edit from timeline"
                  >
                    <Undo2 size={12} />
                    <span>Undo</span>
                  </button>
                )}
              </div>

              {item.actionType && (
                <div>
                  <span className="ai-history-badge">MUTATED: {item.actionType}</span>
                </div>
              )}

              <div className="ai-history-result" style={{ color: item.undone ? 'var(--text-dim)' : 'var(--accent-emerald)' }}>
                {item.undone ? '⤺ Reverted by user' : (item.description || 'Timeline updated successfully.')}
              </div>
            </div>
          ))}

          {commandHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '11px' }}>
              No AI edits executed yet. Click a suggestion or type a command!
            </div>
          )}
        </div>
      </div>

      {/* Plan Preview Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', padding: '0 4px' }}>
        <input 
          type="checkbox" 
          id="confirmToggle"
          checked={requireConfirmation} 
          onChange={(e) => setRequireConfirmation(e.target.checked)}
          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
        />
        <label htmlFor="confirmToggle" style={{ cursor: 'pointer' }}>
          Show planned action preview before applying
        </label>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="ai-input-form">
        <input 
          type="text" 
          className="ai-input" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          placeholder="e.g. Remove the first 5 seconds, make it brighter..."
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          className="ai-send-btn" 
          disabled={!prompt.trim() || isProcessing}
          title="Analyze and Apply AI Edit"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
