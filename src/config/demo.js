// Demo mode configuration
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_API_KEY = process.env.DEMO_API_KEY || null;

// Check if we have real API keys
const hasRealKeys = process.env.TEXT_API_KEY && process.env.VIDEO_API_KEY;

// Middleware to check API availability
function checkApiAvailability(req, res, next) {
  if (DEMO_MODE && !hasRealKeys && !DEMO_API_KEY) {
    return res.status(503).json({
      error: 'Demo Mode',
      message: 'This is a demo instance. To generate videos, please deploy your own instance or run locally.',
      action: 'https://github.com/KevPH2026/kev-clip#quick-start'
    });
  }
  next();
}

module.exports = { DEMO_MODE, checkApiAvailability };