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
  Sparkles,
  Play,
  Square,
  Volume2,
  Image as ImageIcon
} from 'lucide-react';
import { formatDuration, formatFileSize } from '../utils/timeUtils';

export default function Sidebar({
  mediaFiles,
  sfxList = [],
  onUploadFile,
  isUploading,
  onAddVideoToTimeline,
  onAddAudioToTimeline,
  onAddSfxToTimeline,
  onAddTextOverlay,
  onApplyEffectPreset
}) {
  const [activeTab, setActiveTab] = useState('media');
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'videos' | 'images'
  const [playingSfxId, setPlayingSfxId] = useState(null);
  const audioPreviewRef = useRef(null);

  const handleTogglePlaySfx = (e, sfx) => {
    e.stopPropagation();
    if (playingSfxId === sfx.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }
      setPlayingSfxId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(sfx.url);
      audioPreviewRef.current = audio;
      audio.play().catch(() => {});
      setPlayingSfxId(sfx.id);
      audio.onended = () => setPlayingSfxId(null);
    }
  };
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
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
  const imageFiles = mediaFiles.filter(m => m.type === 'image' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(m.originalName || m.url));

  const visualFiles = mediaFiles.filter(m => {
    const isImg = m.type === 'image' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(m.originalName || m.url);
    const isVid = m.type === 'video';
    if (mediaFilter === 'videos') return isVid;
    if (mediaFilter === 'images') return isImg;
    return isVid || isImg;
  });

  return (
    <aside className="sidebar-container">
      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
          title="All Media"
        >
          <Film size={17} />
          <span>Media</span>
        </button>
        <button 
          className={`sidebar-tab-btn ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
          title="Photos & Graphics"
        >
          <ImageIcon size={17} />
          <span>Images</span>
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
        {/* ================= MEDIA TAB (VIDEOS & IMAGES) ================= */}
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
                accept="video/*,audio/*,image/*,.mp4,.mov,.mkv,.webm,.avi,.jpg,.jpeg,.png,.webp,.gif,.bmp" 
                multiple 
                style={{ display: 'none' }} 
              />
              <Upload className="dropzone-icon" />
              <div className="dropzone-title">
                {isUploading ? 'Importing media...' : 'Import Videos & Images'}
              </div>
              <div className="dropzone-hint">
                Drag & drop or click (MP4, MOV, PNG, JPG, WebM)
              </div>
            </div>

            {/* Filter pills: All, Videos, Images */}
            <div className="media-filter-bar">
              <button 
                type="button" 
                className={`filter-pill ${mediaFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMediaFilter('all')}
              >
                All ({videoFiles.length + imageFiles.length})
              </button>
              <button 
                type="button" 
                className={`filter-pill ${mediaFilter === 'videos' ? 'active' : ''}`}
                onClick={() => setMediaFilter('videos')}
              >
                Videos ({videoFiles.length})
              </button>
              <button 
                type="button" 
                className={`filter-pill ${mediaFilter === 'images' ? 'active' : ''}`}
                onClick={() => setMediaFilter('images')}
              >
                Images ({imageFiles.length})
              </button>
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Project Media ({visualFiles.length})
            </div>

            <div className="media-list">
              {visualFiles.map(media => {
                const isImg = media.type === 'image' || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(media.originalName || media.url);
                return (
                  <div 
                    key={media.id} 
                    className="media-card"
                    onClick={() => onAddVideoToTimeline(media)}
                    title={`Click to add ${media.originalName} to timeline`}
                  >
                    <div className="media-card-thumb">
                      {media.metadata?.thumbnailUrl || isImg ? (
                        <img 
                          src={media.metadata?.thumbnailUrl || media.url} 
                          alt={media.originalName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <FileVideo size={32} />
                      )}
                      <span className={`media-duration-badge ${isImg ? 'image-badge' : ''}`}>
                        {isImg ? 'Photo (5s)' : formatDuration(media.metadata?.duration || 0)}
                      </span>
                    </div>
                    <div className="media-card-body">
                      <div className="media-card-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isImg && <ImageIcon size={12} style={{ color: '#ec4899', flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {media.originalName}
                        </span>
                      </div>
                      <div className="media-card-meta">
                        {media.metadata?.width 
                          ? `${media.metadata.width}x${media.metadata.height} • ${isImg ? 'Photo' : `${media.metadata.fps}fps`}` 
                          : formatFileSize(media.fileSize)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {visualFiles.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No {mediaFilter === 'images' ? 'images' : mediaFilter === 'videos' ? 'videos' : 'media'} imported yet. Drop a file above to start!
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= DEDICATED IMAGES TAB ================= */}
        {activeTab === 'images' && (
          <>
            <div 
              className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
              onClick={() => imageInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleFileInput} 
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg" 
                multiple 
                style={{ display: 'none' }} 
              />
              <ImageIcon className="dropzone-icon" style={{ color: '#ec4899' }} />
              <div className="dropzone-title">
                {isUploading ? 'Importing images...' : 'Import Photos & Images'}
              </div>
              <div className="dropzone-hint">
                PNG, JPG, JPEG, WEBP, GIF, SVG
              </div>
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Imported Images ({imageFiles.length})
            </div>

            <div className="media-list">
              {imageFiles.map(media => (
                <div 
                  key={media.id} 
                  className="media-card"
                  onClick={() => onAddVideoToTimeline(media)}
                  title={`Click to add ${media.originalName} to timeline`}
                >
                  <div className="media-card-thumb">
                    <img 
                      src={media.metadata?.thumbnailUrl || media.url} 
                      alt={media.originalName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <span className="media-duration-badge image-badge">
                      Photo (5s)
                    </span>
                  </div>
                  <div className="media-card-body">
                    <div className="media-card-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ImageIcon size={12} style={{ color: '#ec4899', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {media.originalName}
                      </span>
                    </div>
                    <div className="media-card-meta">
                      {media.metadata?.width ? `${media.metadata.width}x${media.metadata.height} • Photo` : formatFileSize(media.fileSize)}
                    </div>
                  </div>
                </div>
              ))}
              {imageFiles.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No photos imported yet. Click above to import images into your project!
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
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No custom audio tracks imported yet.
                </div>
              )}
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginTop: '18px' }}>
              Built-in Sound Effects ({sfxList.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sfxList.map(sfx => (
                <div 
                  key={sfx.id} 
                  className="sfx-item-card"
                >
                  <button 
                    type="button"
                    className="sfx-play-btn"
                    onClick={(e) => handleTogglePlaySfx(e, sfx)}
                    title={playingSfxId === sfx.id ? "Stop preview" : "Play preview"}
                  >
                    {playingSfxId === sfx.id ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sfx.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      {sfx.duration}s • {sfx.category || 'SFX'}
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-ghost" 
                    style={{ padding: '3px 8px', fontSize: '11px', height: '24px', borderRadius: '4px' }}
                    onClick={() => onAddSfxToTimeline(sfx)}
                    title="Add sound effect to timeline"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>
              ))}
              {sfxList.length === 0 && (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                  Loading sound effects...
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= TEXT TAB ================= */}
        {activeTab === 'text' && (
          <>
            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
              Text Overlays & Titles
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onAddTextOverlay('Title Text', 'center', 46, 'pop')}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Pop Title</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Subtitle / Caption', 'bottom', 32, 'fade')}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Fade Subtitle</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Top Headline', 'top', 38, 'slide-up')}>
                <Type className="preset-icon" size={24} />
                <div className="preset-label">Slide-up Banner</div>
              </div>
              <div className="preset-card" onClick={() => onAddTextOverlay('Watermark', 'bottom', 22, 'none')}>
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
              Stylized Looks & Cinema Grades
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onApplyEffectPreset('normal')}>
                <div className="preset-label">Reset / Normal</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('vignette')}>
                <div className="preset-label">Vignette Shadow</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('warm')}>
                <div className="preset-label">Warm Golden Hour</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('cool')}>
                <div className="preset-label">Cyberpunk Teal</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('filmGrain')}>
                <div className="preset-label">35mm Film Grain</div>
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
              <div className="preset-card" onClick={() => onApplyEffectPreset('invert')}>
                <div className="preset-label">Invert / Thermal</div>
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
              Motion & Camera Animations
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onApplyEffectPreset('kenBurns')}>
                <div className="preset-label">Ken Burns (In)</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('zoomOut')}>
                <div className="preset-label">Ken Burns (Out)</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('panRight')}>
                <div className="preset-label">Slow Pan Right</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('pulse')}>
                <div className="preset-label">Pulse Motion</div>
              </div>
            </div>

            <div className="section-title" style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginTop: '16px' }}>
              Fade Transitions
            </div>
            <div className="preset-grid">
              <div className="preset-card" onClick={() => onApplyEffectPreset('fadeIn')}>
                <div className="preset-label">Fade In (Start)</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('fadeOut')}>
                <div className="preset-label">Fade Out (End)</div>
              </div>
              <div className="preset-card" onClick={() => onApplyEffectPreset('fadeInOut')}>
                <div className="preset-label">Fade In & Out</div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
