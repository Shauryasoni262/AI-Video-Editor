import React from 'react';
import { 
  Film, 
  Undo2, 
  Redo2, 
  Save, 
  Download, 
  FolderOpen, 
  Plus, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Header({
  projectName,
  setProjectName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onNewProject,
  onOpenProjects,
  onExport,
  ffmpegStatus
}) {
  return (
    <header className="editor-header">
      <div className="header-left">
        <div className="app-brand">
          <div className="brand-icon">
            <Film size={16} />
          </div>
          <span>Antigravity Video Editor</span>
        </div>

        <input 
          type="text" 
          className="project-title-input" 
          value={projectName} 
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Untitled Project"
          title="Click to rename project"
        />

        <div className="btn-icon-group">
          <button 
            className="btn-icon" 
            onClick={onNewProject} 
            title="New Project"
          >
            <Plus size={16} />
          </button>
          <button 
            className="btn-icon" 
            onClick={onOpenProjects} 
            title="Open Project"
          >
            <FolderOpen size={15} />
          </button>
        </div>
      </div>

      <div className="header-center">
        <div className="btn-icon-group">
          <button 
            className="btn-icon" 
            disabled={!canUndo} 
            onClick={onUndo} 
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button 
            className="btn-icon" 
            disabled={!canRedo} 
            onClick={onRedo} 
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* System FFmpeg health status */}
        <div 
          className="status-badge" 
          title={ffmpegStatus?.available 
            ? `FFmpeg ${ffmpegStatus.version} (Local Hardware Process)` 
            : 'FFmpeg not detected'}
        >
          <span className={`status-dot ${ffmpegStatus?.available ? 'online' : 'offline'}`} />
          <span>{ffmpegStatus?.available ? `FFmpeg Ready` : 'FFmpeg Offline'}</span>
        </div>

        <button className="btn btn-ghost" onClick={onSave} title="Save Project to Disk">
          <Save size={15} />
          <span>Save</span>
        </button>

        <button className="btn btn-export" onClick={onExport} title="Render and Export Video with FFmpeg">
          <Download size={15} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
