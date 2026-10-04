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
  Trash2,
  Clock,
  Image as ImageIcon,
  Move,
  Smartphone,
  Monitor,
  Square,
  ArrowLeftRight
} from 'lucide-react';

export default function Properties({
  selectedClip,
  selectedText,
  onUpdateClip,
  onUpdateText,
  onDeleteSelected,
  aspectRatio = '16:9',
  setAspectRatio,
  customFrame = { width: 16, height: 9 },
  setCustomFrame,
  saveSnapshot
}) {
  if (!selectedClip && !selectedText) {
    return (
      <div className="inspector-content">
        {/* Project Framing Settings */}
        <div className="property-group">
          <div className="property-group-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} style={{ color: 'var(--primary)' }} />
              <span>Project Framing</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="property-label">Aspect Ratio Preset</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button 
                type="button" 
                className={`filter-pill ${aspectRatio === '16:9' ? 'active' : ''}`}
                style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  if (saveSnapshot) saveSnapshot();
                  setAspectRatio && setAspectRatio('16:9');
                }}
              >
                <Monitor size={12} />
                <span>16:9 Wide</span>
              </button>
              <button 
                type="button" 
                className={`filter-pill ${aspectRatio === '9:16' ? 'active' : ''}`}
                style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  if (saveSnapshot) saveSnapshot();
                  setAspectRatio && setAspectRatio('9:16');
                }}
              >
                <Smartphone size={12} />
                <span>9:16 Reel</span>
              </button>
              <button 
                type="button" 
                className={`filter-pill ${aspectRatio === '1:1' ? 'active' : ''}`}
                style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  if (saveSnapshot) saveSnapshot();
                  setAspectRatio && setAspectRatio('1:1');
                }}
              >
                <Square size={12} />
                <span>1:1 Square</span>
              </button>
              <button 
                type="button" 
                className={`filter-pill ${aspectRatio === 'custom' ? 'active' : ''}`}
                style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  if (saveSnapshot) saveSnapshot();
                  setAspectRatio && setAspectRatio('custom');
                }}
              >
                <Sliders size={12} />
                <span>Custom</span>
              </button>
            </div>
          </div>

          {aspectRatio === 'custom' && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="property-label">Custom Ratio (W : H)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  min="0.5" 
                  max="100" 
                  step="0.5"
                  value={customFrame.width}
                  onChange={(e) => {
                    const w = Math.max(0.5, parseFloat(e.target.value) || 1);
                    setCustomFrame && setCustomFrame(prev => ({ ...prev, width: w }));
                  }}
                  className="project-title-input"
                  style={{ width: '60px', textAlign: 'center', background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>:</span>
                <input 
                  type="number" 
                  min="0.5" 
                  max="100" 
                  step="0.5"
                  value={customFrame.height}
                  onChange={(e) => {
                    const h = Math.max(0.5, parseFloat(e.target.value) || 1);
                    setCustomFrame && setCustomFrame(prev => ({ ...prev, height: h }));
                  }}
                  className="project-title-input"
                  style={{ width: '60px', textAlign: 'center', background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px' }}
                />
                <button 
                  type="button" 
                  className="btn-icon"
                  style={{ background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  onClick={() => setCustomFrame && setCustomFrame(prev => ({ width: prev.height, height: prev.width }))}
                  title="Flip Orientation"
                >
                  <ArrowLeftRight size={11} />
                  <span>Flip</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                  onClick={() => setCustomFrame && setCustomFrame({ width: 4, height: 5 })}
                >
                  4:5 Insta
                </button>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                  onClick={() => setCustomFrame && setCustomFrame({ width: 21, height: 9 })}
                >
                  21:9 Cinema
                </button>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                  onClick={() => setCustomFrame && setCustomFrame({ width: 4, height: 3 })}
                >
                  4:3 Retro
                </button>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                💡 You can also drag the resize handles directly on the video preview!
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
          Select a video clip or text overlay on the timeline to edit its specific properties.
        </div>
      </div>
    );
  }

  // If a text item is selected
  if (selectedText) {
    const isCustomPosition = selectedText.position === 'custom' || selectedText.x !== undefined || selectedText.y !== undefined;
    const posX = selectedText.x !== undefined ? selectedText.x : 50;
    const posY = selectedText.y !== undefined ? selectedText.y : (
      selectedText.position === 'top' ? 15 :
      selectedText.position === 'center' ? 50 : 85
    );

    return (
      <div className="inspector-content">
        <div className="property-group">
          <div className="property-group-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={14} style={{ color: 'var(--primary)' }} />
              <span>Text Overlay</span>
            </span>
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
            <span className="property-label">Position Mode</span>
            <select 
              style={{ background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
              value={selectedText.position || 'bottom'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'bottom') {
                  onUpdateText(selectedText.id, { position: 'bottom', x: 50, y: 85 });
                } else if (val === 'center') {
                  onUpdateText(selectedText.id, { position: 'center', x: 50, y: 50 });
                } else if (val === 'top') {
                  onUpdateText(selectedText.id, { position: 'top', x: 50, y: 15 });
                } else {
                  onUpdateText(selectedText.id, { position: 'custom', x: posX, y: posY });
                }
              }}
            >
              <option value="bottom">Bottom Subtitle</option>
              <option value="center">Center Screen</option>
              <option value="top">Top Banner</option>
              <option value="custom">Free Drag (Custom X/Y)</option>
            </select>
          </div>

          {/* If Custom or Dragged: Precision Coordinates Sliders */}
          {isCustomPosition && (
            <div style={{ background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Move size={12} style={{ color: 'var(--primary)' }} />
                  <span>Freeform Positioning</span>
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  X: {posX}% • Y: {posY}%
                </span>
              </div>

              <div className="property-row">
                <span className="property-label">Horizontal (X)</span>
                <input 
                  type="range" 
                  className="property-slider" 
                  min="5" 
                  max="95" 
                  value={posX} 
                  onChange={(e) => onUpdateText(selectedText.id, { x: parseInt(e.target.value, 10), position: 'custom' })}
                />
                <span className="property-value">{posX}%</span>
              </div>

              <div className="property-row">
                <span className="property-label">Vertical (Y)</span>
                <input 
                  type="range" 
                  className="property-slider" 
                  min="5" 
                  max="95" 
                  value={posY} 
                  onChange={(e) => onUpdateText(selectedText.id, { y: parseInt(e.target.value, 10), position: 'custom' })}
                />
                <span className="property-value">{posY}%</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', flex: 1, textAlign: 'center' }}
                  onClick={() => onUpdateText(selectedText.id, { x: 50, position: 'custom' })}
                >
                  Center X
                </button>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', flex: 1, textAlign: 'center' }}
                  onClick={() => onUpdateText(selectedText.id, { y: 50, position: 'custom' })}
                >
                  Center Y
                </button>
                <button 
                  type="button" 
                  className="filter-pill"
                  style={{ fontSize: '10px', flex: 1, textAlign: 'center' }}
                  onClick={() => onUpdateText(selectedText.id, { position: 'bottom', x: 50, y: 85 })}
                >
                  Reset
                </button>
              </div>

              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                💡 Click & drag this text directly anywhere in the preview window!
              </div>
            </div>
          )}

          <div className="property-row">
            <span className="property-label">Text Color</span>
            <input 
              type="color" 
              value={selectedText.color || '#ffffff'} 
              onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '28px', height: '28px' }}
            />
          </div>

          <div className="property-row">
            <span className="property-label">Animation</span>
            <select 
              style={{ background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)' }}
              value={selectedText.animation || 'none'}
              onChange={(e) => onUpdateText(selectedText.id, { animation: e.target.value })}
            >
              <option value="none">None (Static)</option>
              <option value="fade">Fade In</option>
              <option value="slide-up">Slide Up</option>
              <option value="pop">Pop & Bounce</option>
            </select>
          </div>

          <div className="property-row">
            <span className="property-label">Backdrop Pill</span>
            <input 
              type="checkbox" 
              checked={!!selectedText.background}
              onChange={(e) => onUpdateText(selectedText.id, { background: e.target.checked })}
              style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
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
        zoom: 1.0,
        animation: 'none',
        fadeIn: false,
        fadeOut: false,
        vignette: false,
        filmGrain: false,
        warm: false,
        cool: false,
        invert: false
      }
    });
  };

  const isImageClip = selectedClip.mediaType === 'image' || selectedClip.type === 'image' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(selectedClip.url || '');

  return (
    <div className="inspector-content">
      {/* 1. Image Duration OR Video Playback Speed */}
      {isImageClip ? (
        <div className="property-group">
          <div className="property-group-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ImageIcon size={14} style={{ color: '#ec4899' }} />
              <span>Photo Duration</span>
            </span>
            <Clock size={14} style={{ color: '#ec4899' }} />
          </div>
          <div className="property-row">
            <span className="property-label">Display Length</span>
            <input 
              type="range" 
              className="property-slider" 
              min="1.0" 
              max="30.0" 
              step="0.5"
              value={Math.round((selectedClip.trimEnd - selectedClip.trimStart) * 10) / 10}
              onChange={(e) => {
                const dur = parseFloat(e.target.value);
                onUpdateClip(selectedClip.id, {
                  trimEnd: selectedClip.trimStart + dur,
                  duration: Math.max(selectedClip.duration || 5, selectedClip.trimStart + dur)
                });
              }}
            />
            <span className="property-value">{(selectedClip.trimEnd - selectedClip.trimStart).toFixed(1)}s</span>
          </div>
        </div>
      ) : (
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
      )}

      {/* 2. Motion & Transitions */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Motion & Transitions</span>
          <Sparkles size={14} style={{ color: 'var(--primary-light)' }} />
        </div>

        <div className="property-row">
          <span className="property-label">Motion Animation</span>
          <select 
            style={{ background: 'var(--bg-panel-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)', maxWidth: '140px' }}
            value={effects.animation || 'none'}
            onChange={(e) => updateEffect('animation', e.target.value)}
          >
            <option value="none">None (Static)</option>
            <option value="kenBurns">Ken Burns (Zoom In)</option>
            <option value="zoomOut">Ken Burns (Zoom Out)</option>
            <option value="panRight">Slow Pan Right</option>
            <option value="pulse">Pulse Motion</option>
          </select>
        </div>

        <div className="property-row">
          <span className="property-label">Fade In Transition</span>
          <input 
            type="checkbox" 
            checked={!!effects.fadeIn}
            onChange={(e) => updateEffect('fadeIn', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Fade Out Transition</span>
          <input 
            type="checkbox" 
            checked={!!effects.fadeOut}
            onChange={(e) => updateEffect('fadeOut', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>
      </div>

      {/* 3. Audio Settings (Videos only) */}
      {!isImageClip && (
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
      )}

      {/* 4. Transform & Geometry */}
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

      {/* 5. Color Grading */}
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

      {/* 6. Stylized Cinema Looks */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Stylized Looks</span>
        </div>

        <div className="property-row">
          <span className="property-label">Vignette (Shadow Edge)</span>
          <input 
            type="checkbox" 
            checked={!!effects.vignette}
            onChange={(e) => updateEffect('vignette', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">35mm Film Grain</span>
          <input 
            type="checkbox" 
            checked={!!effects.filmGrain}
            onChange={(e) => updateEffect('filmGrain', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Warm Golden Hour</span>
          <input 
            type="checkbox" 
            checked={!!effects.warm}
            onChange={(e) => updateEffect('warm', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Cyberpunk Neon Teal</span>
          <input 
            type="checkbox" 
            checked={!!effects.cool}
            onChange={(e) => updateEffect('cool', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>

        <div className="property-row">
          <span className="property-label">Invert / Thermal</span>
          <input 
            type="checkbox" 
            checked={!!effects.invert}
            onChange={(e) => updateEffect('invert', e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>
      </div>

      {/* 7. Classic Filters */}
      <div className="property-group">
        <div className="property-group-title">
          <span>Classic Filters</span>
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
