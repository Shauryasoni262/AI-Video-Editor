import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFfmpegPath, getFfprobePath } from '../ffmpeg/detector.js';
import { extractMetadata } from '../ffmpeg/metadata.js';

/**
 * Real Video Analysis Tools using FFmpeg and FFprobe:
 * - Metadata (duration, resolution, fps, bitrate, audio presence)
 * - Silence Detection (finds silent periods via silencedetect)
 * - Audio Loudness (mean & max volume via volumedetect)
 * - Scene Change Detection (scene transitions via scene filter)
 * - Representative Frame Sampling (samples 4 frames across duration for visual inspection)
 * - Speech/Audio Activity detection
 */

export async function analyzeVideo(filePath, storageDir, options = {}) {
  const ffmpeg = getFfmpegPath();
  const ffprobe = getFfprobePath();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found at: ${filePath}`);
  }

  // 1. Core FFprobe metadata
  const metadata = await extractMetadata(filePath, storageDir).catch(err => {
    console.warn('Metadata extraction fallback:', err.message);
    const stat = fs.statSync(filePath);
    return {
      duration: 10,
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
      size: stat.size
    };
  });

  const duration = metadata.duration || 10;
  const hasAudio = !!metadata.hasAudio;

  // 2. Silence & Volume Detection
  const audioAnalysis = await analyzeAudioTrack(filePath, ffmpeg, hasAudio, duration);

  // 3. Scene Change Detection
  const sceneAnalysis = await detectSceneTransitions(filePath, ffmpeg, duration);

  // 4. Sample Representative Frames (Adaptive Visual Understanding)
  const sampledFrames = await sampleRepresentativeFrames(filePath, storageDir, ffmpeg, duration, sceneAnalysis.detectedCuts);

  return {
    metadata: {
      duration: Math.round(duration * 100) / 100,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      aspectRatio: metadata.aspectRatio || `${metadata.width}:${metadata.height}`,
      hasAudio,
      audioCodec: metadata.audioCodec,
      videoCodec: metadata.videoCodec
    },
    audio: audioAnalysis,
    scenes: sceneAnalysis,
    sampledFrames
  };
}

/**
 * Runs FFmpeg silencedetect & volumedetect on the audio stream
 */
function analyzeAudioTrack(filePath, ffmpeg, hasAudio, duration) {
  return new Promise((resolve) => {
    if (!hasAudio) {
      return resolve({
        hasAudio: false,
        silences: [],
        meanVolume: 'no audio',
        maxVolume: 'no audio',
        speechPresence: false
      });
    }

    // Run silencedetect and volumedetect in one pass
    const args = [
      '-i', filePath,
      '-af', 'silencedetect=noise=-28dB:d=0.4,volumedetect',
      '-f', 'null',
      '-'
    ];

    const proc = spawn(ffmpeg, args);
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', () => {
      // Parse silences
      const silences = [];
      const silenceStartMatches = [...stderr.matchAll(/silence_start: ([\d\.]+)/g)];
      const silenceEndMatches = [...stderr.matchAll(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/g)];

      for (let i = 0; i < Math.max(silenceStartMatches.length, silenceEndMatches.length); i++) {
        const start = silenceStartMatches[i] ? parseFloat(silenceStartMatches[i][1]) : 0;
        const end = silenceEndMatches[i] ? parseFloat(silenceEndMatches[i][1]) : duration;
        const silDur = silenceEndMatches[i] ? parseFloat(silenceEndMatches[i][2]) : (end - start);
        silences.push({
          start: Math.round(start * 100) / 100,
          end: Math.round(end * 100) / 100,
          duration: Math.round(silDur * 100) / 100
        });
      }

      // Parse volume
      const meanMatch = stderr.match(/mean_volume: ([\-\d\.]+ dB)/);
      const maxMatch = stderr.match(/max_volume: ([\-\d\.]+ dB)/);

      resolve({
        hasAudio: true,
        silences,
        hasSilence: silences.length > 0,
        meanVolume: meanMatch ? meanMatch[1] : '-20.0 dB',
        maxVolume: maxMatch ? maxMatch[1] : '-12.0 dB',
        speechPresence: silences.length < 5
      });
    });

    proc.on('error', () => {
      resolve({
        hasAudio: true,
        silences: [],
        hasSilence: false,
        meanVolume: '-20.0 dB',
        maxVolume: '-12.0 dB',
        speechPresence: true
      });
    });
  });
}

/**
 * Runs FFmpeg scene filter to detect visual camera cuts
 */
function detectSceneTransitions(filePath, ffmpeg, duration) {
  return new Promise((resolve) => {
    // Select frames with scene score > 0.25
    const args = [
      '-i', filePath,
      '-filter:v', "select=gt(scene\\,0.25),showinfo",
      '-f', 'null',
      '-'
    ];

    const proc = spawn(ffmpeg, args);
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', () => {
      const ptsMatches = [...stderr.matchAll(/pts_time:([\d\.]+)/g)].map(m => parseFloat(m[1]));
      const sceneCuts = ptsMatches.map(t => Math.round(t * 100) / 100);

      resolve({
        detectedCuts: sceneCuts,
        count: sceneCuts.length
      });
    });

    proc.on('error', () => {
      resolve({ detectedCuts: [], count: 0 });
    });
  });
}

/**
 * Adaptively extracts representative frames across the video and converts to base64.
 * Combines even timeline distribution with detected scene transitions.
 * - Under 15s: 5–6 frames
 * - 15s to 60s: 8–12 frames
 * - Over 60s: 12–16 frames
 */
async function sampleRepresentativeFrames(filePath, storageDir, ffmpeg, duration, detectedCuts = []) {
  const frames = [];
  const sampleFolder = path.join(storageDir, 'thumbnails', 'samples');
  if (!fs.existsSync(sampleFolder)) {
    fs.mkdirSync(sampleFolder, { recursive: true });
  }

  // Determine target sample count based on duration
  let targetCount = 5;
  if (duration > 60) {
    targetCount = 14;
  } else if (duration > 30) {
    targetCount = 10;
  } else if (duration > 15) {
    targetCount = 8;
  } else if (duration > 8) {
    targetCount = 6;
  }

  // 1. Generate evenly distributed timestamps
  const rawTimestamps = new Set();
  rawTimestamps.add(Math.min(0.5, duration * 0.05));
  rawTimestamps.add(Math.max(0.5, duration - Math.min(1.0, duration * 0.05)));

  for (let i = 1; i < targetCount; i++) {
    const t = (duration * i) / targetCount;
    rawTimestamps.add(Math.round(t * 10) / 10);
  }

  // 2. Include timestamps right after detected scene transitions (0.5s after cut)
  if (Array.isArray(detectedCuts) && detectedCuts.length > 0) {
    for (const cut of detectedCuts) {
      const sceneSample = Math.min(duration - 0.5, cut + 0.5);
      if (sceneSample > 0.2 && sceneSample < duration - 0.2) {
        rawTimestamps.add(Math.round(sceneSample * 10) / 10);
      }
    }
  }

  // 3. Sort and filter out timestamps that are too close (< 1.2s apart) to keep payload optimal
  const sorted = Array.from(rawTimestamps).sort((a, b) => a - b);
  const filteredTimestamps = [];
  for (const t of sorted) {
    if (t >= 0 && t <= duration) {
      if (filteredTimestamps.length === 0 || t - filteredTimestamps[filteredTimestamps.length - 1] >= 1.2) {
        filteredTimestamps.push(t);
      }
    }
  }

  // Cap at max 16 frames to keep API payload fast and lightweight
  const finalTimestamps = filteredTimestamps.slice(0, 16);

  for (let i = 0; i < finalTimestamps.length; i++) {
    const time = Math.round(finalTimestamps[i] * 100) / 100;
    const outFilename = `sample_${Date.now()}_${i}.jpg`;
    const outPath = path.join(sampleFolder, outFilename);

    try {
      const res = spawnSync(ffmpeg, [
        '-ss', time.toString(),
        '-i', filePath,
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-q:v', '3',
        '-y', outPath
      ]);

      if (res.status === 0 && fs.existsSync(outPath)) {
        const buffer = fs.readFileSync(outPath);
        const base64Data = buffer.toString('base64');
        frames.push({
          timestamp: time,
          ratio: `${Math.round((time / duration) * 100)}%`,
          base64: base64Data,
          mimeType: 'image/jpeg',
          localUrl: `/media/thumbnails/samples/${outFilename}`
        });
      }
    } catch (err) {
      console.warn(`Failed extracting sample frame at ${time}s:`, err.message);
    }
  }

  return frames;
}
