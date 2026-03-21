# Kev-Clip 🎬

> "Watch what you want, clip it yourself"

AI-powered video generation studio with complete workflow: story import → storyboard → script → video.

[🚀 Live Demo](https://superk.ai) · [📖 Docs](./docs) · [🐛 Issues](https://github.com/KevPH2026/kev-clip/issues)

## ✨ Features

- 📚 **Story Import** - Upload novels chapter by chapter
- 🎬 **Storyboard** - Visual scene breakdown with characters
- 📝 **Script/Shots** - Generate detailed shot lists
- 🎥 **Video Generation** - 9 AI models (OpenAI, Claude, DeepSeek, Runway, Pika, etc.)
- 🖥️ **Admin Dashboard** - Full-featured management interface
- 🌐 **Landing Page** - Marketing site included

## 🚀 Quick Start

### Option 1: One-Line Install (OpenClaw)

```bash
openclaw install kev-clip
```

Then open http://localhost:3000 for the landing page and http://localhost:3000/admin.html for the dashboard.

### Option 2: Manual Install

```bash
# Clone repository
git clone https://github.com/KevPH2026/kev-clip.git
cd kev-clip

# Install dependencies (requires Node.js 18-20)
npm install

# Start the server
npm start

# Open browser
open http://localhost:3000        # Landing page
open http://localhost:3000/admin.html  # Admin dashboard
```

### Option 3: Using npx

```bash
npx kev-clip
```

## 📁 Project Structure

```
kev-clip/
├── src/
│   └── app.js              # Express server + API routes
├── public/
│   ├── index.html          # Landing page (frontend)
│   └── admin.html          # Admin dashboard (frontend)
├── bin/
│   ├── cli.js              # CLI entry point
│   └── create.js           # Project creation script
├── scripts/
│   ├── setup.js            # Interactive setup wizard
│   └── verify.js           # Post-install verification
└── package.json
```

## 🔌 API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project

### Story Import
- `GET /api/novels/:project_id` - Get chapters
- `POST /api/novels` - Import chapter

### Storyboard
- `GET /api/outlines/:project_id` - Get outlines
- `POST /api/outlines` - Create outline

### Scripts
- `GET /api/scripts/:project_id` - Get scripts
- `POST /api/scripts` - Create script
- `POST /api/scripts/generate-from-outline` - AI generate from outline

### Videos
- `GET /api/videos/:project_id` - Get videos
- `POST /api/videos/generate` - Generate video

### Health
- `GET /api/health` - Server status

## ⚙️ Configuration

Create `.env` file:

```env
PORT=3000
DB_PATH=./kev-clip.db

# AI Providers (optional for demo mode)
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
DOUBAO_API_KEY=...
RUNWAY_API_KEY=...
```

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Verify installation
npm run verify
```

## 📄 License

MIT © Kev
