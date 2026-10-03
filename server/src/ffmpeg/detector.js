import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

let cachedFfmpegPath = null;
let cachedFfprobePath = null;
let cachedInfo = null;

function findInCommonWindowsPaths(binaryName) {
  const exeName = binaryName.endsWith('.exe') ? binaryName : `${binaryName}.exe`;
  const candidates = [
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages'),
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', exeName),
    `C:\\ffmpeg\\bin\\${exeName}`,
    `C:\\Program Files\\ffmpeg\\bin\\${exeName}`,
    `C:\\Program Files (x86)\\ffmpeg\\bin\\${exeName}`,
    path.join(os.homedir(), 'scoop', 'shims', exeName),
    path.join(os.homedir(), 'scoop', 'apps', 'ffmpeg', 'current', 'bin', exeName),
    `C:\\ProgramData\\chocolatey\\bin\\${exeName}`,
  ];

  for (const candidate of candidates) {
    try {
      if (candidate.endsWith('.exe') && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (e) {}
  }

  const wingetPkgDir = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wingetPkgDir)) {
    try {
      const dirs = fs.readdirSync(wingetPkgDir);
      for (const d of dirs) {
        if (d.toLowerCase().includes('ffmpeg')) {
          const fullDirPath = path.join(wingetPkgDir, d);
          const found = findBinaryRecursive(fullDirPath, exeName);
          if (found) return found;
        }
      }
    } catch (e) {}
  }

  return null;
}

function findBinaryRecursive(dir, targetExe, depth = 0) {
  if (depth > 4) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === targetExe.toLowerCase()) {
        return fullPath;
      } else if (entry.isDirectory()) {
        const found = findBinaryRecursive(fullPath, targetExe, depth + 1);
        if (found) return found;
      }
    }
  } catch (e) {}
  return null;
}

export function detectFfmpeg() {
  if (cachedInfo) {
    return cachedInfo;
  }

  let ffmpegPath = null;
  let ffprobePath = null;
  let version = 'Unknown';

  // 1. Check if on PATH
  try {
    const test = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });
    if (test.status === 0 && test.stdout) {
      ffmpegPath = 'ffmpeg';
      const match = test.stdout.match(/ffmpeg version ([^\s]+)/i);
      if (match) version = match[1];
    }
  } catch (e) {}

  try {
    const testProbe = spawnSync('ffprobe', ['-version'], { encoding: 'utf-8' });
    if (testProbe.status === 0) {
      ffprobePath = 'ffprobe';
    }
  } catch (e) {}

  // 2. Check common Windows directories
  if (!ffmpegPath) {
    const foundFfmpeg = findInCommonWindowsPaths('ffmpeg.exe');
    if (foundFfmpeg) {
      try {
        const test = spawnSync(foundFfmpeg, ['-version'], { encoding: 'utf-8' });
        if (test.status === 0 && test.stdout) {
          ffmpegPath = foundFfmpeg;
          const match = test.stdout.match(/ffmpeg version ([^\s]+)/i);
          if (match) version = match[1];
        }
      } catch (e) {}
    }
  }

  if (!ffprobePath) {
    const foundFfprobe = findInCommonWindowsPaths('ffprobe.exe');
    if (foundFfprobe) {
      ffprobePath = foundFfprobe;
    }
  }

  // 3. Fallback to bundled @ffmpeg-installer & @ffprobe-installer
  if (!ffmpegPath && ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
    ffmpegPath = ffmpegInstaller.path;
    try {
      const test = spawnSync(ffmpegPath, ['-version'], { encoding: 'utf-8' });
      if (test.status === 0 && test.stdout) {
        const match = test.stdout.match(/ffmpeg version ([^\s]+)/i);
        version = match ? match[1] : (ffmpegInstaller.version || 'installed-local');
      }
    } catch (e) {}
  }

  if (!ffprobePath && ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
    ffprobePath = ffprobeInstaller.path;
  }

  cachedFfmpegPath = ffmpegPath;
  cachedFfprobePath = ffprobePath || ffmpegPath;
  if (!cachedFfprobePath && cachedFfmpegPath && cachedFfmpegPath !== 'ffmpeg') {
    const siblingProbe = path.join(path.dirname(cachedFfmpegPath), 'ffprobe.exe');
    if (fs.existsSync(siblingProbe)) {
      cachedFfprobePath = siblingProbe;
    }
  }

  cachedInfo = {
    available: !!ffmpegPath,
    ffmpegPath: cachedFfmpegPath,
    ffprobePath: cachedFfprobePath,
    version,
    platform: process.platform,
    isLocal: true
  };

  return cachedInfo;
}

export function getFfmpegPath() {
  if (!cachedFfmpegPath) {
    detectFfmpeg();
  }
  return cachedFfmpegPath;
}

export function getFfprobePath() {
  if (!cachedFfprobePath) {
    detectFfmpeg();
  }
  return cachedFfprobePath;
}
