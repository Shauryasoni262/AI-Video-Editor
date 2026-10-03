import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFfmpegPath } from './ffmpeg/detector.js';

const ffmpeg = getFfmpegPath();
const uploadsDir = path.resolve('storage', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const videoPath = path.join(uploadsDir, 'demo_sample_1080p.mp4');
const audioPath = path.join(uploadsDir, 'ambient_track.wav');

console.log('Generating demo assets using FFmpeg:', ffmpeg);

// Generate 12-second 1080p test video with clock, color bars, and tone
try {
  execSync(`"${ffmpeg}" -y -f lavfi -i "testsrc=duration=12:size=1920x1080:rate=30" -f lavfi -i "sine=frequency=440:duration=12" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k "${videoPath}"`, { stdio: 'inherit' });
  console.log('Sample video created:', videoPath);
} catch (e) {
  console.error('Failed generating video:', e.message);
}

// Generate 10-second sample audio track in WAV
try {
  execSync(`"${ffmpeg}" -y -f lavfi -i "sine=frequency=528:duration=10" -c:a pcm_s16le "${audioPath}"`, { stdio: 'inherit' });
  console.log('Sample audio created:', audioPath);
} catch (e) {
  console.error('Failed generating audio:', e.message);
}
