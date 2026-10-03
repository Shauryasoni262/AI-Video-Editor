const API_BASE = 'http://localhost:5001';

export async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return await res.json();
  } catch (err) {
    console.warn('API status error:', err);
    return { status: 'error', ffmpeg: { available: false, version: 'None' } };
  }
}

export async function listMediaApi() {
  try {
    const res = await fetch(`${API_BASE}/api/media`);
    if (!res.ok) return [];
    const list = await res.json();
    return list.map(item => ({
      ...item,
      url: item.url.startsWith('/') ? `${API_BASE}${item.url}` : item.url,
      metadata: {
        ...item.metadata,
        thumbnailUrl: item.metadata?.thumbnailUrl?.startsWith('/') ? `${API_BASE}${item.metadata.thumbnailUrl}` : item.metadata?.thumbnailUrl
      }
    }));
  } catch (e) {
    console.warn('Failed listing media:', e);
    return [];
  }
}

export async function uploadMediaFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload media file');
  }

  const data = await res.json();
  // Ensure full URL for preview
  if (data.url && data.url.startsWith('/')) {
    data.url = `${API_BASE}${data.url}`;
  }
  if (data.metadata?.thumbnailUrl && data.metadata.thumbnailUrl.startsWith('/')) {
    data.metadata.thumbnailUrl = `${API_BASE}${data.metadata.thumbnailUrl}`;
  }
  return data;
}

export async function parseAiCommand(prompt, context) {
  const res = await fetch(`${API_BASE}/api/ai/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI command parsing failed');
  }

  return await res.json();
}

export async function startExport(projectData, preset = 'original', customFilename) {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectData, preset, customFilename })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initiate video export');
  }

  return await res.json();
}

export async function getExportStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/export/status/${jobId}`);
  if (!res.ok) {
    throw new Error('Failed to query export status');
  }
  const data = await res.json();
  if (data.result?.downloadUrl && data.result.downloadUrl.startsWith('/')) {
    data.result.downloadUrl = `${API_BASE}${data.result.downloadUrl}`;
  }
  return data;
}

export async function cancelExportJob(jobId) {
  const res = await fetch(`${API_BASE}/api/export/cancel/${jobId}`, {
    method: 'POST'
  });
  return await res.json();
}

export async function saveProjectApi(project) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  return await res.json();
}

export async function listProjectsApi() {
  const res = await fetch(`${API_BASE}/api/projects`);
  return await res.json();
}

export async function loadProjectApi(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  return await res.json();
}

export { API_BASE };
