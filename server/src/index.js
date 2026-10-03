import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectFfmpeg } from './ffmpeg/detector.js';
import { extractMetadata } from './ffmpeg/metadata.js';
import { ExportJob } from './ffmpeg/exporter.js';
import { parseNaturalLanguageCommand } from './ai/parser.js';
import { ProjectManager } from './projects/projectManager.js';
import { AiManager } from './ai/aiManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables if .env exists
try {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch (e) {
  console.warn('Could not load .env file:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Storage directories
const storageDir = path.join(rootDir, 'storage');
const uploadsDir = path.join(storageDir, 'uploads');
const exportsDir = path.join(storageDir, 'exports');
const thumbnailsDir = path.join(storageDir, 'thumbnails');
const projectsDir = path.join(storageDir, 'projects');

[storageDir, uploadsDir, exportsDir, thumbnailsDir, projectsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const projectManager = new ProjectManager(projectsDir);
const aiManager = new AiManager(storageDir);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer storage for zero-compression local import
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cb(null, `${base}_${unique}${ext}`);
  }
});
const upload = multer({ storage });

// Active export jobs tracking
const activeJobs = new Map();

// 1. Health & FFmpeg status
app.get('/api/status', (req, res) => {
  const ffmpegInfo = detectFfmpeg();
  res.json({
    status: 'ok',
    ffmpeg: ffmpegInfo,
    storage: {
      uploads: uploadsDir,
      exports: exportsDir
    }
  });
});

// 1.5 List Media Library
app.get('/api/media', async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const mediaList = [];

    for (const f of files) {
      const fullPath = path.join(uploadsDir, f);
      const stat = fs.statSync(fullPath);
      const isVideo = /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(f);
      const isAudio = /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(f);

      if (isVideo || isAudio) {
        let metadata = {};
        try {
          metadata = await extractMetadata(fullPath, storageDir);
        } catch (e) {
          metadata = { duration: 10, format: path.extname(f).replace('.', '') };
        }

        mediaList.push({
          id: `media_${path.parse(f).name}`,
          originalName: f.replace(/^\d+_[a-z0-9]+_/, ''),
          fileName: f,
          filePath: fullPath,
          fileSize: stat.size,
          type: isVideo ? 'video' : 'audio',
          url: `/media/uploads/${f}`,
          metadata
        });
      }
    }

    res.json(mediaList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload video / audio
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const isVideo = req.file.mimetype.startsWith('video') || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(req.file.originalname);
    const isAudio = req.file.mimetype.startsWith('audio') || /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(req.file.originalname);

    // Extract real FFprobe metadata
    let metadata = {};
    try {
      metadata = await extractMetadata(filePath, storageDir);
    } catch (err) {
      console.warn('Metadata extraction warning:', err.message);
      metadata = {
        duration: 0,
        format: path.extname(filePath).replace('.', '')
      };
    }

    const mediaItem = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      type: isVideo ? 'video' : (isAudio ? 'audio' : 'other'),
      url: `/media/uploads/${req.file.filename}`,
      metadata
    };

    res.json(mediaItem);
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. High-Performance Range Streaming for Preview & Static Media
app.use('/media', express.static(storageDir));

app.get('/media/:folder/*', (req, res) => {
  const folder = req.params.folder;
  const relativePath = req.params[0];
  const safeFolders = {
    uploads: uploadsDir,
    exports: exportsDir,
    thumbnails: thumbnailsDir
  };

  const targetDir = safeFolders[folder];
  if (!targetDir) {
    return res.status(404).send('Not found');
  }

  const filePath = path.join(targetDir, relativePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // For images / thumbnails, stream directly
  if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.webp')) {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': filePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Range support for videos and audio
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': filePath.endsWith('.mp3') ? 'audio/mpeg' : (filePath.endsWith('.wav') ? 'audio/wav' : 'video/mp4')
    };
    res.writeHead(206, head);
    fileStream.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': filePath.endsWith('.mp3') ? 'audio/mpeg' : (filePath.endsWith('.wav') ? 'audio/wav' : 'video/mp4')
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 4. Real AI Video Editing Brain Endpoints
app.post('/api/ai/plan', async (req, res) => {
  try {
    const { prompt, filePath, activeClip, projectContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Resolve real file path if relative URL or fileName is passed
    let resolvedFilePath = filePath;
    if (resolvedFilePath && !fs.existsSync(resolvedFilePath)) {
      const candidateInUploads = path.join(uploadsDir, path.basename(resolvedFilePath));
      if (fs.existsSync(candidateInUploads)) {
        resolvedFilePath = candidateInUploads;
      }
    }

    const result = await aiManager.planEdit({
      prompt,
      filePath: resolvedFilePath,
      activeClip,
      projectContext
    });

    res.json(result);
  } catch (err) {
    console.error('AI plan error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/settings', (req, res) => {
  res.json(aiManager.getPublicSettings());
});

app.post('/api/ai/settings', (req, res) => {
  try {
    const updated = aiManager.saveSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/test-connection', async (req, res) => {
  try {
    const { provider } = req.body;
    const result = await aiManager.testConnection(provider);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fallback legacy parser
app.post('/api/ai/parse', (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const result = parseNaturalLanguageCommand(prompt, context || {});
  res.json(result);
});

// 5. Start Export
app.post('/api/export', async (req, res) => {
  try {
    const { projectData, preset = 'original', customFilename } = req.body;
    if (!projectData || !projectData.videoClips || projectData.videoClips.length === 0) {
      return res.status(400).json({ error: 'No video clips in project to export' });
    }

    const jobId = `job_${Date.now()}`;
    const outputFilename = customFilename || `render_${Date.now()}_${preset}.mp4`;
    const outputPath = path.join(exportsDir, outputFilename);

    const job = new ExportJob(jobId, projectData, outputPath, {
      preset,
      onProgress: (data) => {
        const current = activeJobs.get(jobId);
        if (current) {
          activeJobs.set(jobId, { ...current, ...data });
        }
      },
      onComplete: (data) => {
        const current = activeJobs.get(jobId);
        if (current) {
          activeJobs.set(jobId, {
            ...current,
            status: 'completed',
            progress: 100,
            result: {
              ...data,
              downloadUrl: `/media/exports/${outputFilename}`
            }
          });
        }
      },
      onError: (err) => {
        const current = activeJobs.get(jobId);
        if (current) {
          activeJobs.set(jobId, {
            ...current,
            status: 'error',
            error: err.message
          });
        }
      }
    });

    activeJobs.set(jobId, {
      jobId,
      status: 'starting',
      progress: 0,
      outputPath,
      jobInstance: job
    });

    // Start FFmpeg asynchronously
    job.start().catch((err) => {
      console.error('Job start error:', err);
      activeJobs.set(jobId, {
        jobId,
        status: 'error',
        error: err.message
      });
    });

    res.json({
      jobId,
      status: 'started',
      outputPath
    });
  } catch (err) {
    console.error('Export endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Check / Poll export status
app.get('/api/export/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }

  // Return clean status object (without the circular process instance)
  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress || 0,
    currentTime: job.currentTime,
    totalDuration: job.totalDuration,
    result: job.result,
    error: job.error
  });
});

// 7. Cancel export
app.post('/api/export/cancel/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);
  if (job && job.jobInstance) {
    job.jobInstance.cancel();
    activeJobs.set(jobId, { ...job, status: 'cancelled' });
    return res.json({ success: true, message: 'Job cancelled' });
  }
  res.status(404).json({ error: 'Job not found or already stopped' });
});

// 8. Project Management
app.get('/api/projects', (req, res) => {
  res.json(projectManager.listProjects());
});

app.post('/api/projects', (req, res) => {
  try {
    const saved = projectManager.saveProject(req.body);
    res.json({ success: true, project: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = projectManager.loadProject(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`AI Video Editor Backend running at http://localhost:${PORT}`);
  console.log(`Local media storage: ${storageDir}`);
  const ffmpeg = detectFfmpeg();
  console.log(`FFmpeg status: ${ffmpeg.available ? 'Ready (' + ffmpeg.version + ')' : 'Not detected yet'}`);
  console.log(`===============================================`);
});
