import React, { useState, useRef } from 'react';
import { 
  Film, 
  Music, 
  Type, 
  Wand2, 
  Layers, 
  Upload, 
  Plus, 
  Clock, 
  FileVideo, 
  FileAudio,
  Sparkles
} from 'lucide-react';
import { formatDuration, formatFileSize } from '../utils/timeUtils';

export default function Sidebar({
  mediaFiles,
  onUploadFile,
  isUploading,
  onAddVideoToTimeline,
  onAddAudioToTimeline,
  onAddTextOverlay,
  onApplyEffectPreset
}) {
  const [activeTab, setActiveTab] = useState('media');
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => onUploadFile(file));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => onUploadFile(file));
      e.target.value = '';
    }
  };

  const videoFiles = mediaFiles.filter(m => m.type === 'video');
  const audioFiles = mediaFiles.filter(m => m.type === 'audio');

  return (
    <aside className="sidebar-container">
      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
          title="Video Media"
        >
          <Film size={17} />
          <span>Media</span>
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
          title="Audio Tracks"
        >
          <Music size={17} />
          <span>Audio</span>
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
          title="Text & Titles"
        >
          <Type size={17} />
          <span>Text</span>
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'effects' ? 'active' : ''}`}
          onClick={() => setActiveTab('effects')}
          title="Effects & Looks"
        >
          <Wand2 size={17} />
          <span>Effects</span>
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'transitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transitions')}
          title="Transitions"
        >
          <Layers size={17} />
          <span>Transitions</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="sidebar-content">
        {/* ================= MEDIA TAB ================= */}
        {activeTab === 'media' && (
          <>
            <div 
              className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInput} 
                accept="video/*,audio/*,.mp4,.mov,.mkv,.webm,.avi" 
                multiple 
                style={{ display: 'none' }} 
              />
              <Upload className="dropzone-icon" />
              <div className="dropzone-title">
                {isUploading ? 'Importing media...' : 'Import Videos & Audio'}
              </div>
              <div className="dropzone-hint">
                Drag & drop or click (MP4, MOV, MKV, WebM)
              </div>
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Project Media ({videoFiles.length})
            </div>

            <div className="media-list">
              {videoFiles.map(media => (
                <div 
                  key={media.id} 
                  className="media-card"
                  onClick={() => onAddVideoToTimeline(media)}
                  title={`Click to add ${media.originalName} to timeline`}
                >
                  <div className="media-card-thumb">
                    {media.metadata?.thumbnailUrl ? (
                      <img src={media.metadata.thumbnailUrl} alt={media.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FileVideo size={32} />
                    )}
                    <span className="media-duration-badge">
                      {formatDuration(media.metadata?.duration || 0)}
                    </span>
                  </div>
                  <div className="media-card-body">
                    <div className="media-card-name">{media.originalName}</div>
                    <div className="media-card-meta">
                      {media.metadata?.width ? `${media.metadata.width}x${media.metadata.height} • ${media.metadata.fps}fps` : formatFileSize(media.fileSize)}
                    </div>
                  </div>
                </div>
              ))}
              {videoFiles.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No videos imported yet. Drop a file above to start!
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= AUDIO TAB ================= */}
        {activeTab === 'audio' && (
          <>
            <div 
              className="dropzone"
              onClick={() => audioInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={audioInputRef} 
                onChange={handleFileInput} 
                accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a" 
                multiple 
                style={{ display: 'none' }} 
              />
              <Music className="dropzone-icon" />
              <div className="dropzone-title">Import Audio & Songs</div>
              <div className="dropzone-hint">MP3, WAV, AAC, M4A, OGG</div>
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Audio Tracks ({audioFiles.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {audioFiles.map(media => (
                <div 
                  key={media.id} 
                  className="media-card"
                  style={{ flexDirection: 'row', alignItems: 'center', padding: '8px 12px' }}
                  onClick={() => onAddAudioToTimeline(media)}
                >
                  <FileAudio size={24} style={{ color: 'var(--accent-emerald)', marginRight: '10px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="media-card-name">{media.originalName}</div>
                    <div className="media-card-meta">{formatDuration(media.metadata?.duration || 0)} • {formatFileSize(media.fileSize)}</div>
                  </div>
                  <button className="btn-icon" title="Add to timeline">
                    <Plus size={16} />
                  </button>
                </div>
              ))}
              {audioFiles.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No audio tracks imported yet.
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= TEXT TAB ================= */}
        {activeTab === 'text' && (
          <>
            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Text Overlays
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onAddTextOverlay('Title Text', 'center', 46)}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Center Title</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Subtitle / Caption', 'bottom', 32)}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Bottom Subtitle</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Top Headline', 'top', 38)}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Top Banner</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Watermark', 'bottom', 22)}>
                <Sparkles className="preset-icon" size={24} />
                <div className="preset-label">Watermark</div>
              </div>
            </div>
          </>
        )}

        {/* ================= EFFECTS TAB ================= */}
        {activeTab === 'effects' && (
          <>
            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Color Looks & Styles
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onApplyEffectPreset('normal')}>
                <div className="preset-label">Reset / Normal</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('grayscale')}>
                <div className="preset-label">B&W Noir</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('sepia')}>
                <div className="preset-label">Vintage Sepia</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('vibrant')}>
                <div className="preset-label">Punchy Vibrant</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('cinematic')}>
                <div className="preset-label">Cinematic Mood</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('sharpen')}>
                <div className="preset-label">Ultra Crisp</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('blur')}>
                <div className="preset-label">Dreamy Blur</div>
              </div>
            </div>
          </>
        )}

        {/* ================= TRANSITIONS TAB ================= */}
        {activeTab === 'transitions' && (
          <>
            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Transitions & Fades
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onApplyEffectPreset('fadeIn')}>
                <div className="preset-label">Fade In (1s)</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('fadeOut')}>
                <div className="preset-label">Fade Out (1s)</div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
