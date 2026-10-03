import React, { useRef, useState, useEffect } from 'react';
import { 
  Scissors, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Split, 
  Layers, 
  MoveHorizontal,
  GripVertical
} from 'lucide-react';
import { formatTimecode, formatDuration } from '../utils/timeUtils';

export default function Timeline({
  videoClips,
  audioClips,
  textOverlays,
  currentTime,
  setCurrentTime,
  totalDuration,
  selectedClipId,
  setSelectedClipId,
  onSplitClip,
  onDeleteClip,
  onUpdateClip,
  onUpdateAudio,
  onUpdateText,
  saveSnapshot
}) {
  const [zoomLevel, setZoomLevel] = useState(30); // pixels per second
  const timelineScrollRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Dragging states
  const [draggingTrim, setDraggingTrim] = useState(null); // { clipId, type: 'start'|'end', trackType, startX, originalVal, ... }
  const [movingClip, setMovingClip] = useState(null); // { id, trackType: 'video'|'audio'|'text', startX, originalStart, duration, hasMoved }

  const timelineWidth = Math.max(1600, (totalDuration + 30) * zoomLevel);

  // Playhead Scrubbing handler
  const handleTimelineMouseDown = (e) => {
    if (e.target.closest('.timeline-clip')) return;

    const rect = timelineScrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
    const targetTime = Math.max(0, Math.min(totalDuration + 10, clickX / zoomLevel));
    setCurrentTime(targetTime);
    setIsScrubbing(true);
  };

  // Global mousemove and mouseup listeners
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. Playhead scrubbing
      if (isScrubbing && timelineScrollRef.current) {
        const rect = timelineScrollRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + timelineScrollRef.current.scrollLeft;
        const targetTime = Math.max(0, Math.min(totalDuration + 15, clickX / zoomLevel));
        setCurrentTime(targetTime);
      }

      // 2. Moving / Dragging a clip position horizontally
      if (movingClip) {
        const deltaPixels = e.clientX - movingClip.startX;
        const deltaSeconds = deltaPixels / zoomLevel;
        let newStart = Math.max(0, movingClip.originalStart + deltaSeconds);
        newStart = Math.round(newStart * 10) / 10; // Round to 0.1s precision

        if (Math.abs(deltaPixels) > 3) {
          movingClip.hasMoved = true;
        }

        if (movingClip.trackType === 'video') {
          onUpdateClip(movingClip.id, { timelineStart: newStart });
        } else if (movingClip.trackType === 'audio') {
          if (onUpdateAudio) {
            onUpdateAudio(movingClip.id, { timelineStart: newStart });
          }
        } else if (movingClip.trackType === 'text') {
          const dur = movingClip.duration || 5;
          if (onUpdateText) {
            onUpdateText(movingClip.id, { startTime: newStart, endTime: newStart + dur });
          }
        }
      }

      // 3. Trimming clip boundaries (start / end)
      if (draggingTrim) {
        const deltaPixels = e.clientX - draggingTrim.startX;
        const deltaSeconds = deltaPixels / zoomLevel;

        if (draggingTrim.trackType === 'video') {
          const clip = videoClips.find(c => c.id === draggingTrim.id);
          if (!clip) return;

          if (draggingTrim.type === 'start') {
            const newTrimStart = Math.max(0, Math.min(clip.trimEnd - 0.5, draggingTrim.originalTrim + deltaSeconds));
            onUpdateClip(clip.id, { trimStart: Math.round(newTrimStart * 100) / 100 });
          } else if (draggingTrim.type === 'end') {
            const maxSource = clip.duration || 9999;
            const newTrimEnd = Math.max(clip.trimStart + 0.5, Math.min(maxSource, draggingTrim.originalTrim + deltaSeconds));
            onUpdateClip(clip.id, { trimEnd: Math.round(newTrimEnd * 100) / 100 });
          }
        } else if (draggingTrim.trackType === 'audio') {
          const ac = audioClips.find(a => a.id === draggingTrim.id);
          if (!ac || !onUpdateAudio) return;

          if (draggingTrim.type === 'start') {
            const newTrimStart = Math.max(0, Math.min(ac.trimEnd - 0.5, draggingTrim.originalTrim + deltaSeconds));
            onUpdateAudio(ac.id, { trimStart: Math.round(newTrimStart * 100) / 100 });
          } else if (draggingTrim.type === 'end') {
            const maxSource = ac.duration || 9999;
            const newTrimEnd = Math.max(ac.trimStart + 0.5, Math.min(maxSource, draggingTrim.originalTrim + deltaSeconds));
            onUpdateAudio(ac.id, { trimEnd: Math.round(newTrimEnd * 100) / 100 });
          }
        } else if (draggingTrim.trackType === 'text') {
          const txt = textOverlays.find(t => t.id === draggingTrim.id);
          if (!txt || !onUpdateText) return;

          if (draggingTrim.type === 'start') {
            const newStartTime = Math.max(0, Math.min((txt.endTime || 5) - 0.5, draggingTrim.originalTrim + deltaSeconds));
            onUpdateText(txt.id, { startTime: Math.round(newStartTime * 10) / 10 });
          } else if (draggingTrim.type === 'end') {
            const newEndTime = Math.max((txt.startTime || 0) + 0.5, draggingTrim.originalTrim + deltaSeconds);
            onUpdateText(txt.id, { endTime: Math.round(newEndTime * 10) / 10 });
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (movingClip && movingClip.hasMoved && saveSnapshot) {
        saveSnapshot();
      }
      setIsScrubbing(false);
      setMovingClip(null);
      setDraggingTrim(null);
    };

    if (isScrubbing || movingClip || draggingTrim) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, movingClip, draggingTrim, totalDuration, zoomLevel, videoClips, audioClips, textOverlays, setCurrentTime, onUpdateClip, onUpdateAudio, onUpdateText, saveSnapshot]);

  // Start Moving Clip position
  const startClipMove = (e, item, trackType) => {
    if (e.target.closest('.trim-handle')) return; // Do not start move if clicking trim handle
    e.stopPropagation();
    setSelectedClipId(item.id);

    const startVal = item.timelineStart !== undefined ? item.timelineStart : (item.startTime || 0);
    const durationVal = item.endTime 
      ? (item.endTime - (item.startTime || 0)) 
      : ((item.trimEnd - item.trimStart) / (item.speed || 1));

    setMovingClip({
      id: item.id,
      trackType,
      startX: e.clientX,
      originalStart: startVal,
      duration: durationVal,
      hasMoved: false
    });
  };

  // Start Trim boundary drag
  const startTrimDrag = (e, item, trackType, trimType) => {
    e.stopPropagation();
    let originalTrim = 0;
    if (trackType === 'text') {
      originalTrim = trimType === 'start' ? (item.startTime || 0) : (item.endTime || 5);
    } else {
      originalTrim = trimType === 'start' ? item.trimStart : item.trimEnd;
    }

    setDraggingTrim({
      id: item.id,
      trackType,
      type: trimType,
      startX: e.clientX,
      originalTrim
    });
  };

  // Generate ruler tick marks
  const renderRulerTicks = () => {
    const ticks = [];
    const intervalSec = zoomLevel < 20 ? 10 : (zoomLevel < 50 ? 5 : 2);
    const count = Math.ceil(totalDuration + 40);

    for (let sec = 0; sec <= count; sec += intervalSec) {
      ticks.push(
        <div 
          key={sec} 
          className="ruler-tick" 
          style={{ left: `${sec * zoomLevel}px` }}
        >
          {formatDuration(sec)}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="timeline-container">
      {/* Timeline Action Bar */}
      <div className="timeline-toolbar">
        <div className="timeline-tools-left">
          <button 
            className="tool-btn"
            onClick={() => onSplitClip(currentTime)}
            title="Split selected clip at current playhead position"
          >
            <Scissors size={14} />
            <span>Split Clip</span>
          </button>

          <button 
            className="tool-btn"
            disabled={!selectedClipId}
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            title="Delete selected clip"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '12px' }}>
            💡 Tip: Drag any clip horizontally to move its position on the timeline!
          </span>
        </div>

        {/* Zoom controls */}
        <div className="timeline-zoom-control">
          <ZoomOut size={14} style={{ color: 'var(--text-dim)' }} />
          <input 
            type="range" 
            className="timeline-zoom-slider"
            min="10" 
            max="80" 
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
            title="Timeline Zoom Level"
          />
          <ZoomIn size={14} style={{ color: 'var(--text-dim)' }} />
        </div>
      </div>

      {/* Timeline Main Canvas */}
      <div className="timeline-body">
        {/* Track Headers */}
        <div className="timeline-track-headers">
          <div className="track-header text">
            <span>T1</span>
          </div>
          <div className="track-header video">
            <span>V1</span>
          </div>
          <div className="track-header audio">
            <span>A1</span>
          </div>
        </div>

        {/* Scrollable Tracks Area */}
        <div 
          className="timeline-tracks-scroll" 
          ref={timelineScrollRef}
          onMouseDown={handleTimelineMouseDown}
        >
          <div className="timeline-canvas-layer" style={{ width: `${timelineWidth}px` }}>
            {/* Time Ruler */}
            <div className="time-ruler">
              {renderRulerTicks()}
            </div>

            {/* Track 3: Text Track (T1) */}
            <div className="track-row">
              {textOverlays.map(txt => {
                const start = txt.startTime || 0;
                const dur = (txt.endTime || (start + 5)) - start;
                const left = start * zoomLevel;
                const width = Math.max(24, dur * zoomLevel);
                const isSelected = selectedClipId === txt.id;
                const isMoving = movingClip?.id === txt.id;

                return (
                  <div
                    key={txt.id}
                    className={`timeline-clip text ${isSelected ? 'selected' : ''} ${isMoving ? 'is-moving' : ''}`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    onMouseDown={(e) => startClipMove(e, txt, 'text')}
                    title="Click and drag to move text overlay along timeline"
                  >
                    {/* Left Trim Handle */}
                    <div 
                      className="trim-handle left" 
                      onMouseDown={(e) => startTrimDrag(e, txt, 'text', 'start')}
                      title="Drag to adjust start time"
                    />

                    <div className="clip-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GripVertical size={11} style={{ opacity: 0.6 }} />
                      <span>{txt.text}</span>
                    </div>
                    <span className="clip-duration-tag">{dur.toFixed(1)}s</span>

                    {/* Right Trim Handle */}
                    <div 
                      className="trim-handle right" 
                      onMouseDown={(e) => startTrimDrag(e, txt, 'text', 'end')}
                      title="Drag to adjust end time"
                    />
                  </div>
                );
              })}
            </div>

            {/* Track 1: Video Track (V1) */}
            <div className="track-row">
              {videoClips.map((clip, idx) => {
                const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
                const left = (clip.timelineStart || 0) * zoomLevel;
                const width = Math.max(30, clipDuration * zoomLevel);
                const isSelected = selectedClipId === clip.id;
                const isMoving = movingClip?.id === clip.id;

                return (
                  <div 
                    key={clip.id}
                    className={`timeline-clip video ${isSelected ? 'selected' : ''} ${isMoving ? 'is-moving' : ''}`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    onMouseDown={(e) => startClipMove(e, clip, 'video')}
                    title="Click and drag to move video clip position on timeline"
                  >
                    {/* Left Trim Handle */}
                    <div 
                      className="trim-handle left" 
                      onMouseDown={(e) => startTrimDrag(e, clip, 'video', 'start')}
                      title="Drag to trim start"
                    />

                    <div className="clip-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GripVertical size={11} style={{ opacity: 0.6 }} />
                      <span>{clip.name || `Clip ${idx + 1}`}</span>
                      {clip.speed && clip.speed !== 1 && (
                        <span style={{ marginLeft: '4px', opacity: 0.8 }}>({clip.speed}x)</span>
                      )}
                    </div>
                    <span className="clip-duration-tag">{clipDuration.toFixed(1)}s</span>

                    {/* Right Trim Handle */}
                    <div 
                      className="trim-handle right" 
                      onMouseDown={(e) => startTrimDrag(e, clip, 'video', 'end')}
                      title="Drag to trim end"
                    />
                  </div>
                );
              })}
            </div>

            {/* Track 2: Audio Track (A1) */}
            <div className="track-row">
              {audioClips.map((ac, idx) => {
                const dur = (ac.trimEnd - ac.trimStart);
                const left = (ac.timelineStart || 0) * zoomLevel;
                const width = Math.max(30, dur * zoomLevel);
                const isSelected = selectedClipId === ac.id;
                const isMoving = movingClip?.id === ac.id;

                return (
                  <div 
                    key={ac.id}
                    className={`timeline-clip audio ${isSelected ? 'selected' : ''} ${isMoving ? 'is-moving' : ''}`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    onMouseDown={(e) => startClipMove(e, ac, 'audio')}
                    title="Click and drag to move audio track position on timeline"
                  >
                    {/* Left Trim Handle */}
                    <div 
                      className="trim-handle left" 
                      onMouseDown={(e) => startTrimDrag(e, ac, 'audio', 'start')}
                      title="Drag to trim audio start"
                    />

                    <div className="clip-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GripVertical size={11} style={{ opacity: 0.6 }} />
                      <span>{ac.name || `Audio ${idx + 1}`}</span>
                    </div>
                    <span className="clip-duration-tag">{dur.toFixed(1)}s</span>

                    {/* Right Trim Handle */}
                    <div 
                      className="trim-handle right" 
                      onMouseDown={(e) => startTrimDrag(e, ac, 'audio', 'end')}
                      title="Drag to trim audio end"
                    />
                  </div>
                );
              })}
            </div>

            {/* Draggable Red Playhead */}
            <div 
              className="playhead-cursor" 
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div 
                className="playhead-head" 
                onMouseDown={(e) => { e.stopPropagation(); setIsScrubbing(true); }}
                title={`Playhead: ${formatTimecode(currentTime)}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
