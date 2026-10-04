import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFfmpegPath } from './ffmpeg/detector.js';

const ffmpeg = getFfmpegPath();
const sfxDir = path.resolve('storage', 'sfx');
if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });

console.log('Generating local built-in SFX library using FFmpeg:', ffmpeg);

const sfxList = [
  {
    name: 'whoosh_transition.mp3',
    filter: 'anoisesrc=d=0.5:c=pink:r=44100,lowpass=f=1200,afade=t=in:ss=0:d=0.15,afade=t=out:st=0.25:d=0.25,volume=3.0'
  },
  {
    name: 'camera_click.mp3',
    filter: 'anoisesrc=d=0.18:c=white:r=44100,volume=3.5,afade=t=out:st=0.06:d=0.12'
  },
  {
    name: 'cinematic_boom.mp3',
    filter: 'sine=frequency=60:duration=1.4,afade=t=out:st=0.3:d=1.1,volume=2.5'
  },
  {
    name: 'bell_notification.mp3',
    filter: 'sine=frequency=1100:duration=0.8,afade=t=out:st=0.1:d=0.7,volume=1.8'
  },
  {
    name: 'pop_bubble.mp3',
    filter: 'sine=frequency=480:duration=0.14,afade=t=out:st=0.04:d=0.1,volume=2.2'
  },
  {
    name: 'retro_laser.mp3',
    filter: 'sine=frequency=880:duration=0.25,afade=t=out:st=0.05:d=0.2,volume=2.0'
  }
];

for (const sfx of sfxList) {
  const destPath = path.join(sfxDir, sfx.name);
  try {
    execSync(`"${ffmpeg}" -y -f lavfi -i "${sfx.filter}" -c:a libmp3lame -b:a 192k "${destPath}"`, { stdio: 'pipe' });
    console.log(`Created SFX: ${sfx.name}`);
  } catch (err) {
    console.error(`Failed creating ${sfx.name}:`, err.message);
  }
}
