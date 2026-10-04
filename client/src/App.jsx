import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import Properties from './components/Properties';
import AiAssistant from './components/AiAssistant';
import AiSettingsModal from './components/AiSettingsModal';
import ExportModal from './components/ExportModal';
import ProjectModal from './components/ProjectModal';
import { 
  fetchStatus, 
  listMediaApi,
  uploadMediaFile, 
  parseAiCommand,
  requestAiPlan,
  fetchAiSettings,
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

  // Project Framing & Aspect Ratio: '16:9' | '9:16' | '1:1'
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [aiToast, setAiToast] = useState(null);

  // Right Inspector View: 'properties' | 'ai'
  const [rightTab, setRightTab] = useState('properties');

  // AI Command History & Planned Action
  const [commandHistory, setCommandHistory] = useState([]);
  const [plannedAction, setPlannedAction] = useState(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Modals & Settings
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [activeAiProvider, setActiveAiProvider] = useState('local-brain');

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

    fetchAiSettings().then(data => {
      if (data?.provider) {
        setActiveAiProvider(data.provider);
      }
    }).catch(() => {});

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
      textOverlays: JSON.parse(JSON.stringify(textOverlays)),
      aspectRatio
    };
    setUndoStack(prev => [...prev.slice(-20), snapshot]);
    setRedoStack([]);
  }, [videoClips, audioClips, textOverlays, aspectRatio]);

  // Undo Action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const current = {
      videoClips: JSON.parse(JSON.stringify(videoClips)),
      audioClips: JSON.parse(JSON.stringify(audioClips)),
      textOverlays: JSON.parse(JSON.stringify(textOverlays)),
      aspectRatio
    };

    setRedoStack(prev => [...prev, current]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    setVideoClips(previous.videoClips);
    setAudioClips(previous.audioClips);
    setTextOverlays(previous.textOverlays);
    if (previous.aspectRatio) setAspectRatio(previous.aspectRatio);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = {
      videoClips: JSON.parse(JSON.stringify(videoClips)),
      audioClips: JSON.parse(JSON.stringify(audioClips)),
      textOverlays: JSON.parse(JSON.stringify(textOverlays)),
      aspectRatio
    };

    setUndoStack(prev => [...prev, current]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setVideoClips(next.videoClips);
    setAudioClips(next.audioClips);
    setTextOverlays(next.textOverlays);
    if (next.aspectRatio) setAspectRatio(next.aspectRatio);
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

  // 10. AI Brain Engine: Analyze & Plan
  const handleAnalyzeCommand = async (prompt, requireConfirmation = true) => {
    try {
      setIsAiProcessing(true);
      const activeClip = videoClips.find(c => c.id === selectedClipId) || videoClips[0];

      let res = null;
      try {
        // Primary: Real AI Brain with Video Analysis & Multimodal / Heuristic Reasoning
        res = await requestAiPlan(prompt, {
          filePath: activeClip?.filePath || activeClip?.fileName || activeClip?.url,
          activeClip,
          projectContext: {
            totalDuration,
            currentTime,
            clipsCount: videoClips.length
          }
        });
      } catch (brainErr) {
        console.warn('AI Brain request failed, falling back to parser:', brainErr.message);
        // Fallback: Rule-based command parser
        const fallbackRes = await parseAiCommand(prompt, {
          activeClip,
          activeClipId: activeClip?.id,
          currentTime,
          totalDuration
        });
        if (fallbackRes && fallbackRes.success) {
          res = {
            success: true,
            providerUsed: 'fallback-rules',
            plan: {
              summary: fallbackRes.action.description,
              reasoning: 'Generated from local fallback command parser.',
              keep: [],
              remove: [],
              effects: {},
              speed: 1.0,
              legacyAction: fallbackRes.action
            },
            videoAnalysis: null
          };
        }
      }

      if (!res || !res.success) {
        setCommandHistory(prev => [
          ...prev,
          {
            id: `cmd_${Date.now()}`,
            prompt,
            error: res?.error || 'Could not understand command.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            undone: true
          }
        ]);
        return;
      }

      if (res.plan?.isConversational) {
        // Conversational greeting or guidance: append directly to chat without timeline mutation prompt
        setCommandHistory(prev => [
          ...prev,
          {
            id: `cmd_${Date.now()}`,
            prompt,
            friendlyTitle: res.plan.summary || 'AI Video Copilot',
            description: res.plan.reasoning || 'I am ready to help you edit your video.',
            isConversational: true,
            providerUsed: res.providerUsed,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            undone: false
          }
        ]);
        setPlannedAction(null);
        return;
      }

      const planData = {
        prompt,
        plan: res.plan,
        action: res.plan?.legacyAction || null,
        providerUsed: res.providerUsed,
        videoAnalysis: res.videoAnalysis,
        activeClip: activeClip ? { ...activeClip } : null
      };

      if (requireConfirmation) {
        setPlannedAction(planData);
      } else {
        handleApplyAction(planData);
      }
    } catch (err) {
      alert('AI Analysis error: ' + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // 10.1 Execute & Mutate Timeline from AI Edit Plan
  const handleApplyAction = (planData) => {
    const { prompt, plan, action } = planData;
    const activeClip = videoClips.find(c => c.id === selectedClipId) || videoClips[0];

    saveSnapshot();

    // 1. If Real AI Edit Plan
    if (plan && !plan.legacyAction) {
      // 1.1 Update Aspect Ratio if specified in plan (e.g. '9:16', '16:9', '1:1')
      if (plan.aspectRatio && ['16:9', '9:16', '1:1'].includes(plan.aspectRatio)) {
        setAspectRatio(plan.aspectRatio);
      }

      if (activeClip && plan.keep && plan.keep.length > 0) {
        if (plan.keep.length === 1) {
          // Single kept segment
          const seg = plan.keep[0];
          const newStart = Math.max(0, Math.min(activeClip.duration || 9999, seg.start));
          const newEnd = Math.max(newStart + 0.2, Math.min(activeClip.duration || 9999, seg.end));

          handleUpdateClip(activeClip.id, {
            trimStart: Math.round(newStart * 100) / 100,
            trimEnd: Math.round(newEnd * 100) / 100,
            speed: plan.speed || 1,
            effects: { ...activeClip.effects, ...(plan.effects || {}) },
            muteOriginalAudio: !!plan.muteAudio
          });
          setCurrentTime(activeClip.timelineStart || 0);
        } else {
          // Multiple kept segments (e.g. jump-cuts / best moments montage)
          const newClips = [];
          let currentTimelinePos = activeClip.timelineStart || 0;

          for (let i = 0; i < plan.keep.length; i++) {
            const seg = plan.keep[i];
            const start = Math.max(0, Math.min(activeClip.duration || 9999, seg.start));
            const end = Math.max(start + 0.2, Math.min(activeClip.duration || 9999, seg.end));
            const segDur = (end - start) / (plan.speed || 1);

            newClips.push({
              ...activeClip,
              id: i === 0 ? activeClip.id : `clip_${Date.now()}_${i}`,
              name: `${activeClip.name} (Part ${i + 1})`,
              trimStart: Math.round(start * 100) / 100,
              trimEnd: Math.round(end * 100) / 100,
              timelineStart: Math.round(currentTimelinePos * 100) / 100,
              speed: plan.speed || 1,
              effects: { ...activeClip.effects, ...(plan.effects || {}) },
              muteOriginalAudio: !!plan.muteAudio
            });
            currentTimelinePos += segDur;
          }

          setVideoClips(prev => {
            const idx = prev.findIndex(c => c.id === activeClip.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy.splice(idx, 1, ...newClips);
              return copy;
            }
            return newClips;
          });
          setCurrentTime(activeClip.timelineStart || 0);
        }
      }

      // Apply Text Overlay if plan requests it
      if (plan.textOverlay) {
        handleAddTextOverlay(
          plan.textOverlay.text || 'Highlight',
          plan.textOverlay.position || 'bottom',
          plan.textOverlay.fontSize || 40
        );
      } else if (plan.captions) {
        handleAddTextOverlay('Captions / Subtitles', 'bottom', 32);
      }

      setCommandHistory(prev => [
        ...prev,
        {
          id: `cmd_${Date.now()}`,
          prompt,
          friendlyTitle: plan.summary || 'AI Edit Plan Applied',
          description: plan.reasoning || plan.summary,
          plannedChanges: (plan.keep || []).map((k, i) => ({
            label: `Segment ${i + 1} (${k.start}s - ${k.end}s)`,
            from: 'Raw Footage',
            to: k.reason
          })),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          undone: false
        }
      ]);

      const toastMsg = plan.aspectRatio === '9:16'
        ? '✓ Applied: 9:16 Frame + Timeline Updated'
        : `✓ Applied: ${plan.summary || 'AI Edit Plan'}`;
      setAiToast(toastMsg);
      setTimeout(() => setAiToast(null), 4000);

      setPlannedAction(null);
      return;
    }

    // 2. Legacy Fallback Action Handling
    const act = action || plan?.legacyAction;
    if (act) {
      if (act.type === 'SET_ASPECT_RATIO') {
        const ar = act.payload?.aspectRatio || act.payload || '16:9';
        setAspectRatio(ar);
      } else if (act.aspectRatio) {
        setAspectRatio(act.aspectRatio);
      }

      if (act.type === 'TRIM_START' && activeClip) {
        const secs = act.payload.seconds;
        const newStart = Math.min(activeClip.trimEnd - 0.5, activeClip.trimStart + secs);
        handleUpdateClip(activeClip.id, { trimStart: Math.round(newStart * 100) / 100 });
      } else if (act.type === 'TRIM_END' && activeClip) {
        const secs = act.payload.seconds;
        const newEnd = Math.max(activeClip.trimStart + 0.5, activeClip.trimEnd - secs);
        handleUpdateClip(activeClip.id, { trimEnd: Math.round(newEnd * 100) / 100 });
      } else if (act.type === 'SET_DURATION' && activeClip) {
        const dur = act.payload.duration;
        const maxSource = activeClip.duration || 9999;
        const newEnd = Math.min(maxSource, activeClip.trimStart + dur);
        handleUpdateClip(activeClip.id, { trimEnd: Math.round(newEnd * 100) / 100 });
      } else if (act.type === 'SET_SPEED' && activeClip) {
        handleUpdateClip(activeClip.id, { speed: act.payload.speed });
      } else if (act.type === 'SET_EFFECT' && activeClip) {
        const { effect, value } = act.payload;
        handleUpdateClip(activeClip.id, { effects: { ...activeClip.effects, [effect]: value } });
      } else if (act.type === 'CLEAR_EFFECTS' && activeClip) {
        handleApplyEffectPreset('normal');
      } else if (act.type === 'MUTE_AUDIO' && activeClip) {
        handleUpdateClip(activeClip.id, { muteOriginalAudio: true, volume: 0 });
      } else if (act.type === 'SPLIT') {
        handleSplitClip(act.payload.time);
      } else if (act.type === 'SPLIT_AT_PLAYHEAD') {
        handleSplitClip(currentTime);
      } else if (act.type === 'ADD_TEXT') {
        handleAddTextOverlay(act.payload.text, act.payload.position || 'bottom', act.payload.fontSize || 40);
      }

      setCommandHistory(prev => [
        ...prev,
        {
          id: `cmd_${Date.now()}`,
          prompt,
          actionType: act.type,
          friendlyTitle: act.description,
          description: act.description,
          plannedChanges: act.plannedChanges || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          undone: false
        }
      ]);

      const toastMsg = `✓ Applied: ${act.description || 'Action Executed'}`;
      setAiToast(toastMsg);
      setTimeout(() => setAiToast(null), 4000);

      setPlannedAction(null);
    }
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
        aspectRatio,
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
    if (proj.aspectRatio) setAspectRatio(proj.aspectRatio);
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
    setAspectRatio('16:9');
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
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
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
                onClearHistory={() => setCommandHistory([])}
                onOpenSettings={() => setIsAiSettingsOpen(true)}
                activeProvider={activeAiProvider}
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
          totalDuration,
          aspectRatio
        }}
      />

      {/* 5. Project Load/Open Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
      />

      {/* 6. AI Brain & Provider Settings Modal */}
      <AiSettingsModal 
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
        onSettingsUpdated={(settings) => setActiveAiProvider(settings?.provider || 'local-brain')}
      />

      {/* 7. AI Success Toast Notification Banner */}
      {aiToast && (
        <div className="ai-toast-banner" role="status">
          <span>✨</span>
          <span>{aiToast}</span>
        </div>
      )}
    </div>
  );
}
