require('dotenv').config();
const express = require('express');
const expressWs = require('express-ws');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');

const app = express();
expressWs(app);

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './kev-clip.db';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR));

// Database
const db = new Database(DB_PATH);

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      episode INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      prompt TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
    
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      script_id INTEGER,
      prompt TEXT NOT NULL,
      file_path TEXT,
      status TEXT DEFAULT 'pending',
      duration INTEGER DEFAULT 10,
      segments INTEGER DEFAULT 1,
      error_msg TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
  `);
  console.log('✅ Database initialized');
}

// Load adapter
function loadAdapter(type, provider) {
  try {
    return require(`./adapters/${type}/${provider}`);
  } catch (e) {
    console.error(`Adapter not found: ${type}/${provider}`);
    return null;
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    providers: {
      text: process.env.TEXT_PROVIDER,
      video: process.env.VIDEO_PROVIDER
    }
  });
});

// Get config
app.get('/api/config', (req, res) => {
  const hasKeys = process.env.TEXT_API_KEY && process.env.VIDEO_API_KEY;
  res.json({
    demoMode: !hasKeys,
    text: {
      provider: process.env.TEXT_PROVIDER,
      model: process.env.TEXT_MODEL
    },
    video: {
      provider: process.env.VIDEO_PROVIDER,
      model: process.env.VIDEO_MODEL
    }
  });
});

// Projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare(
    'INSERT INTO projects (name, description) VALUES (?, ?)'
  ).run(name, description);
  res.json({ id: result.lastInsertRowid, name, description });
});

// Generate script
app.post('/api/scripts/generate', async (req, res) => {
  const { project_id, prompt, title } = req.body;
  
  // Save initial record
  const result = db.prepare(
    'INSERT INTO scripts (project_id, title, content, prompt, status) VALUES (?, ?, ?, ?, ?)'
  ).run(project_id, title || 'Untitled', '', prompt, 'generating');
  
  const scriptId = result.lastInsertRowid;
  
  // Start async generation
  generateScriptAsync(scriptId, prompt);
  
  res.json({ id: scriptId, status: 'generating' });
});

async function generateScriptAsync(scriptId, prompt) {
  try {
    const adapter = loadAdapter('text', process.env.TEXT_PROVIDER);
    if (!adapter) throw new Error('Text adapter not found');
    
    const script = await adapter.generate({
      prompt,
      model: process.env.TEXT_MODEL,
      apiKey: process.env.TEXT_API_KEY
    });
    
    db.prepare(
      'UPDATE scripts SET content = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(script.content, 'completed', scriptId);
    
  } catch (error) {
    db.prepare(
      'UPDATE scripts SET status = ?, error_msg = ? WHERE id = ?'
    ).run('failed', error.message, scriptId);
  }
}

// Get scripts
app.get('/api/scripts/:project_id', (req, res) => {
  const scripts = db.prepare(
    'SELECT * FROM scripts WHERE project_id = ? ORDER BY created_at DESC'
  ).all(req.params.project_id);
  res.json(scripts);
});

// Get single script
app.get('/api/script/:id', (req, res) => {
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  res.json(script);
});

// Generate video
app.post('/api/videos/generate', async (req, res) => {
  const { project_id, script_id, prompt, duration = 10 } = req.body;
  const segments = Math.ceil(duration / 10);
  
  const result = db.prepare(
    'INSERT INTO videos (project_id, script_id, prompt, duration, segments, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(project_id, script_id, prompt, duration, segments, 'pending');
  
  const videoId = result.lastInsertRowid;
  
  // Start async generation
  generateVideoAsync(videoId, prompt, segments);
  
  res.json({ id: videoId, status: 'pending', segments });
});

async function generateVideoAsync(videoId, prompt, segments) {
  try {
    db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('generating', videoId);
    
    const adapter = loadAdapter('video', process.env.VIDEO_PROVIDER);
    if (!adapter) throw new Error('Video adapter not found');
    
    const videoPaths = [];
    
    // Generate segments
    for (let i = 0; i < segments; i++) {
      const segmentPrompt = `${prompt} (segment ${i + 1}/${segments})`;
      const segmentPath = await adapter.generate({
        prompt: segmentPrompt,
        model: process.env.VIDEO_MODEL,
        apiKey: process.env.VIDEO_API_KEY,
        duration: 10
      });
      videoPaths.push(segmentPath);
    }
    
    // Merge segments if needed
    let finalPath = videoPaths[0];
    if (videoPaths.length > 1) {
      finalPath = await mergeVideos(videoPaths, videoId);
    }
    
    db.prepare(
      'UPDATE videos SET file_path = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(finalPath, 'completed', videoId);
    
  } catch (error) {
    db.prepare(
      'UPDATE videos SET status = ?, error_msg = ? WHERE id = ?'
    ).run('failed', error.message, videoId);
  }
}

async function mergeVideos(paths, videoId) {
  // Placeholder: In production, use FFmpeg to merge
  // For now, return the first path
  const outputDir = path.join('uploads', 'videos');
  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${videoId}.mp4`);
  
  // TODO: Implement FFmpeg merge
  // ffmpeg -f concat -i files.txt -c copy output.mp4
  
  return outputPath;
}

// Get videos
app.get('/api/videos/:project_id', (req, res) => {
  const videos = db.prepare(
    'SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC'
  ).all(req.params.project_id);
  res.json(videos);
});

// WebSocket for real-time updates
app.ws('/ws', (ws, req) => {
  console.log('WebSocket connected');
  
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    
    if (data.type === 'subscribe') {
      // Subscribe to project updates
      const interval = setInterval(() => {
        const videos = db.prepare(
          'SELECT id, status, progress FROM videos WHERE project_id = ? AND status IN (?, ?)'
        ).all(data.projectId, 'generating', 'pending');
        
        if (videos.length > 0) {
          ws.send(JSON.stringify({ type: 'update', data: videos }));
        }
      }, 1000);
      
      ws.on('close', () => clearInterval(interval));
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const chalk = require('chalk');

// Start
initDB();
app.listen(PORT, () => {
  console.log(chalk.cyan(`\n🎬 Kev-Clip running on http://localhost:${PORT}`));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));
});
