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
  Film
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
  selectedClipId
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Find the active video clip on the timeline for current time
  const activeClip = videoClips.find(c => {
    const clipDur = (c.trimEnd - c.trimStart) / (c.speed || 1);
    const start = c.timelineStart || 0;
    const end = start + clipDur;
    return currentTime >= start && currentTime < end;
  }) || (videoClips.length > 0 && currentTime === 0 ? videoClips[0] : null);

  // Synchronize HTML5 video element with current timeline time
  useEffect(() => {
    if (!videoRef.current || !activeClip) return;

    const clipStart = activeClip.timelineStart || 0;
    const speed = activeClip.speed || 1;
    const offsetInClip = (currentTime - clipStart) * speed;
    const targetSourceTime = activeClip.trimStart + offsetInClip;

    // Only update if difference > 0.15s to prevent stutter during playback
    if (Math.abs(videoRef.current.currentTime - targetSourceTime) > 0.15) {
      videoRef.current.currentTime = Math.max(0, targetSourceTime);
    }
  }, [currentTime, activeClip]);

  // Handle play/pause sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.playbackRate = activeClip?.speed || 1;
      videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, activeClip]);

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

    const transforms = [];
    if (fx.rotate) transforms.push(`rotate(${fx.rotate}deg)`);
    if (fx.flipH) transforms.push('scaleX(-1)');
    if (fx.flipV) transforms.push('scaleY(-1)');
    if (fx.zoom && fx.zoom > 1) transforms.push(`scale(${fx.zoom})`);

    return {
      filter: filters.join(' ') || 'none',
      transform: transforms.join(' ') || 'none'
    };
  };

  // Find active text overlays at this timecode
  const activeTexts = textOverlays.filter(t => {
    const start = t.startTime || 0;
    const end = t.endTime || totalDuration;
    return currentTime >= start && currentTime <= end;
  });

  return (
    <div className="preview-container" ref={containerRef}>
      {/* Center Viewport */}
      <div className="preview-viewport-wrapper">
        <div className="preview-viewport">
          {activeClip ? (
            <>
              <video 
                ref={videoRef}
                src={activeClip.url}
                className="preview-video"
                style={getFilterStyle()}
                muted={isMuted || activeClip.muteOriginalAudio}
                volume={volume}
                playsInline
              />

              {/* Text Overlays rendering */}
              {activeTexts.map(txt => (
                <div 
                  key={txt.id} 
                  className={`preview-text-overlay ${txt.position || 'bottom'}`}
                  style={{
                    fontSize: `${txt.fontSize || 36}px`,
                    color: txt.color || '#ffffff'
                  }}
                >
                  {txt.text}
                </div>
              ))}
            </>
          ) : (
            <div className="preview-placeholder">
              <Film size={48} />
              <div style={{ fontWeight: 600, fontSize: '15px' }}>No Video on Timeline</div>
              <div style={{ fontSize: '12px', maxWidth: '300px' }}>
                Add a video from the Media Library on the left to start editing.
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
