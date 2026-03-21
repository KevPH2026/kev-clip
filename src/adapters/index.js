/**
 * Adapter Registry
 * Unified interface for all AI providers
 */

const fs = require('fs');
const path = require('path');

const adapters = {
  text: {},
  video: {}
};

// Auto-load all adapters
function loadAdapters() {
  const types = ['text', 'video'];
  
  for (const type of types) {
    const dir = path.join(__dirname, type);
    
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js');
    
    for (const file of files) {
      const name = path.basename(file, '.js');
      try {
        adapters[type][name] = require(path.join(dir, file));
        console.log(`✓ Loaded ${type} adapter: ${name}`);
      } catch (e) {
        console.error(`✗ Failed to load ${type} adapter: ${name}`, e.message);
      }
    }
  }
}

// Get adapter instance
function getAdapter(type, provider, config = {}) {
  const AdapterClass = adapters[type][provider];
  
  if (!AdapterClass) {
    throw new Error(`Adapter not found: ${type}/${provider}`);
  }
  
  return new AdapterClass(config);
}

// List available adapters
function listAdapters(type) {
  return Object.keys(adapters[type]);
}

// Initialize
loadAdapters();

module.exports = {
  getAdapter,
  listAdapters,
  adapters
};
