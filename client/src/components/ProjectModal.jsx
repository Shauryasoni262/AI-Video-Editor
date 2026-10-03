import React, { useState, useEffect } from 'react';
import { FolderOpen, X, Clock, Film, Plus } from 'lucide-react';
import { listProjectsApi, loadProjectApi } from '../utils/api';
import { formatDuration } from '../utils/timeUtils';

export default function ProjectModal({
  isOpen,
  onClose,
  onLoadProject,
  onNewProject
}) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const list = await listProjectsApi();
      setProjects(list);
    } catch (e) {
      console.warn('Failed to load projects list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async (id) => {
    try {
      const proj = await loadProjectApi(id);
      onLoadProject(proj);
      onClose();
    } catch (err) {
      alert('Could not open project: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
            <span>Open Saved Project</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)' }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: '13px' }}>
              No saved projects found on local disk.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.map(p => (
                <div 
                  key={p.id} 
                  className="export-preset-card"
                  onClick={() => handleOpen(p.id)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                      <span>{p.clipsCount} clips</span>
                      <span>•</span>
                      <span>{new Date(p.updatedAt).toLocaleDateString()} {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => { onNewProject(); onClose(); }}
          >
            <Plus size={14} />
            <span>Start Fresh Project</span>
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
