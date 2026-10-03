import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import Properties from './components/Properties';
import AiAssistant from './components/AiAssistant';
import ExportModal from './components/ExportModal';
import ProjectModal from './components/ProjectModal';
import { 
  fetchStatus, 
  listMediaApi,
  uploadMediaFile, 
  parseAiCommand, 
  saveProjectApi 
} from './utils/api';
import { Sliders, Sparkles } from 'lucide-react';

export default function App() {
  // Project Info
  const [projectName, setProjectName] = useState('My Creative Video');
  const [projectId, setProjectId] = useState(`proj_${Date.now()}`);

  // System & FFmpeg
  const [ffmpegStatus, setFfmpegStatus] = useState({ available: false, version: 'Checking...' });

  // Media Library
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Timeline Tracks
  const [videoClips, setVideoClips] = useState([]);
  const [audioClips, setAudioClips] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);

  // Transport & Playhead
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // Right Inspector View: 'properties' | 'ai'
  const [rightTab, setRightTab] = useState('properties');

  // AI Command History & Planned Action
  const [commandHistory, setCommandHistory] = useState([]);
  const [plannedAction, setPlannedAction] = useState(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Fetch status and media library on startup
  useEffect(() => {
    fetchStatus().then(data => {
      if (data?.ffmpeg) {
        setFfmpegStatus(data.ffmpeg);
      }
    }).catch(err => console.warn('Could not connect to backend:', err));

    listMediaApi().then(items => {
      if (items && items.length > 0) {
        setMediaFiles(items);
        // Automatically add first video if timeline is empty
        const firstVideo = items.find(i => i.type === 'video');
        if (firstVideo) {
          handleAddVideoToTimeline(firstVideo);
        }
      }
    }).catch(err => console.warn('Media list fetch error:', err));
  }, []);

  // Compute Total Duration of the Project
  const totalDuration = videoClips.reduce((max, clip) => {
    const clipDur = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
    const end = (clip.timelineStart || 0) + clipDur;
    return Math.max(max, end);
  }, 0);

  // Snapshot State for Undo
  const saveSnapshot = useCallback(() => {
    const snapshot = {
      videoClips: JSON.parse(JSON.stringify(videoClips)),
      audioClips: JSON.parse(JSON.stringify(audioClips)),
      textOverlays: JSON.parse(JSON.stringify(textOverlays))
    };
    setUndoStack(prev => [...prev.slice(-20), snapshot]);
    setRedoStack([]);
  }, [videoClips, audioClips, textOverlays]);

  // Undo Action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const current = {
      videoClips: JSON.parse(JSON.stringify(videoClips)),
      audioClips: JSON.parse(JSON.stringify(audioClips)),
      textOverlays: JSON.parse(JSON.stringify(textOverlays))
    };

    setRedoStack(prev => [...prev, current]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    setVideoClips(previous.videoClips);
    setAudioClips(previous.audioClips);
    setTextOverlays(previous.textOverlays);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = {
      videoClips: JSON.parse(JSON.stringify(videoClips)),
      audioClips: JSON.parse(JSON.stringify(audioClips)),
      textOverlays: JSON.parse(JSON.stringify(textOverlays))
    };

    setUndoStack(prev => [...prev, current]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setVideoClips(next.videoClips);
    setAudioClips(next.audioClips);
    setTextOverlays(next.textOverlays);
  };

  // 1. Upload Media
  const handleUploadFile = async (file) => {
    try {
      setIsUploading(true);
      const mediaItem = await uploadMediaFile(file);
      setMediaFiles(prev => [...prev, mediaItem]);

      // Automatically add first video to timeline
      if (mediaItem.type === 'video' && videoClips.length === 0) {
        handleAddVideoToTimeline(mediaItem);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Add Video to Timeline
  const handleAddVideoToTimeline = (media) => {
    saveSnapshot();
    const duration = media.metadata?.duration || 10;
    const lastClipEnd = videoClips.reduce((max, c) => {
      const dur = (c.trimEnd - c.trimStart) / (c.speed || 1);
      return Math.max(max, (c.timelineStart || 0) + dur);
    }, 0);

    const newClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: media.id,
      name: media.originalName,
      filePath: media.filePath,
      url: media.url,
      duration: duration,
      trimStart: 0,
      trimEnd: duration,
      timelineStart: lastClipEnd,
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
    };

    setVideoClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  // 3. Add Audio to Timeline
  const handleAddAudioToTimeline = (media) => {
    saveSnapshot();
    const duration = media.metadata?.duration || 10;
    const newAudio = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: media.id,
      name: media.originalName,
      filePath: media.filePath,
      url: media.url,
      duration: duration,
      trimStart: 0,
      trimEnd: duration,
      timelineStart: 0,
      volume: 1.0,
      fadeIn: 0,
      fadeOut: 0
    };
    setAudioClips(prev => [...prev, newAudio]);
    setSelectedClipId(newAudio.id);
  };

  // 4. Add Text Overlay
  const handleAddTextOverlay = (text = 'My Title', position = 'bottom', fontSize = 36) => {
    saveSnapshot();
    const newText = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      position,
      fontSize,
      color: '#ffffff',
      startTime: currentTime,
      endTime: Math.min(totalDuration, currentTime + 5) || 5
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedClipId(newText.id);
  };

  // 5. Update Clip Properties
  const handleUpdateClip = (id, updates) => {
    setVideoClips(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ...updates,
          effects: {
            ...c.effects,
            ...(updates.effects || {})
          }
        };
      }
      return c;
    }));
  };

  // 6. Update Text Overlay
  const handleUpdateText = (id, updates) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // 6.5 Update Audio Track
  const handleUpdateAudio = (id, updates) => {
    setAudioClips(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // 7. Delete Selected Clip / Item
  const handleDeleteSelected = (id) => {
    saveSnapshot();
    setVideoClips(prev => prev.filter(c => c.id !== id));
    setAudioClips(prev => prev.filter(a => a.id !== id));
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };

  // 8. Split Clip at Time (Razor Tool)
  const handleSplitClip = (splitTime) => {
    const targetClip = videoClips.find(c => {
      const clipDur = (c.trimEnd - c.trimStart) / (c.speed || 1);
      const start = c.timelineStart || 0;
      const end = start + clipDur;
      return splitTime > start && splitTime < end;
    });

    if (!targetClip) {
      alert('Playhead must be over a video clip to split it.');
      return;
    }

    saveSnapshot();
    const clipStart = targetClip.timelineStart || 0;
    const speed = targetClip.speed || 1;
    const offsetInClip = (splitTime - clipStart) * speed;
    const cutPointSource = targetClip.trimStart + offsetInClip;

    // Part A (Original modified)
    const clipA = {
      ...targetClip,
      trimEnd: cutPointSource
    };

    // Part B (New clip created)
    const clipB = {
      ...targetClip,
      id: `clip_${Date.now()}_partB`,
      trimStart: cutPointSource,
      timelineStart: splitTime
    };

    setVideoClips(prev => {
      const idx = prev.findIndex(c => c.id === targetClip.id);
      const copy = [...prev];
      copy.splice(idx, 1, clipA, clipB);
      return copy;
    });

    setSelectedClipId(clipB.id);
  };

  // 9. Apply Effect Preset to Active Clip
  const handleApplyEffectPreset = (presetName) => {
    if (videoClips.length === 0) return;
    const clip = videoClips.find(c => c.id === selectedClipId) || videoClips[0];
    saveSnapshot();

    if (presetName === 'grayscale') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, grayscale: true, sepia: false } });
    } else if (presetName === 'sepia') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, sepia: true, grayscale: false } });
    } else if (presetName === 'vibrant') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, saturation: 1.5, contrast: 1.15 } });
    } else if (presetName === 'cinematic') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, contrast: 1.25, saturation: 0.9, brightness: -0.05 } });
    } else if (presetName === 'blur') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, blur: 5 } });
    } else if (presetName === 'sharpen') {
      handleUpdateClip(clip.id, { effects: { ...clip.effects, sharpen: 1.5 } });
    } else if (presetName === 'normal') {
      handleUpdateClip(clip.id, {
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
    }
  };

  // 10. AI Command Engine: Analyze & Plan
  const handleAnalyzeCommand = async (prompt, requireConfirmation = true) => {
    try {
      setIsAiProcessing(true);
      const activeClip = videoClips.find(c => c.id === selectedClipId) || videoClips[0];

      const res = await parseAiCommand(prompt, {
        activeClip,
        activeClipId: activeClip?.id,
        currentTime,
        totalDuration
      });

      if (!res.success) {
        setCommandHistory(prev => [{
          prompt,
          error: res.error,
          timestamp: new Date().toLocaleTimeString(),
          undone: true
        }, ...prev]);
        return;
      }

      const plan = {
        prompt,
        action: res.action,
        activeClip: activeClip ? { ...activeClip } : null
      };

      if (requireConfirmation) {
        setPlannedAction(plan);
      } else {
        handleApplyAction(plan);
      }
    } catch (err) {
      alert('AI Analysis error: ' + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // 10.1 Execute & Mutate Timeline
  const handleApplyAction = (plan) => {
    const { prompt, action } = plan;
    const activeClip = videoClips.find(c => c.id === selectedClipId) || videoClips[0];

    saveSnapshot();

    if (action.type === 'TRIM_START' && activeClip) {
      const secs = action.payload.seconds;
      const newStart = Math.min(activeClip.trimEnd - 0.5, activeClip.trimStart + secs);
      handleUpdateClip(activeClip.id, { trimStart: Math.round(newStart * 100) / 100 });
      if (currentTime < (activeClip.timelineStart || 0)) {
        setCurrentTime(activeClip.timelineStart || 0);
      }
    } else if (action.type === 'TRIM_END' && activeClip) {
      const secs = action.payload.seconds;
      const newEnd = Math.max(activeClip.trimStart + 0.5, activeClip.trimEnd - secs);
      handleUpdateClip(activeClip.id, { trimEnd: Math.round(newEnd * 100) / 100 });
    } else if (action.type === 'SET_DURATION' && activeClip) {
      const dur = action.payload.duration;
      const maxSource = activeClip.duration || 9999;
      const newEnd = Math.min(maxSource, activeClip.trimStart + dur);
      handleUpdateClip(activeClip.id, { trimEnd: Math.round(newEnd * 100) / 100 });
    } else if (action.type === 'SET_SPEED' && activeClip) {
      handleUpdateClip(activeClip.id, { speed: action.payload.speed });
    } else if (action.type === 'SET_EFFECT' && activeClip) {
      const { effect, value } = action.payload;
      handleUpdateClip(activeClip.id, { effects: { ...activeClip.effects, [effect]: value } });
    } else if (action.type === 'CLEAR_EFFECTS' && activeClip) {
      handleApplyEffectPreset('normal');
    } else if (action.type === 'MUTE_AUDIO' && activeClip) {
      handleUpdateClip(activeClip.id, { muteOriginalAudio: true, volume: 0 });
    } else if (action.type === 'SPLIT') {
      handleSplitClip(action.payload.time);
    } else if (action.type === 'SPLIT_AT_PLAYHEAD') {
      handleSplitClip(currentTime);
    } else if (action.type === 'ADD_TEXT') {
      handleAddTextOverlay(action.payload.text, action.payload.position || 'bottom', action.payload.fontSize || 40);
    } else if (action.type === 'ADD_AUDIO_TRACK') {
      const soundFile = mediaFiles.find(m => m.type === 'audio');
      if (soundFile) {
        handleAddAudioToTimeline(soundFile);
      } else {
        alert('No audio file found in media library. Please import an audio track first.');
      }
    } else if (action.type === 'REMOVE_BORING_PARTS' && activeClip) {
      const newStart = Math.min(activeClip.trimEnd - 1, activeClip.trimStart + 1.5);
      handleUpdateClip(activeClip.id, { trimStart: Math.round(newStart * 100) / 100 });
    } else if (action.type === 'CREATE_REEL' && activeClip) {
      const targetEnd = Math.min(activeClip.duration || 9999, activeClip.trimStart + 10);
      handleUpdateClip(activeClip.id, {
        trimEnd: Math.round(targetEnd * 100) / 100,
        speed: 1.15,
        effects: { ...activeClip.effects, saturation: 1.3, contrast: 1.1 }
      });
      handleAddTextOverlay('Viral Reel', 'bottom', 40);
    }

    setCommandHistory(prev => [{
      prompt,
      actionType: action.type,
      description: action.description,
      timestamp: new Date().toLocaleTimeString(),
      undone: false
    }, ...prev]);

    setPlannedAction(null);
  };

  // 10.2 Undo Specific AI Edit
  const handleUndoLastEdit = (historyIndex) => {
    handleUndo();
    setCommandHistory(prev => prev.map((item, idx) => idx === historyIndex ? { ...item, undone: true } : item));
  };

  // 11. Save Project
  const handleSaveProject = async () => {
    try {
      const projectPayload = {
        id: projectId,
        name: projectName,
        totalDuration,
        videoClips,
        audioClips,
        textOverlays
      };
      await saveProjectApi(projectPayload);
      alert(`Project "${projectName}" saved successfully to local storage!`);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  // 12. Load Project
  const handleLoadProject = (proj) => {
    saveSnapshot();
    setProjectId(proj.id);
    setProjectName(proj.name);
    setVideoClips(proj.videoClips || []);
    setAudioClips(proj.audioClips || []);
    setTextOverlays(proj.textOverlays || []);
    setCurrentTime(0);
    setSelectedClipId(proj.videoClips?.[0]?.id || null);
  };

  // 13. New Project
  const handleNewProject = () => {
    if (videoClips.length > 0 && !window.confirm('Start a new project? Unsaved changes will be lost.')) return;
    setProjectId(`proj_${Date.now()}`);
    setProjectName('Untitled Project');
    setVideoClips([]);
    setAudioClips([]);
    setTextOverlays([]);
    setCurrentTime(0);
    setSelectedClipId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  // Identify currently selected clip or text item
  const selectedClip = videoClips.find(c => c.id === selectedClipId);
  const selectedText = textOverlays.find(t => t.id === selectedClipId);

  return (
    <div className="editor-container">
      {/* 1. Top Header */}
      <Header 
        projectName={projectName}
        setProjectName={setProjectName}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSaveProject}
        onNewProject={handleNewProject}
        onOpenProjects={() => setIsProjectModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
        ffmpegStatus={ffmpegStatus}
      />

      {/* 2. Middle Work Area */}
      <div className="editor-workspace">
        {/* Left Sidebar */}
        <Sidebar 
          mediaFiles={mediaFiles}
          onUploadFile={handleUploadFile}
          isUploading={isUploading}
          onAddVideoToTimeline={handleAddVideoToTimeline}
          onAddAudioToTimeline={handleAddAudioToTimeline}
          onAddTextOverlay={handleAddTextOverlay}
          onApplyEffectPreset={handleApplyEffectPreset}
        />

        {/* Center Preview Viewport */}
        <Preview 
          videoClips={videoClips}
          audioClips={audioClips}
          textOverlays={textOverlays}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          selectedClipId={selectedClipId}
        />

        {/* Right Inspector & AI Assistant Panel */}
        <aside className="inspector-container">
          <div className="inspector-tabs">
            <button 
              className={`inspector-tab-btn ${rightTab === 'properties' ? 'active' : ''}`}
              onClick={() => setRightTab('properties')}
            >
              <Sliders size={15} />
              <span>Properties</span>
            </button>
            <button 
              className={`inspector-tab-btn ${rightTab === 'ai' ? 'active' : ''}`}
              onClick={() => setRightTab('ai')}
            >
              <Sparkles size={15} />
              <span>AI Assistant</span>
            </button>
          </div>

          {rightTab === 'properties' ? (
            <Properties 
              selectedClip={selectedClip}
              selectedText={selectedText}
              onUpdateClip={handleUpdateClip}
              onUpdateText={handleUpdateText}
              onDeleteSelected={() => selectedClipId && handleDeleteSelected(selectedClipId)}
            />
          ) : (
            <div className="inspector-content-ai">
              <AiAssistant 
                onAnalyzeCommand={handleAnalyzeCommand}
                onApplyAction={handleApplyAction}
                plannedAction={plannedAction}
                onCancelPlannedAction={() => setPlannedAction(null)}
                onUndoLastEdit={handleUndoLastEdit}
                commandHistory={commandHistory}
                isProcessing={isAiProcessing}
                activeClip={selectedClip || videoClips[0]}
              />
            </div>
          )}
        </aside>
      </div>

      {/* 3. Bottom Timeline */}
      <Timeline 
        videoClips={videoClips}
        audioClips={audioClips}
        textOverlays={textOverlays}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteSelected}
        onUpdateClip={handleUpdateClip}
        onUpdateAudio={handleUpdateAudio}
        onUpdateText={handleUpdateText}
        saveSnapshot={saveSnapshot}
      />

      {/* 4. Export Modal */}
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        projectData={{
          videoClips,
          audioClips,
          textOverlays,
          totalDuration
        }}
      />

      {/* 5. Project Load/Open Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
      />
    </div>
  );
}
