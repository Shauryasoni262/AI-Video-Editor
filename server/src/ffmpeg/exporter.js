import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFfmpegPath } from './detector.js';

export class ExportJob {
  constructor(jobId, projectData, outputPath, options = {}) {
    this.jobId = jobId;
    this.projectData = projectData;
    this.outputPath = outputPath;
    this.preset = options.preset || 'original'; // 'original' | '1080p' | '4k'
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.process = null;
    this.aborted = false;
  }

  cancel() {
    this.aborted = true;
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (e) {}
    }
  }

  async start() {
    const ffmpeg = getFfmpegPath();
    if (!ffmpeg) {
      this.onError(new Error('FFmpeg is not available. Please ensure FFmpeg is installed.'));
      return;
    }

    const { videoClips = [], audioClips = [], textOverlays = [] } = this.projectData;

    if (videoClips.length === 0) {
      this.onError(new Error('Cannot export empty project. Please add at least one video clip.'));
      return;
    }

    // Calculate total timeline duration
    const totalDuration = videoClips.reduce((max, clip) => {
      const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
      const end = (clip.timelineStart || 0) + clipDuration;
      return Math.max(max, end);
    }, 0);

    if (totalDuration <= 0) {
      this.onError(new Error('Project has zero duration.'));
      return;
    }

    // Ensure output directory exists
    const outDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Check if we can do a pure stream copy (Fast zero-loss export)
    const canStreamCopy = (
      videoClips.length === 1 &&
      audioClips.length === 0 &&
      textOverlays.length === 0 &&
      this.preset === 'original' &&
      !hasAnyEffects(videoClips[0]) &&
      (!videoClips[0].speed || videoClips[0].speed === 1) &&
      (videoClips[0].volume === undefined || videoClips[0].volume === 1)
    );

    if (canStreamCopy) {
      return this.executeStreamCopy(ffmpeg, videoClips[0], totalDuration);
    }

    // Otherwise, build full filter graph for multi-clip, effects, audio mixing, text
    return this.executeComplexExport(ffmpeg, videoClips, audioClips, textOverlays, totalDuration);
  }

  executeStreamCopy(ffmpeg, clip, totalDuration) {
    const trimStart = clip.trimStart || 0;
    const duration = (clip.trimEnd || clip.duration) - trimStart;

    const args = [
      '-y',
      '-ss', trimStart.toString(),
      '-i', clip.filePath,
      '-t', duration.toString(),
      '-c', 'copy',
      this.outputPath
    ];

    this.runFfmpegProcess(ffmpeg, args, totalDuration);
  }

  executeComplexExport(ffmpeg, videoClips, audioClips, textOverlays, totalDuration) {
    const args = ['-y'];

    // 1. Add all video clip inputs
    const inputIndices = new Map();
    let currentInputIdx = 0;

    for (const clip of videoClips) {
      if (!inputIndices.has(clip.filePath)) {
        args.push('-i', clip.filePath);
        inputIndices.set(clip.filePath, currentInputIdx++);
      }
    }

    // Add extra audio clip inputs
    for (const audio of audioClips) {
      if (!inputIndices.has(audio.filePath)) {
        args.push('-i', audio.filePath);
        inputIndices.set(audio.filePath, currentInputIdx++);
      }
    }

    // 2. Build Complex Filtergraph
    const filterParts = [];
    const videoSegmentOuts = [];
    const audioSegmentOuts = [];

    // Process each video clip
    videoClips.forEach((clip, index) => {
      const inputIdx = inputIndices.get(clip.filePath);
      const trimStart = clip.trimStart || 0;
      const trimEnd = clip.trimEnd || clip.duration;
      const clipSpeed = clip.speed || 1.0;

      // Video filters for this clip
      let vf = `[${inputIdx}:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS`;

      if (clipSpeed !== 1.0) {
        vf += `,setpts=(1/${clipSpeed})*PTS`;
      }

      // Visual effects
      const fx = clip.effects || {};
      const eqFilters = [];
      if (fx.brightness !== undefined && fx.brightness !== 0) {
        eqFilters.push(`brightness=${fx.brightness}`);
      }
      if (fx.contrast !== undefined && fx.contrast !== 1) {
        eqFilters.push(`contrast=${fx.contrast}`);
      }
      if (fx.saturation !== undefined && fx.saturation !== 1) {
        eqFilters.push(`saturation=${fx.saturation}`);
      }
      if (eqFilters.length > 0) {
        vf += `,eq=${eqFilters.join(':')}`;
      }

      if (fx.grayscale) {
        vf += `,hue=s=0`;
      }

      if (fx.sepia) {
        vf += `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`;
      }

      if (fx.blur && fx.blur > 0) {
        vf += `,gblur=sigma=${Math.min(20, fx.blur * 2)}`;
      }

      if (fx.sharpen && fx.sharpen > 0) {
        vf += `,unsharp=5:5:${fx.sharpen}:5:5:0.0`;
      }

      if (fx.rotate) {
        if (fx.rotate === 90) vf += `,transpose=1`;
        else if (fx.rotate === 180) vf += `,transpose=2,transpose=2`;
        else if (fx.rotate === 270) vf += `,transpose=2`;
      }

      if (fx.flipH) vf += `,hflip`;
      if (fx.flipV) vf += `,vflip`;

      if (fx.zoom && fx.zoom > 1.0) {
        const z = fx.zoom;
        vf += `,scale=iw*${z}:ih*${z},crop=iw/${z}:ih/${z}`;
      }

      // Resolution scaling presets
      if (this.preset === '1080p') {
        vf += `,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      } else if (this.preset === '4k') {
        vf += `,scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      }

      const vOutTag = `v_seg_${index}`;
      filterParts.push(`${vf}[${vOutTag}]`);
      videoSegmentOuts.push(`[${vOutTag}]`);

      // Audio from video clip
      let af = `[${inputIdx}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS`;
      if (clipSpeed !== 1.0) {
        // atempo only accepts 0.5 to 2.0 per filter instance
        af += `,atempo=${clipSpeed}`;
      }
      const clipVol = clip.muteOriginalAudio ? 0 : (clip.volume !== undefined ? clip.volume : 1);
      af += `,volume=${clipVol}`;

      const aOutTag = `a_seg_${index}`;
      filterParts.push(`${af}[${aOutTag}]`);
      audioSegmentOuts.push(`[${aOutTag}]`);
    });

    // Concatenate video clips if multiple
    let mainVideoTag = videoSegmentOuts[0];
    let mainAudioTag = audioSegmentOuts[0];

    if (videoClips.length > 1) {
      const concatV = `${videoSegmentOuts.join('')}concat=n=${videoClips.length}:v=1:a=0[v_concat]`;
      filterParts.push(concatV);
      mainVideoTag = '[v_concat]';

      const concatA = `${audioSegmentOuts.join('')}concat=n=${videoClips.length}:v=0:a=1[a_concat]`;
      filterParts.push(concatA);
      mainAudioTag = '[a_concat]';
    }

    // Apply text overlays if any
    let finalVideoTag = mainVideoTag;
    if (textOverlays.length > 0) {
      let currentV = finalVideoTag;
      textOverlays.forEach((txt, i) => {
        const nextV = `[v_txt_${i}]`;
        const start = txt.startTime || 0;
        const end = txt.endTime || totalDuration;
        const safeText = (txt.text || '').replace(/'/g, '').replace(/:/g, '\\:');
        const size = txt.fontSize || 36;
        const color = txt.color || 'white';
        let xExpr = '(w-text_w)/2';
        let yExpr = 'h-text_h-60';

        if (txt.position === 'top') yExpr = '60';
        else if (txt.position === 'center') yExpr = '(h-text_h)/2';
        else if (txt.x !== undefined && txt.y !== undefined) {
          xExpr = `${txt.x}`;
          yExpr = `${txt.y}`;
        }

        const enableExpr = `between(t\\,${start}\\,${end})`;
        const drawtextFilter = `${currentV}drawtext=text='${safeText}':fontsize=${size}:fontcolor=${color}:x=${xExpr}:y=${yExpr}:enable='${enableExpr}'${nextV}`;
        filterParts.push(drawtextFilter);
        currentV = nextV;
      });
      finalVideoTag = currentV;
    }

    // Mix in extra audio tracks if any
    let finalAudioTag = mainAudioTag;
    if (audioClips.length > 0) {
      const extraAudioTags = [];
      audioClips.forEach((ac, i) => {
        const inputIdx = inputIndices.get(ac.filePath);
        const aStart = ac.trimStart || 0;
        const aDuration = (ac.trimEnd || ac.duration) - aStart;
        const delayMs = Math.round((ac.timelineStart || 0) * 1000);
        const vol = ac.volume !== undefined ? ac.volume : 1;
        let af = `[${inputIdx}:a]atrim=start=${aStart}:duration=${aDuration},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${vol}`;
        if (ac.fadeIn && ac.fadeIn > 0) {
          af += `,afade=t=in:ss=0:d=${ac.fadeIn}`;
        }
        if (ac.fadeOut && ac.fadeOut > 0) {
          af += `,afade=t=out:st=${Math.max(0, aDuration - ac.fadeOut)}:d=${ac.fadeOut}`;
        }
        const tag = `[a_extra_${i}]`;
        filterParts.push(`${af}${tag}`);
        extraAudioTags.push(tag);
      });

      const allAudioInputs = [mainAudioTag, ...extraAudioTags].join('');
      const mixFilter = `${allAudioInputs}amix=inputs=${1 + audioClips.length}:duration=first:dropout_transition=2[a_final]`;
      filterParts.push(mixFilter);
      finalAudioTag = '[a_final]';
    }

    // Assemble full filter_complex
    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', finalVideoTag);
    args.push('-map', finalAudioTag);

    // Encoding parameters - High Quality preservation
    // Use CRF 17-18 for near-visually lossless quality
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '17',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-movflags', '+faststart',
      this.outputPath
    );

    this.runFfmpegProcess(ffmpeg, args, totalDuration);
  }

  runFfmpegProcess(ffmpeg, args, totalDuration) {
    console.log(`Starting FFmpeg export: ${ffmpeg} ${args.join(' ')}`);
    this.process = spawn(ffmpeg, args);

    let stderrBuffer = '';

    this.process.stderr.on('data', (data) => {
      const line = data.toString();
      stderrBuffer += line;

      // Parse FFmpeg progress: time=00:00:05.34
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && totalDuration > 0) {
        const hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        const secs = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + mins * 60 + secs;
        const progress = Math.min(99, Math.round((currentTime / totalDuration) * 100));

        this.onProgress({
          jobId: this.jobId,
          progress,
          currentTime,
          totalDuration,
          status: 'exporting'
        });
      }
    });

    this.process.on('close', (code) => {
      if (this.aborted) {
        return this.onError(new Error('Export was cancelled by user.'));
      }

      if (code === 0 && fs.existsSync(this.outputPath)) {
        const stat = fs.statSync(this.outputPath);
        this.onProgress({
          jobId: this.jobId,
          progress: 100,
          status: 'completed'
        });
        this.onComplete({
          jobId: this.jobId,
          outputPath: this.outputPath,
          fileName: path.basename(this.outputPath),
          fileSize: stat.size
        });
      } else {
        console.error('FFmpeg export failed. Full stderr:', stderrBuffer);
        this.onError(new Error(`FFmpeg export failed with code ${code}. ${stderrBuffer.slice(-300)}`));
      }
    });

    this.process.on('error', (err) => {
      this.onError(err);
    });
  }
}

function hasAnyEffects(clip) {
  if (!clip.effects) return false;
  const fx = clip.effects;
  return (
    (fx.brightness && fx.brightness !== 0) ||
    (fx.contrast && fx.contrast !== 1) ||
    (fx.saturation && fx.saturation !== 1) ||
    fx.grayscale ||
    fx.sepia ||
    (fx.blur && fx.blur > 0) ||
    (fx.sharpen && fx.sharpen > 0) ||
    (fx.rotate && fx.rotate !== 0) ||
    fx.flipH ||
    fx.flipV ||
    (fx.zoom && fx.zoom > 1)
  );
}
