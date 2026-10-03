import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFfprobePath, getFfmpegPath } from './detector.js';

export async function extractMetadata(filePath, storageDir) {
  return new Promise((resolve, reject) => {
    const ffprobe = getFfprobePath();
    const ffmpeg = getFfmpegPath();

    if (!ffprobe && !ffmpeg) {
      return reject(new Error('Neither FFprobe nor FFmpeg is available on the system.'));
    }

    // Try ffprobe first for rich json output
    if (ffprobe) {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const proc = spawn(ffprobe, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', async (code) => {
        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout);
            const videoStream = data.streams?.find((s) => s.codec_type === 'video');
            const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

            // Calculate FPS
            let fps = 30;
            if (videoStream?.r_frame_rate) {
              const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
              if (den && den > 0) {
                fps = Math.round((num / den) * 100) / 100;
              }
            }

            const duration = parseFloat(data.format?.duration || videoStream?.duration || audioStream?.duration || 0);

            // Generate thumbnail if video
            let thumbnailPath = null;
            if (videoStream && ffmpeg) {
              const thumbFilename = `thumb_${path.parse(filePath).name}.jpg`;
              const thumbFullPath = path.join(storageDir, 'thumbnails', thumbFilename);
              try {
                fs.mkdirSync(path.join(storageDir, 'thumbnails'), { recursive: true });
                const thumbTime = Math.min(1.0, duration > 0 ? duration / 2 : 0);
                await generateThumbnail(ffmpeg, filePath, thumbFullPath, thumbTime);
                thumbnailPath = `/media/thumbnails/${thumbFilename}`;
              } catch (e) {
                console.warn('Could not generate thumbnail:', e.message);
              }
            }

            return resolve({
              format: data.format?.format_name || 'unknown',
              duration,
              size: parseInt(data.format?.size || 0, 10),
              bitrate: parseInt(data.format?.bit_rate || 0, 10),
              width: videoStream?.width || null,
              height: videoStream?.height || null,
              aspectRatio: videoStream?.display_aspect_ratio || (videoStream?.width ? `${videoStream.width}:${videoStream.height}` : null),
              fps,
              videoCodec: videoStream?.codec_name || null,
              hasAudio: !!audioStream,
              audioCodec: audioStream?.codec_name || null,
              audioChannels: audioStream?.channels || null,
              audioSampleRate: audioStream?.sample_rate || null,
              thumbnailUrl: thumbnailPath
            });
          } catch (err) {
            console.error('Failed to parse ffprobe json:', err);
          }
        }

        // Fallback to ffmpeg -i parsing if ffprobe json failed
        fallbackFfmpegInfo(ffmpeg, filePath, storageDir, resolve, reject);
      });

      proc.on('error', (err) => {
        fallbackFfmpegInfo(ffmpeg, filePath, storageDir, resolve, reject);
      });
    } else {
      fallbackFfmpegInfo(ffmpeg, filePath, storageDir, resolve, reject);
    }
  });
}

function fallbackFfmpegInfo(ffmpeg, filePath, storageDir, resolve, reject) {
  if (!ffmpeg) return reject(new Error('FFmpeg binary not found.'));

  const proc = spawn(ffmpeg, ['-i', filePath]);
  let output = '';

  proc.stderr.on('data', (d) => { output += d.toString(); });
  proc.stdout.on('data', (d) => { output += d.toString(); });

  proc.on('close', async () => {
    // Parse duration: Duration: 00:01:23.45
    const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    let duration = 0;
    if (durationMatch) {
      const hours = parseInt(durationMatch[1], 10);
      const mins = parseInt(durationMatch[2], 10);
      const secs = parseFloat(durationMatch[3]);
      duration = hours * 3600 + mins * 60 + secs;
    }

    // Parse video stream: Stream #0:0: Video: h264, yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 29.97 fps
    const resMatch = output.match(/Video:.*?(\d{3,5})x(\d{3,5})/);
    const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
    const hasAudio = /Audio:/.test(output);

    let thumbnailPath = null;
    if (resMatch) {
      const thumbFilename = `thumb_${path.parse(filePath).name}.jpg`;
      const thumbFullPath = path.join(storageDir, 'thumbnails', thumbFilename);
      try {
        fs.mkdirSync(path.join(storageDir, 'thumbnails'), { recursive: true });
        await generateThumbnail(ffmpeg, filePath, thumbFullPath, Math.min(1.0, duration / 2));
        thumbnailPath = `/media/thumbnails/${thumbFilename}`;
      } catch (e) {}
    }

    resolve({
      format: path.extname(filePath).replace('.', ''),
      duration,
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      width: resMatch ? parseInt(resMatch[1], 10) : null,
      height: resMatch ? parseInt(resMatch[2], 10) : null,
      fps: fpsMatch ? parseFloat(fpsMatch[1]) : 30,
      hasAudio,
      thumbnailUrl: thumbnailPath
    });
  });
}

function generateThumbnail(ffmpeg, filePath, outPath, timeSec = 1.0) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-ss', timeSec.toString(),
      '-i', filePath,
      '-vframes', '1',
      '-q:v', '3',
      '-vf', 'scale=320:-1',
      outPath
    ];

    const p = spawn(ffmpeg, args);
    p.on('close', (code) => {
      if (code === 0 && fs.existsSync(outPath)) {
        resolve(outPath);
      } else {
        reject(new Error(`Thumbnail generation failed with code ${code}`));
      }
    });
    p.on('error', reject);
  });
}
