# Contributing to Kev-Clip

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/KevPH2026/kev-clip.git
cd kev-clip
npm install
npm run dev
```

## Adding a New AI Provider

Kev-Clip uses an adapter pattern. To add a new provider:

### 1. Text Generation Adapter

Create `src/adapters/text/{provider}.js`:

```javascript
class ProviderAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseURL = config.baseURL;
  }

  async generate({ prompt }) {
    // Call provider API
    return { content: 'generated script' };
  }
}

module.exports = ProviderAdapter;
```

### 2. Video Generation Adapter

Create `src/adapters/video/{provider}.js`:

```javascript
class ProviderAdapter {
  async generate({ prompt, duration }) {
    // Call provider API
    return 'path/to/video.mp4';
  }
}

module.exports = ProviderAdapter;
```

### 3. Register in Setup Script

Add to `scripts/setup.js` in the appropriate provider list.

## Code Style

- Use ES6+ features
- Async/await preferred over callbacks
- JSDoc comments for public methods

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Reporting Issues

When reporting bugs, please include:
- Node.js version
- Operating system
- Error message and stack trace
- Steps to reproduce

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
