/**
 * Formats seconds into HH:MM:SS:FF (SMPTE style)
 */
export function formatTimecode(seconds, fps = 30) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * fps);

  const pad = (num, size = 2) => String(num).padStart(size, '0');

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
  }
  return `${pad(m)}:${pad(s)}:${pad(frames)}`;
}

/**
 * Formats seconds into clean MM:SS format
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Formats bytes to MB/GB
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}
