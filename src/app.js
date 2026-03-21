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

// Fallback for SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

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
    
    -- Novel/Story import table
    CREATE TABLE IF NOT EXISTS novels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      chapter_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
    
    -- Storyboard/Outline table
    CREATE TABLE IF NOT EXISTS outlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      episode INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      scenes TEXT, -- JSON array of scenes
      characters TEXT, -- JSON array of characters
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
    
    -- Script/Storyboard shots table
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      outline_id INTEGER,
      episode INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      prompt TEXT,
      shots TEXT, -- JSON array of storyboard shots
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (outline_id) REFERENCES outlines(id)
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
  console.log('✅ Database initialized with novels, outlines, scripts, videos');
}

// Load adapter
function loadAdapter(type, provider, customKey, customModel) {
  try {
    const AdapterClass = require(`./adapters/${type}/${provider}`);
    const config = { apiKey: customKey };
    if (customModel) {
      config.model = customModel;
    }
    return new AdapterClass(config);
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

// ==================== NOVEL / STORY IMPORT ====================

// Upload novel chapter (Story Import)
app.post('/api/novels', (req, res) => {
  const { project_id, chapter_index, title, content } = req.body;
  
  if (!project_id || !content) {
    return res.status(400).json({ error: 'project_id and content are required' });
  }
  
  const result = db.prepare(
    'INSERT INTO novels (project_id, chapter_index, title, content) VALUES (?, ?, ?, ?)'
  ).run(project_id, chapter_index || 1, title || `Chapter ${chapter_index || 1}`, content);
  
  res.json({ 
    id: result.lastInsertRowid, 
    project_id, 
    chapter_index: chapter_index || 1, 
    title, 
    content_length: content.length 
  });
});

// Get all novel chapters for a project
app.get('/api/novels/:project_id', (req, res) => {
  const novels = db.prepare(
    'SELECT * FROM novels WHERE project_id = ? ORDER BY chapter_index'
  ).all(req.params.project_id);
  res.json(novels);
});

// Get single novel chapter
app.get('/api/novel/:id', (req, res) => {
  const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(req.params.id);
  if (!novel) {
    return res.status(404).json({ error: 'Novel chapter not found' });
  }
  res.json(novel);
});

// Delete novel chapter
app.delete('/api/novels/:id', (req, res) => {
  db.prepare('DELETE FROM novels WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ==================== STORYBOARD / OUTLINE ====================

// Create outline (Storyboard generation)
app.post('/api/outlines', (req, res) => {
  const { project_id, episode, title, summary, scenes, characters } = req.body;
  
  if (!project_id || !title) {
    return res.status(400).json({ error: 'project_id and title are required' });
  }
  
  const result = db.prepare(
    'INSERT INTO outlines (project_id, episode, title, summary, scenes, characters) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    project_id, 
    episode || 1, 
    title, 
    summary || '', 
    JSON.stringify(scenes || []), 
    JSON.stringify(characters || [])
  );
  
  res.json({ 
    id: result.lastInsertRowid, 
    project_id, 
    episode: episode || 1, 
    title,
    summary,
    scenes: scenes || [],
    characters: characters || []
  });
});

// Get all outlines for a project
app.get('/api/outlines/:project_id', (req, res) => {
  const outlines = db.prepare(
    'SELECT * FROM outlines WHERE project_id = ? ORDER BY episode'
  ).all(req.params.project_id);
  
  res.json(outlines.map(o => ({
    ...o,
    scenes: JSON.parse(o.scenes || '[]'),
    characters: JSON.parse(o.characters || '[]')
  })));
});

// Get single outline
app.get('/api/outline/:id', (req, res) => {
  const outline = db.prepare('SELECT * FROM outlines WHERE id = ?').get(req.params.id);
  if (!outline) {
    return res.status(404).json({ error: 'Outline not found' });
  }
  
  res.json({
    ...outline,
    scenes: JSON.parse(outline.scenes || '[]'),
    characters: JSON.parse(outline.characters || '[]')
  });
});

// Update outline
app.put('/api/outlines/:id', (req, res) => {
  const { title, summary, scenes, characters } = req.body;
  
  db.prepare(
    'UPDATE outlines SET title = ?, summary = ?, scenes = ?, characters = ? WHERE id = ?'
  ).run(
    title, 
    summary, 
    JSON.stringify(scenes || []), 
    JSON.stringify(characters || []), 
    req.params.id
  );
  
  res.json({ updated: true });
});

// Delete outline
app.delete('/api/outlines/:id', (req, res) => {
  db.prepare('DELETE FROM outlines WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ==================== SCRIPT / STORYBOARD SHOTS ====================

// Generate script
app.post('/api/scripts/generate', async (req, res) => {
  const { project_id, prompt, title, language, scriptStyle } = req.body;
  
  // Check if demo mode
  const isDemo = req.headers['x-demo-mode'] === 'true';
  
  // Get user's API keys from headers
  const textProvider = req.headers['x-text-provider'] || process.env.TEXT_PROVIDER;
  const textKey = req.headers['x-text-key'];
  const textModel = req.headers['x-text-model'];
  
  // Save initial record
  const result = db.prepare(
    'INSERT INTO scripts (project_id, title, content, prompt, status) VALUES (?, ?, ?, ?, ?)'
  ).run(project_id, title || 'Untitled', '', prompt, 'generating');
  
  const scriptId = result.lastInsertRowid;
  
  if (isDemo || !textKey) {
    // Demo mode: generate mock script
    generateMockScriptAsync(scriptId, prompt, language || 'en', scriptStyle || 'short-drama');
  } else {
    // Real generation with user's config
    generateScriptAsync(scriptId, prompt, textProvider, textKey, textModel, language || 'en', scriptStyle || 'short-drama');
  }
  
  res.json({ id: scriptId, status: 'generating' });
});

// Generate mock script for demo mode
async function generateMockScriptAsync(scriptId, prompt, language, scriptStyle) {
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let mockContent = '';
    
    if (language === 'zh') {
      mockContent = `【演示模式】自动生成的示例剧本

※ 场景 1 - 夜晚
$ 主角、配角
【BGM】紧张悬疑
△ 镜头从远处慢慢推近，城市霓虹灯闪烁
主角：（凝视远方）这就是我们的战场...

※ 场景 2 - 室内
$ 主角
【BGM】舒缓
△ 特写镜头，主角表情凝重
主角：（独白）无论前方有什么，我都不会退缩。

※ 场景 3 - 高潮
$ 主角、反派
【BGM】激烈战斗
△ 快速剪辑，动作场面
主角：（大喊）为了正义！

---
这是演示模式生成的示例剧本。
真实模式将使用您选择的 AI 模型生成创意内容。`;
    } else {
      mockContent = `[DEMO MODE] Auto-generated sample script

※ Scene 1 - Night
$ Protagonist, Sidekick
【BGM】Tense Suspense
△ Camera slowly pushes in from distance, city neon lights flickering
Protagonist: (gazing into distance) This is our battlefield...

※ Scene 2 - Interior
$ Protagonist
【BGM】Melancholic
△ Close-up shot, protagonist\'s solemn expression
Protagonist: (monologue) No matter what lies ahead, I won\'t back down.

※ Scene 3 - Climax
$ Protagonist, Villain
【BGM】Intense Battle
△ Quick cuts, action sequence
Protagonist: (shouting) For justice!

---
This is a sample script generated in demo mode.
Real mode will use your selected AI model to create creative content.`;
    }
    
    db.prepare(
      'UPDATE scripts SET content = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(mockContent, 'completed', scriptId);
    
  } catch (error) {
    db.prepare(
      'UPDATE scripts SET status = ?, error_msg = ? WHERE id = ?'
    ).run('failed', error.message, scriptId);
  }
}

async function generateScriptAsync(scriptId, prompt, textProvider, textKey, textModel, language, scriptStyle) {
  try {
    const adapter = loadAdapter('text', textProvider || process.env.TEXT_PROVIDER, textKey, textModel);
    if (!adapter) throw new Error('Text adapter not found');
    
    // Build system prompt based on language and style
    let systemPrompt = '';
    
    if (language === 'zh') {
      systemPrompt = '你是一个专业的中文短剧编剧。';
    } else {
      systemPrompt = 'You are a professional short drama scriptwriter. ';
    }
    
    switch (scriptStyle) {
      case 'anime':
        systemPrompt += language === 'zh' ? '请生成动漫风格的剧本，包含日式动漫的视觉元素和叙事节奏。' : 'Generate an anime-style script with Japanese animation visual elements and pacing. ';
        break;
      case 'movie':
        systemPrompt += language === 'zh' ? '请生成电影感的剧本，注重视觉冲击力和叙事深度。' : 'Generate a cinematic script with strong visual impact and narrative depth. ';
        break;
      case 'comedy':
        systemPrompt += language === 'zh' ? '请生成喜剧风格的剧本，包含幽默元素和轻松氛围。' : 'Generate a comedy script with humorous elements and light atmosphere. ';
        break;
      case 'horror':
        systemPrompt += language === 'zh' ? '请生成恐怖风格的剧本，营造紧张恐怖的氛围。' : 'Generate a horror script with tense and scary atmosphere. ';
        break;
      default: // short-drama
        systemPrompt += language === 'zh' ? '请生成短剧风格的剧本，节奏紧凑，每集结尾有悬念。' : 'Generate a short drama script with fast pacing and cliffhangers at the end of each episode. ';
    }
    
    const script = await adapter.generate({
      prompt,
      system: systemPrompt
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
    'SELECT * FROM scripts WHERE project_id = ? ORDER BY episode ASC, created_at DESC'
  ).all(req.params.project_id);
  
  res.json(scripts.map(s => ({
    ...s,
    shots: JSON.parse(s.shots || '[]')
  })));
});

// Get single script
app.get('/api/script/:id', (req, res) => {
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) {
    return res.status(404).json({ error: 'Script not found' });
  }
  
  res.json({
    ...script,
    shots: JSON.parse(script.shots || '[]')
  });
});

// Create script with storyboard shots
app.post('/api/scripts', (req, res) => {
  const { project_id, outline_id, episode, title, content, shots } = req.body;
  
  if (!project_id || !title) {
    return res.status(400).json({ error: 'project_id and title are required' });
  }
  
  const result = db.prepare(
    'INSERT INTO scripts (project_id, outline_id, episode, title, content, shots, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    project_id, 
    outline_id || null, 
    episode || 1, 
    title, 
    content || '', 
    JSON.stringify(shots || []),
    'completed'
  );
  
  res.json({ 
    id: result.lastInsertRowid, 
    project_id, 
    outline_id,
    episode: episode || 1, 
    title,
    content,
    shots: shots || [],
    status: 'completed'
  });
});

// Update script with storyboard shots
app.put('/api/scripts/:id', (req, res) => {
  const { title, content, shots } = req.body;
  
  db.prepare(
    'UPDATE scripts SET title = ?, content = ?, shots = ? WHERE id = ?'
  ).run(title, content, JSON.stringify(shots || []), req.params.id);
  
  res.json({ updated: true });
});

// Delete script
app.delete('/api/scripts/:id', (req, res) => {
  db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// Generate script from outline (AI generation)
app.post('/api/scripts/generate-from-outline', async (req, res) => {
  const { project_id, outline_id } = req.body;
  
  // Get outline
  const outline = db.prepare('SELECT * FROM outlines WHERE id = ?').get(outline_id);
  if (!outline) {
    return res.status(404).json({ error: 'Outline not found' });
  }
  
  const outlineData = {
    ...outline,
    scenes: JSON.parse(outline.scenes || '[]'),
    characters: JSON.parse(outline.characters || '[]')
  };
  
  // Create script with shots based on outline scenes
  const shots = outlineData.scenes.map((scene, index) => ({
    shot_number: index + 1,
    scene: scene.title || `Scene ${index + 1}`,
    time: scene.time || 'Day',
    characters: scene.characters || [],
    action: scene.description || '',
    camera: scene.camera || 'Medium shot',
    dialogue: scene.dialogue || '',
    bgm: scene.bgm || 'Ambient'
  }));
  
  const scriptContent = generateScriptFromOutline(outlineData);
  
  const result = db.prepare(
    'INSERT INTO scripts (project_id, outline_id, episode, title, content, shots, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    project_id,
    outline_id,
    outline.episode,
    outline.title,
    scriptContent,
    JSON.stringify(shots),
    'completed'
  );
  
  res.json({
    id: result.lastInsertRowid,
    project_id,
    outline_id,
    episode: outline.episode,
    title: outline.title,
    content: scriptContent,
    shots,
    status: 'completed'
  });
});

// Helper function to generate script content from outline
function generateScriptFromOutline(outline) {
  let script = `※ ${outline.title}\n\n`;
  
  const scenes = JSON.parse(outline.scenes || '[]');
  scenes.forEach((scene, index) => {
    script += `※ ${scene.title || `场景 ${index + 1}`} - ${scene.time || '白天'}\n`;
    script += `$ ${(scene.characters || []).join('、')}\n`;
    script += `【BGM】${scene.bgm || '环境音'}\n`;
    script += `△ ${scene.camera || '中景'}\n`;
    if (scene.dialogue) {
      script += `角色：${scene.dialogue}\n`;
    }
    script += `动作：${scene.description || scene.action || ''}\n\n`;
  });
  
  return script;
}

// Generate video
app.post('/api/videos/generate', async (req, res) => {
  const { project_id, script_id, prompt, duration = 10 } = req.body;
  const segments = Math.ceil(duration / 10);
  
  // Check if demo mode
  const isDemo = req.headers['x-demo-mode'] === 'true';
  
  // Get user's API keys from headers
  const videoProvider = req.headers['x-video-provider'] || process.env.VIDEO_PROVIDER;
  const videoKey = req.headers['x-video-key'];
  const videoModel = req.headers['x-video-model'];
  
  const result = db.prepare(
    'INSERT INTO videos (project_id, script_id, prompt, duration, segments, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(project_id, script_id, prompt, duration, segments, 'pending');
  
  const videoId = result.lastInsertRowid;
  
  if (isDemo || !videoKey) {
    // Demo mode: generate mock video
    generateMockVideoAsync(videoId, prompt, segments);
  } else {
    // Real generation with user's config
    generateVideoAsync(videoId, prompt, segments, videoProvider, videoKey, videoModel);
  }
  
  res.json({ id: videoId, status: 'pending', segments });
});

// Generate mock video for demo mode
async function generateMockVideoAsync(videoId, prompt, segments) {
  try {
    db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('generating', videoId);
    
    // Simulate processing delay (5-10 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
    
    // Use a sample video URL for demo
    const demoVideoUrl = 'https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_30fps.mp4';
    
    db.prepare(
      'UPDATE videos SET file_path = ?, status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(demoVideoUrl, 'completed', videoId);
    
  } catch (error) {
    db.prepare(
      'UPDATE videos SET status = ?, error_msg = ? WHERE id = ?'
    ).run('failed', error.message, videoId);
  }
}

async function generateVideoAsync(videoId, prompt, segments, videoProvider, videoKey, videoModel) {
  try {
    db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('generating', videoId);
    
    const adapter = loadAdapter('video', videoProvider || process.env.VIDEO_PROVIDER, videoKey, videoModel);
    if (!adapter) throw new Error('Video adapter not found');
    
    const videoPaths = [];
    
    // Generate segments
    for (let i = 0; i < segments; i++) {
      const segmentPrompt = `${prompt} (segment ${i + 1}/${segments})`;
      const segmentPath = await adapter.generate({
        prompt: segmentPrompt,
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
