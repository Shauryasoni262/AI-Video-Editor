import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Film,
  Smartphone,
  Monitor,
  Square,
  Crop,
  Sliders,
  Move,
  ArrowLeftRight
} from 'lucide-react';
import { formatTimecode, formatDuration } from '../utils/timeUtils';

export default function Preview({
  videoClips,
  audioClips,
  textOverlays,
  currentTime,
  setCurrentTime,
  totalDuration,
  isPlaying,
  setIsPlaying,
  selectedClipId,
  setSelectedClipId,
  aspectRatio = '16:9',
  setAspectRatio,
  customFrame = { width: 16, height: 9 },
  setCustomFrame,
  onUpdateText,
  saveSnapshot
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const resizeDataRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' (fill vertical reel) or 'contain' (letterbox)

  // Interactive freeform dragging states
  const [draggingTextId, setDraggingTextId] = useState(null);
  const [resizingHandle, setResizingHandle] = useState(null); // 'se' | 'e' | 's'

  // Find the active video or image clip on the timeline for current time
  const activeClip = videoClips.find(c => {
    const clipDur = (c.trimEnd - c.trimStart) / (c.speed || 1);
    const start = c.timelineStart || 0;
    const end = start + clipDur;
    return currentTime >= start && currentTime < end;
  }) || (videoClips.length > 0 && currentTime === 0 ? videoClips[0] : null);

  const isImageClip = activeClip?.mediaType === 'image' || activeClip?.type === 'image' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(activeClip?.url || '');

  // Synchronize HTML5 video element with current timeline time
  useEffect(() => {
    if (!videoRef.current || !activeClip || isImageClip) return;

    const clipStart = activeClip.timelineStart || 0;
    const speed = activeClip.speed || 1;
    const offsetInClip = (currentTime - clipStart) * speed;
    const targetSourceTime = activeClip.trimStart + offsetInClip;

    // Only update if difference > 0.15s to prevent stutter during playback
    if (Math.abs(videoRef.current.currentTime - targetSourceTime) > 0.15) {
      videoRef.current.currentTime = Math.max(0, targetSourceTime);
    }
  }, [currentTime, activeClip, isImageClip]);

  // Handle play/pause sync
  useEffect(() => {
    if (!videoRef.current || isImageClip) return;
    if (isPlaying) {
      videoRef.current.playbackRate = activeClip?.speed || 1;
      videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, activeClip, isImageClip]);

  // Animation frame loop to increment timeline playhead smoothly when playing
  useEffect(() => {
    let animId;
    let lastTimestamp = performance.now();

    const loop = (now) => {
      if (isPlaying) {
        const delta = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= totalDuration) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return totalDuration;
            }
          }
          return next;
        });
      } else {
        lastTimestamp = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration, isLooping, setCurrentTime, setIsPlaying]);

  // Spacebar keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsPlaying]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => alert(err.message));
    } else {
      document.exitFullscreen();
    }
  };

  // Generate CSS filter string from clip effects
  const getFilterStyle = () => {
    if (!activeClip || !activeClip.effects) return {};
    const fx = activeClip.effects;

    const filters = [];
    if (fx.brightness) filters.push(`brightness(${1 + fx.brightness})`);
    if (fx.contrast && fx.contrast !== 1) filters.push(`contrast(${fx.contrast})`);
    if (fx.saturation && fx.saturation !== 1) filters.push(`saturate(${fx.saturation})`);
    if (fx.blur && fx.blur > 0) filters.push(`blur(${fx.blur}px)`);
    if (fx.grayscale) filters.push('grayscale(100%)');
    if (fx.sepia) filters.push('sepia(100%)');
    if (fx.warm) filters.push('sepia(25%) saturate(140%)');
    if (fx.cool || fx.cyberpunk) filters.push('hue-rotate(185deg) saturate(145%) contrast(120%)');
    if (fx.invert) filters.push('invert(100%)');
    if (fx.sharpen) filters.push('contrast(120%)');

    const transforms = [];
    if (fx.rotate) transforms.push(`rotate(${fx.rotate}deg)`);
    if (fx.flipH) transforms.push('scaleX(-1)');
    if (fx.flipV) transforms.push('scaleY(-1)');
    if (fx.zoom && fx.zoom > 1) transforms.push(`scale(${fx.zoom})`);

    // Animation styles
    let animation = undefined;
    if (fx.animation === 'kenBurns' || fx.animation === 'zoomIn') {
      animation = 'kenBurnsZoom 8s ease-in-out infinite alternate';
    } else if (fx.animation === 'zoomOut') {
      animation = 'kenBurnsZoomOut 8s ease-in-out infinite alternate';
    } else if (fx.animation === 'panRight') {
      animation = 'panRightSlow 8s ease-in-out infinite alternate';
    } else if (fx.animation === 'pulse') {
      animation = 'pulseMotion 2s ease-in-out infinite';
    }

    // Dynamic Fade opacity
    let opacity = 1;
    const clipStart = activeClip.timelineStart || 0;
    const clipDur = (activeClip.trimEnd - activeClip.trimStart) / (activeClip.speed || 1);
    const clipEnd = clipStart + clipDur;

    if (fx.fadeIn || fx.fadeBoth) {
      if (currentTime >= clipStart && currentTime < clipStart + 1.0) {
        opacity = Math.max(0, Math.min(1, (currentTime - clipStart) / 1.0));
      }
    }
    if (fx.fadeOut || fx.fadeBoth) {
      if (currentTime > clipEnd - 1.0 && currentTime <= clipEnd) {
        opacity = Math.min(opacity, Math.max(0, (clipEnd - currentTime) / 1.0));
      }
    }

    return {
      filter: filters.join(' ') || 'none',
      transform: transforms.join(' ') || 'none',
      animation,
      opacity
    };
  };

  // Handle freeform text overlay dragging
  const handleTextPointerDown = (e, txt) => {
    e.stopPropagation();
    e.preventDefault();
    if (setSelectedClipId) setSelectedClipId(txt.id);
    setDraggingTextId(txt.id);
  };

  useEffect(() => {
    if (!draggingTextId) return;

    const handlePointerMove = (e) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.round(Math.max(5, Math.min(95, rawX)));
      const clampedY = Math.round(Math.max(5, Math.min(95, rawY)));

      if (onUpdateText) {
        onUpdateText(draggingTextId, { x: clampedX, y: clampedY, position: 'custom' });
      }
    };

    const handlePointerUp = () => {
      setDraggingTextId(null);
      if (saveSnapshot) saveSnapshot();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingTextId, onUpdateText, saveSnapshot]);

  // Handle interactive custom frame resizing
  const handleResizeStart = (e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    resizeDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      handle
    };
    setResizingHandle(handle);
  };

  useEffect(() => {
    if (!resizingHandle || !resizeDataRef.current) return;

    const handlePointerMove = (e) => {
      const { startX, startY, startW, startH, handle } = resizeDataRef.current;
      let newW = startW;
      let newH = startH;

      if (handle === 'e' || handle === 'se') {
        newW = Math.max(90, startW + (e.clientX - startX));
      }
      if (handle === 's' || handle === 'se') {
        newH = Math.max(90, startH + (e.clientY - startY));
      }

      const rawRatio = newW / newH;
      let w, h;
      if (rawRatio >= 1) {
        w = Math.round(rawRatio * 9 * 10) / 10;
        h = 9;
      } else {
        w = 9;
        h = Math.round((9 / rawRatio) * 10) / 10;
      }

      if (setCustomFrame) {
        setCustomFrame({ width: w, height: h });
      }
    };

    const handlePointerUp = () => {
      setResizingHandle(null);
      resizeDataRef.current = null;
      if (saveSnapshot) saveSnapshot();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingHandle, setCustomFrame, saveSnapshot]);

  const getViewportStyle = () => {
    if (aspectRatio === 'custom') {
      const w = Math.max(0.5, parseFloat(customFrame?.width) || 16);
      const h = Math.max(0.5, parseFloat(customFrame?.height) || 9);
      const isLandscape = w >= h;
      return {
        aspectRatio: `${w} / ${h}`,
        maxWidth: '100%',
        maxHeight: '100%',
        ...(isLandscape ? { width: '100%', height: 'auto' } : { height: '92%', width: 'auto' })
      };
    }
    return {};
  };

  // Find active text overlays at this timecode
  const activeTexts = textOverlays.filter(t => {
    const start = t.startTime || 0;
    const end = t.endTime || totalDuration;
    return currentTime >= start && currentTime <= end;
  });

  return (
    <div className="preview-container" ref={containerRef}>
      {/* Top Aspect Ratio Toolbar */}
      <div className="preview-top-toolbar-container">
        <div className="preview-top-toolbar">
          <div className="aspect-ratio-selector">
            <button 
              type="button" 
              className={`aspect-btn ${aspectRatio === '9:16' ? 'active' : ''}`}
              onClick={() => setAspectRatio && setAspectRatio('9:16')}
              title="9:16 Vertical Reel / TikTok / Shorts"
            >
              <Smartphone size={13} />
              <span>9:16 Reel</span>
            </button>
            <button 
              type="button" 
              className={`aspect-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
              onClick={() => setAspectRatio && setAspectRatio('16:9')}
              title="16:9 Widescreen / Landscape"
            >
              <Monitor size={13} />
              <span>16:9 Wide</span>
            </button>
            <button 
              type="button" 
              className={`aspect-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
              onClick={() => setAspectRatio && setAspectRatio('1:1')}
              title="1:1 Square Format"
            >
              <Square size={12} />
              <span>1:1</span>
            </button>
            <button 
              type="button" 
              className={`aspect-btn ${aspectRatio === 'custom' ? 'active' : ''}`}
              onClick={() => setAspectRatio && setAspectRatio('custom')}
              title="Custom Frame - Drag handles or set custom ratio"
            >
              <Sliders size={13} />
              <span>Custom Frame</span>
            </button>
          </div>

          <button
            type="button"
            className="fit-toggle-btn"
            onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
            title={fitMode === 'cover' ? 'Switch to Fit (Letterbox)' : 'Switch to Fill (Full-bleed Reel)'}
          >
            <Crop size={12} />
            <span>{fitMode === 'cover' ? 'Fill Frame' : 'Fit (Letterbox)'}</span>
          </button>
        </div>

        {/* Custom Frame Quick Presets & Controls */}
        {aspectRatio === 'custom' && (
          <div className="custom-frame-controls-bar">
            <div className="custom-presets-group">
              <span className="custom-group-label">Presets:</span>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 16 && customFrame.height === 9 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 16, height: 9 })}
              >
                16:9 Wide
              </button>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 9 && customFrame.height === 16 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 9, height: 16 })}
              >
                9:16 Reel
              </button>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 1 && customFrame.height === 1 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 1, height: 1 })}
              >
                1:1
              </button>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 4 && customFrame.height === 5 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 4, height: 5 })}
                title="4:5 Instagram Feed Portrait"
              >
                4:5 Insta
              </button>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 21 && customFrame.height === 9 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 21, height: 9 })}
                title="21:9 Ultrawide Cinema"
              >
                21:9 Cinema
              </button>
              <button 
                type="button" 
                className={`custom-preset-chip ${customFrame.width === 4 && customFrame.height === 3 ? 'active' : ''}`}
                onClick={() => setCustomFrame && setCustomFrame({ width: 4, height: 3 })}
                title="4:3 Classic TV"
              >
                4:3 Retro
              </button>
            </div>

            <div className="custom-inputs-group">
              <span className="custom-group-label">Ratio:</span>
              <div className="custom-ratio-inputs">
                <input 
                  type="number" 
                  min="0.5" 
                  max="100" 
                  step="0.5"
                  value={customFrame.width}
                  onChange={(e) => setCustomFrame && setCustomFrame(prev => ({ ...prev, width: Math.max(0.5, parseFloat(e.target.value) || 1) }))}
                  className="custom-dim-input"
                  title="Width Ratio"
                />
                <span className="custom-dim-sep">:</span>
                <input 
                  type="number" 
                  min="0.5" 
                  max="100" 
                  step="0.5"
                  value={customFrame.height}
                  onChange={(e) => setCustomFrame && setCustomFrame(prev => ({ ...prev, height: Math.max(0.5, parseFloat(e.target.value) || 1) }))}
                  className="custom-dim-input"
                  title="Height Ratio"
                />
              </div>

              <button 
                type="button"
                className="custom-flip-btn"
                onClick={() => setCustomFrame && setCustomFrame(prev => ({ width: prev.height, height: prev.width }))}
                title="Flip Width & Height Orientation"
              >
                <ArrowLeftRight size={11} />
                <span>Flip</span>
              </button>

              <span className="custom-hint-pill">
                💡 Drag frame handles below to resize freely
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Center Viewport */}
      <div className="preview-viewport-wrapper">
        <div 
          ref={viewportRef}
          className={`preview-viewport aspect-${aspectRatio === 'custom' ? 'custom' : aspectRatio.replace(':', '-')} ${resizingHandle ? 'is-resizing' : ''}`}
          style={getViewportStyle()}
        >
          {activeClip ? (
            <>
              {/* If letterboxed (contain), render ambient blurred background */}
              {fitMode === 'contain' && (
                <div 
                  className="preview-ambient-blur"
                  style={{
                    backgroundImage: `url(${activeClip.url})`,
                    position: 'absolute',
                    inset: '-20px',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(30px) brightness(0.35)',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {isImageClip ? (
                <img 
                  src={activeClip.url}
                  alt={activeClip.name || 'Image clip'}
                  className="preview-image"
                  style={{
                    ...getFilterStyle(),
                    objectFit: fitMode,
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={activeClip.url}
                  className="preview-video"
                  style={{
                    ...getFilterStyle(),
                    objectFit: fitMode
                  }}
                  muted={isMuted || activeClip.muteOriginalAudio}
                  volume={volume}
                  playsInline
                />
              )}

              {/* Vignette Overlay */}
              {activeClip.effects?.vignette && (
                <div className="preview-vignette-overlay" />
              )}

              {/* Film Grain Texture Overlay */}
              {(activeClip.effects?.filmGrain || activeClip.effects?.noise) && (
                <div className="preview-grain-overlay" />
              )}

              {/* Freeform Draggable Text Overlays */}
              {activeTexts.map(txt => {
                const isSelected = selectedClipId === txt.id;
                const isDragging = draggingTextId === txt.id;

                let posX = txt.x !== undefined ? txt.x : 50;
                let posY = txt.y !== undefined ? txt.y : (
                  txt.position === 'top' ? 15 :
                  txt.position === 'center' ? 50 : 85
                );

                return (
                  <div 
                    key={txt.id} 
                    className={`preview-text-overlay ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${txt.animation ? `text-anim-${txt.animation}` : ''}`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${txt.fontSize || (aspectRatio === '9:16' ? 26 : 36)}px`,
                      color: txt.color || '#ffffff',
                      ...(txt.background ? {
                        background: 'rgba(0, 0, 0, 0.65)',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(4px)'
                      } : {})
                    }}
                    onPointerDown={(e) => handleTextPointerDown(e, txt)}
                    title="Click to select • Drag freely to position"
                  >
                    {isSelected && (
                      <div className="text-drag-badge">
                        <Move size={10} />
                        <span>X: {posX}% • Y: {posY}%</span>
                      </div>
                    )}
                    <span className="text-content-span">{txt.text}</span>
                  </div>
                );
              })}

              {/* Custom Frame Interactive Drag Handles */}
              {aspectRatio === 'custom' && (
                <>
                  <div 
                    className="frame-resize-handle handle-e"
                    onPointerDown={(e) => handleResizeStart(e, 'e')}
                    title="Drag to resize frame width"
                  >
                    <div className="handle-bar-vertical" />
                  </div>
                  <div 
                    className="frame-resize-handle handle-s"
                    onPointerDown={(e) => handleResizeStart(e, 's')}
                    title="Drag to resize frame height"
                  >
                    <div className="handle-bar-horizontal" />
                  </div>
                  <div 
                    className="frame-resize-handle handle-se"
                    onPointerDown={(e) => handleResizeStart(e, 'se')}
                    title="Drag corner to freely reshape frame ratio"
                  >
                    <div className="handle-corner-dot" />
                  </div>
                  <div className="frame-dimension-pill">
                    <span>Custom: {customFrame.width} : {customFrame.height}</span>
                    <span className="frame-ratio-tag">({(customFrame.width / customFrame.height).toFixed(2)}:1)</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="preview-placeholder">
              <Film size={48} />
              <div style={{ fontWeight: 600, fontSize: '15px' }}>No Media on Timeline</div>
              <div style={{ fontSize: '12px', maxWidth: '300px' }}>
                Add a video or photo from the Media Library on the left to start editing.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transport Controls */}
      <div className="transport-bar">
        {/* Left: Timecode Display */}
        <div className="transport-left">
          <div className="timecode-display">
            <span>{formatTimecode(currentTime)}</span>
            <span className="timecode-sep">/</span>
            <span style={{ color: 'var(--text-muted)' }}>{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Center: Playback Buttons */}
        <div className="transport-center">
          <button 
            className="btn-icon" 
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
            title="Step Back 1s"
          >
            <SkipBack size={16} />
          </button>

          <button 
            className="btn-play-pause" 
            onClick={() => setIsPlaying(!isPlaying)}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" style={{ marginLeft: '2px' }} />}
          </button>

          <button 
            className="btn-icon" 
            onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 1))}
            title="Step Forward 1s"
          >
            <SkipForward size={16} />
          </button>

          <button 
            className={`btn-icon ${isLooping ? 'active' : ''}`}
            onClick={() => setIsLooping(!isLooping)}
            title={isLooping ? 'Looping Enabled' : 'Enable Looping'}
            style={{ color: isLooping ? 'var(--primary)' : undefined }}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Right: Volume & Fullscreen */}
        <div className="transport-right">
          <div className="volume-control">
            <button 
              className="btn-icon" 
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" 
              className="volume-slider" 
              min="0" 
              max="1" 
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              title="Volume"
            />
          </div>

          <button 
            className="btn-icon" 
            onClick={toggleFullscreen}
            title="Fullscreen Preview"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
