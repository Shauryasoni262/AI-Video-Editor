import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Download, 
  AlertCircle, 
  Film, 
  Loader2, 
  Cpu, 
  HardDrive 
} from 'lucide-react';
import { startExport, getExportStatus, cancelExportJob } from '../utils/api';

export default function ExportModal({
  isOpen,
  onClose,
  projectData,
  projectName
}) {
  const [preset, setPreset] = useState('original');
  const [customFilename, setCustomFilename] = useState(`${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_render.mp4`);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [jobId, setJobId] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Start the export process
  const handleStartExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      setStatusText('Initializing FFmpeg process...');
      setErrorMessage('');
      setExportResult(null);

      const resp = await startExport(projectData, preset, customFilename);
      setJobId(resp.jobId);
    } catch (err) {
      setIsExporting(false);
      setErrorMessage(err.message || 'Failed to initiate export');
    }
  };

  // Poll status while job is active
  useEffect(() => {
    let timer;
    if (isExporting && jobId) {
      timer = setInterval(async () => {
        try {
          const status = await getExportStatus(jobId);
          if (status.status === 'exporting') {
            setProgress(status.progress);
            setStatusText(`Rendering frames: ${status.progress}%`);
          } else if (status.status === 'completed') {
            setProgress(100);
            setStatusText('Export finished successfully!');
            setIsExporting(false);
            setExportResult(status.result);
            clearInterval(timer);
          } else if (status.status === 'error') {
            setIsExporting(false);
            setErrorMessage(status.error || 'FFmpeg process failed.');
            clearInterval(timer);
          }
        } catch (e) {
          console.warn('Status poll warning:', e);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExporting, jobId]);

  const handleCancel = async () => {
    if (jobId) {
      await cancelExportJob(jobId).catch(() => {});
    }
    setIsExporting(false);
    setStatusText('Cancelled by user');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={!isExporting ? onClose : undefined}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Film size={18} style={{ color: 'var(--accent-emerald)' }} />
            <span>Export Video (FFmpeg Local)</span>
          </div>
          {!isExporting && (
            <button className="btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Preset Selector */}
          <div>
            <label className="property-label" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Quality Preset
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                className={`export-preset-card ${preset === 'original' ? 'selected' : ''}`}
                onClick={() => !isExporting && setPreset('original')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                    Original Source Quality (Master)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Preserves original resolution & FPS. Uses fast stream-copy if no filters applied, or visually lossless CRF 17.
                  </div>
                </div>
                {preset === 'original' && <Check size={18} style={{ color: 'var(--primary)' }} />}
              </div>

              <div 
                className={`export-preset-card ${preset === '1080p' ? 'selected' : ''}`}
                onClick={() => !isExporting && setPreset('1080p')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                    1080p Full HD (High Quality)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    1920x1080, high bitrate H.264 + 320k AAC audio. Ideal for YouTube and sharing.
                  </div>
                </div>
                {preset === '1080p' && <Check size={18} style={{ color: 'var(--primary)' }} />}
              </div>

              <div 
                className={`export-preset-card ${preset === '4k' ? 'selected' : ''}`}
                onClick={() => !isExporting && setPreset('4k')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                    4K Ultra HD (High Quality)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    3840x2160, maximum clarity and bitrate.
                  </div>
                </div>
                {preset === '4k' && <Check size={18} style={{ color: 'var(--primary)' }} />}
              </div>
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label className="property-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Output File Name
            </label>
            <input 
              type="text" 
              className="project-title-input" 
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              value={customFilename} 
              disabled={isExporting}
              onChange={(e) => setCustomFilename(e.target.value)} 
            />
          </div>

          {/* Progress Section */}
          {isExporting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                  <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  {statusText}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{progress}%</span>
              </div>
              <div className="export-progress-bar-bg">
                <div className="export-progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', fontSize: '12px', background: 'rgba(244,63,94,0.1)', padding: '10px', borderRadius: '6px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Completion Success */}
          {exportResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '13px' }}>
                <Check size={16} />
                <span>Export Completed Successfully!</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Render saved locally: <strong>{exportResult.outputPath}</strong>
              </div>
              <a 
                href={exportResult.downloadUrl} 
                download={exportResult.fileName}
                className="btn btn-export" 
                style={{ alignSelf: 'flex-start', textDecoration: 'none', marginTop: '4px' }}
              >
                <Download size={14} />
                <span>Download {exportResult.fileName}</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {isExporting ? (
            <button className="btn btn-ghost" onClick={handleCancel}>
              Cancel Export
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
              <button className="btn btn-export" onClick={handleStartExport}>
                <Film size={15} />
                <span>Start Export</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
