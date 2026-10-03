import React from 'react';
import { 
  Sliders, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  Gauge, 
  Sparkles,
  Type,
  Trash2
} from 'lucide-react';

export default function Properties({
  selectedClip,
  selectedText,
  onUpdateClip,
  onUpdateText,
  onDeleteSelected
}) {
  if (!selectedClip && !selectedText) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
        Select a video clip or text item on the timeline to edit its properties and effects.
      </div>
    );
  }

  // If a text item is selected
  if (selectedText) {
    return (
      <div className="inspector-content">
        <div className="property-group">
          <div className="property-group-title">
            <span>Text Overlay</span>
            <button className="btn-icon" onClick={onDeleteSelected} title="Delete Text">
              <Trash2 size={14} style={{ color: 'var(--accent-rose)' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="property-label">Text Content</label>
            <input 
              type="text" 
              className="project-title-input" 
              style={{ width: '100%', background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)' }}
              value={selectedText.text || ''} 
              onChange={(e) => onUpdateText(selectedText.id, { text: e.target.value })}
            />
          </div>

          <div className="property-row">
            <span className="property-label">Font Size</span>
            <input 
              type="range" 
              className="property-slider" 
              min="16" 
              max="72" 
              value={selectedText.fontSize || 36} 
              onChange={(e) => onUpdateText(selectedText.id, { fontSize: parseInt(e.target.value, 10) })}
            />
            <span className="property-value">{selectedText.fontSize || 36}px</span>
          </div>

          <div className="property-row">
            <span className="property-label">Position</span>
            <select 
              style={{ background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
              value={selectedText.position || 'bottom'}
              onChange={(e) => onUpdateText(selectedText.id, { position: e.target.value })}
            >
              <option value="bottom">Bottom Subtitle</option>
              <option value="center">Center Screen</option>
              <option value="top">Top Banner</option>
            </select>
          </div>

          <div className="property-row">
            <span className="property-label">Text Color</span>
            <input 
              type="color" 
              value={selectedText.color || '#ffffff'} 
              onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '28px', height: '28px' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Selected Video Clip properties
  const effects = selectedClip.effects || {};

  const updateEffect = (key, value) => {
    onUpdateClip(selectedClip.id, {
      effects: {
        ...effects,
        [key]: value
      }
    });
  };

  const resetAllEffects = () => {
    onUpdateClip(selectedClip.id, {
      speed: 1.0,
      volume: 1.0,
      muteOriginalAudio: false,
      effects: {
        brightness: 0,
        contrast: 1,
        saturation: 1,
        blur: 0,
        sharpen: 0,
        grayscale: false,
        sepia: false,
        rotate: 0,
        flipH: false,
        flipV: false,
        zoom: 1.0
      }
    });
  };

  return (
    <div className="inspector-content">
      {/* 1. Playback Speed */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Speed Control</span>
          <Gauge size={14} />
        </div>
        <div className="property-row">
          <span className="property-label">Playback Rate</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0.5" 
            max="2.0" 
            step="0.25"
            value={selectedClip.speed || 1.0}
            onChange={(e) => onUpdateClip(selectedClip.id, { speed: parseFloat(e.target.value) })}
          />
          <span className="property-value">{selectedClip.speed || 1.0}x</span>
        </div>
      </div>

      {/* 2. Audio Settings */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Audio Controls</span>
          <Volume2 size={14} />
        </div>

        <div className="property-row">
          <span className="property-label">Mute Video Audio</span>
          <input 
            type="checkbox" 
            checked={!!selectedClip.muteOriginalAudio}
            onChange={(e) => onUpdateClip(selectedClip.id, { muteOriginalAudio: e.target.checked })}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Clip Volume</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0" 
            max="2" 
            step="0.05"
            disabled={selectedClip.muteOriginalAudio}
            value={selectedClip.volume !== undefined ? selectedClip.volume : 1.0}
            onChange={(e) => onUpdateClip(selectedClip.id, { volume: parseFloat(e.target.value) })}
          />
          <span className="property-value">{Math.round((selectedClip.volume !== undefined ? selectedClip.volume : 1) * 100)}%</span>
        </div>
      </div>

      {/* 3. Transform & Geometry */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Transform & Geometry</span>
        </div>

        <div className="property-row">
          <span className="property-label">Zoom Scale</span>
          <input 
            type="range" 
            className="property-slider" 
            min="1.0" 
            max="2.5" 
            step="0.05"
            value={effects.zoom || 1.0}
            onChange={(e) => updateEffect('zoom', parseFloat(e.target.value))}
          />
          <span className="property-value">{(effects.zoom || 1.0).toFixed(1)}x</span>
        </div>

        <div className="property-row" style={{ marginTop: '4px' }}>
          <span className="property-label">Rotate & Flip</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className={`btn-icon ${effects.rotate ? 'active' : ''}`}
              onClick={() => updateEffect('rotate', ((effects.rotate || 0) + 90) % 360)}
              title="Rotate 90 degrees"
            >
              <RotateCw size={14} />
            </button>
            <button 
              className={`btn-icon ${effects.flipH ? 'active' : ''}`}
              onClick={() => updateEffect('flipH', !effects.flipH)}
              title="Flip Horizontal (Mirror)"
            >
              <FlipHorizontal size={14} />
            </button>
            <button 
              className={`btn-icon ${effects.flipV ? 'active' : ''}`}
              onClick={() => updateEffect('flipV', !effects.flipV)}
              title="Flip Vertical"
            >
              <FlipVertical size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Color Grading */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Color & Exposure</span>
        </div>

        <div className="property-row">
          <span className="property-label">Brightness</span>
          <input 
            type="range" 
            className="property-slider" 
            min="-0.6" 
            max="0.6" 
            step="0.02"
            value={effects.brightness || 0}
            onChange={(e) => updateEffect('brightness', parseFloat(e.target.value))}
          />
          <span className="property-value">{effects.brightness > 0 ? `+${effects.brightness}` : (effects.brightness || 0)}</span>
        </div>

        <div className="property-row">
          <span className="property-label">Contrast</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0.5" 
            max="1.8" 
            step="0.05"
            value={effects.contrast !== undefined ? effects.contrast : 1}
            onChange={(e) => updateEffect('contrast', parseFloat(e.target.value))}
          />
          <span className="property-value">{effects.contrast !== undefined ? effects.contrast : 1}</span>
        </div>

        <div className="property-row">
          <span className="property-label">Saturation</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0" 
            max="2.0" 
            step="0.05"
            value={effects.saturation !== undefined ? effects.saturation : 1}
            onChange={(e) => updateEffect('saturation', parseFloat(e.target.value))}
          />
          <span className="property-value">{effects.saturation !== undefined ? effects.saturation : 1}</span>
        </div>
      </div>

      {/* 5. Filters & Look */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Filters & Focus</span>
        </div>

        <div className="property-row">
          <span className="property-label">Grayscale (B&W)</span>
          <input 
            type="checkbox" 
            checked={!!effects.grayscale}
            onChange={(e) => updateEffect('grayscale', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Sepia Vintage</span>
          <input 
            type="checkbox" 
            checked={!!effects.sepia}
            onChange={(e) => updateEffect('sepia', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Blur</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0" 
            max="15" 
            step="1"
            value={effects.blur || 0}
            onChange={(e) => updateEffect('blur', parseInt(e.target.value, 10))}
          />
          <span className="property-value">{effects.blur || 0}px</span>
        </div>

        <div className="property-row">
          <span className="property-label">Sharpen</span>
          <input 
            type="range" 
            className="property-slider" 
            min="0" 
            max="3" 
            step="0.25"
            value={effects.sharpen || 0}
            onChange={(e) => updateEffect('sharpen', parseFloat(e.target.value))}
          />
          <span className="property-value">{effects.sharpen || 0}</span>
        </div>
      </div>

      {/* Reset button */}
      <button 
        className="btn btn-ghost" 
        onClick={resetAllEffects}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Reset Clip Effects to Default
      </button>
    </div>
  );
}
