# Kev-Clip 🎬

> "Watch what you want, clip it yourself"

AI-powered video generation for everyone. Build your own AI video studio in 3 minutes.

[🎮 Live Demo](https://demo.kev-clip.com) · [📖 Documentation](https://docs.kev-clip.com) · [🐛 Issues](https://github.com/KevPH2026/kev-clip/issues)

![Demo](https://raw.githubusercontent.com/KevPH2026/kev-clip/main/docs/assets/demo.gif)

## ✨ Features

- 🚀 **Zero-config startup** — Interactive CLI wizard, no manual `.env` editing
- 🔐 **Flexible auth** — OAuth or API key for all providers
- 🌍 **15+ Text models** — OpenAI, Claude, Gemini, DeepSeek, MiniMax, Qwen, GLM, Kimi...
- 🎬 **9+ Video models** — Runway, Pika, Kling, Doubao, Wanxiang, Vidu...
- ⚡ **Streaming generation** — Real-time progress via WebSocket
- 🎞️ **Auto video stitching** — Merge 10s clips into 60s seamless videos
- 📱 **Mobile-first** — Works on your phone, PWA-ready
- 🔒 **Privacy-first** — Your API keys, your data, stored locally

## 🚀 Quick Start

### One-Line Install

```bash
npx create-kev-clip my-studio
cd my-studio
```

The interactive wizard will guide you through provider selection and configuration.

### Manual Install

```bash
git clone https://github.com/KevPH2026/kev-clip.git
cd kev-clip
npm install      # Launches interactive setup
npm start
```

Then open http://localhost:3000

### One-Click Deploy

[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KevPH2026/kev-clip)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/kev-clip)
[![Deploy on Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KevPH2026/kev-clip)

## 🤖 Supported AI Models

### Text Generation (Script & Outline)

| Provider | Models | Auth | Region |
|----------|--------|------|--------|
| **OpenAI** | GPT-4, GPT-4o, GPT-4o-mini | OAuth / API Key | 🌍 Global |
| **Anthropic** | Claude 3, Claude 3.5 | API Key | 🌍 Global |
| **Google** | Gemini Pro, Gemini Ultra | OAuth / API Key | 🌍 Global |
| **X.AI** | Grok | API Key | 🌍 Global |
| **DeepSeek** | V2, V3, R1 | API Key | 🇨🇳 China |
| **MiniMax** | abab6.5, abab6 | API Key | 🇨🇳 China |
| **Alibaba** | Qwen-Max, Qwen-Plus, Qwen-Turbo | API Key | 🇨🇳 China |
| **Zhipu** | GLM-4, GLM-4V | API Key | 🇨🇳 China |
| **Moonshot** | Kimi, Kimi-VL | API Key | 🇨🇳 China |
| **Baidu** | Ernie Bot, Ernie 4.0 | OAuth / API Key | 🇨🇳 China |
| **Tencent** | Hunyuan | API Key | 🇨🇳 China |
| **ByteDance** | Doubao-Lite, Doubao-Pro | API Key | 🇨🇳 China |
| **01.AI** | Yi-34B, Yi-VL | API Key | 🇨🇳 China |

### Video Generation

| Provider | Models | Auth | Region |
|----------|--------|------|--------|
| **Runway** | Gen-2, Gen-3 Alpha | API Key | 🌍 Global |
| **Pika** | Pika 1.0, Pika 1.5 | API Key | 🌍 Global |
| **Kling** | Kling 1.0, Kling 1.5 | API Key | 🌍 Global / 🇨🇳 China |
| **Luma** | Dream Machine | API Key | 🌍 Global |
| **Doubao** | Seedance | API Key | 🇨🇳 China |
| **Wanxiang** | Tongyi Wanxiang | API Key | 🇨🇳 China |
| **Vidu** | Vidu 1.0 | API Key | 🇨🇳 China |
| **HiDream** | HiDream.ai | API Key | 🇨🇳 China |

## 📖 How It Works

```
Input: "Cyberpunk girl fighting robots in neon rain"
   ↓
AI generates script → Storyboard → Video segments
   ↓
Auto-stitch into 60s video with audio
```

## 🏗️ Architecture

```
Input (one sentence)
    ↓
Text Adapter (15+ providers)
    ↓
Script Generator
    ↓
Video Adapter (9+ providers)
    ↓
Video Stitcher (FFmpeg)
    ↓
Output (60s video)
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical details.

## 🔐 Authentication Methods

### OAuth (Recommended)
No API key management. Just login with your provider account.

Supported: OpenAI, Google, Baidu

### API Key
Enter your API key directly. Keys are stored locally in `~/.kev-clip/`.

## 🌍 Internationalization

- 🇺🇸 English (default)
- 🇨🇳 Chinese ([中文版](./README.zh.md))

More languages welcome via PR!

## 🛠️ Development

```bash
# Clone
git clone https://github.com/KevPH2026/kev-clip.git
cd kev-clip

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding New Providers

Kev-Clip uses an adapter pattern. Adding a new AI provider only requires creating one adapter file:

1. Create `src/adapters/text/{provider}.js` or `src/adapters/video/{provider}.js`
2. Implement the standard interface
3. Register in `scripts/setup.js`

That's it — no core code changes needed.

## 📝 Configuration

Configuration is managed automatically by the setup wizard. To reconfigure:

```bash
npm run setup
```

Or manually edit `~/.kev-clip/config.json`.

## 🎯 Use Cases

- **Novel writers** — Visualize chapters for promotion
- **Short video creators** — Generate 10+ clips per day
- **Tech bloggers** — Demo AI capabilities
- **Students/Hobbyists** — Learn AI video with zero barrier

## 🆚 vs ToonFlow

| Dimension | ToonFlow | Kev-Clip |
|-----------|----------|----------|
| Setup time | 30+ min (manual fixes) | 3 min (one command) |
| Learning curve | Needs outline/script/storyboard knowledge | One sentence input |
| Model support | Fixed providers | 15+ global models |
| Codebase | ~20k lines, complex | ~2k lines, lean |
| Target users | Professional creators | Everyone |

## 📊 Project Stats

- **Core code**: ~2,000 lines
- **Dependencies**: 15 (minimal)
- **Startup time**: <3 seconds
- **Supported models**: 22 (13 text + 9 video)
- **License**: MIT

## 🙏 Acknowledgments

Built with:
- [Express](https://expressjs.com)
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
- [Tailwind CSS](https://tailwindcss.com)

Inspired by [ToonFlow](https://github.com/HBAI-Ltd/Toonflow-app) — we simplified the architecture and improved the UX.

## 📮 Contact

- Issues: [github.com/KevPH2026/kev-clip/issues](https://github.com/KevPH2026/kev-clip/issues)
- Email: kiven1026@gmail.com
- Twitter: [@skyerK12](https://x.com/skyerK12)

## 📄 License

MIT © [Kev](https://github.com/KevPH2026)

---

<p align="center">
  Made with ❤️ by Kev
</p>
