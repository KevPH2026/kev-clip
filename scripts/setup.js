#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const http = require('http');
const { URL } = require('url');

const CONFIG_DIR = path.join(require('os').homedir(), '.kev-clip');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TOKENS_FILE = path.join(CONFIG_DIR, 'tokens.json');

// Provider definitions
const TEXT_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-4o-mini'],
    auth: ['oauth', 'apikey'],
    region: '🌍',
    oauth: {
      authorizeUrl: 'https://platform.openai.com/oauth/authorize',
      tokenUrl: 'https://api.openai.com/oauth/token',
      scope: 'model.read model.write'
    }
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet'],
    auth: ['apikey'],
    region: '🌍'
  },
  google: {
    name: 'Google Gemini',
    models: ['gemini-pro', 'gemini-ultra', 'gemini-1.5-pro'],
    auth: ['oauth', 'apikey'],
    region: '🌍',
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/generative-language'
    }
  },
  xai: {
    name: 'X.AI Grok',
    models: ['grok-1'],
    auth: ['apikey'],
    region: '🌍'
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  minimax: {
    name: 'MiniMax',
    models: ['abab6.5-chat', 'abab6-chat'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  qwen: {
    name: 'Alibaba Qwen',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  glm: {
    name: 'Zhipu GLM',
    models: ['glm-4', 'glm-4v'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  moonshot: {
    name: 'Moonshot Kimi',
    models: ['kimi', 'kimi-vl'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  baidu: {
    name: 'Baidu Ernie',
    models: ['ernie-bot-4', 'ernie-bot'],
    auth: ['oauth', 'apikey'],
    region: '🇨🇳',
    oauth: {
      authorizeUrl: 'https://openapi.baidu.com/oauth/2.0/authorize',
      tokenUrl: 'https://openapi.baidu.com/oauth/2.0/token',
      scope: 'basic'
    }
  },
  hunyuan: {
    name: 'Tencent Hunyuan',
    models: ['hunyuan-pro', 'hunyuan-standard'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  doubao: {
    name: 'ByteDance Doubao',
    models: ['doubao-pro', 'doubao-lite'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  yi: {
    name: '01.AI Yi',
    models: ['yi-34b', 'yi-vl'],
    auth: ['apikey'],
    region: '🇨🇳'
  }
};

const VIDEO_PROVIDERS = {
  runway: {
    name: 'Runway',
    models: ['gen-3-alpha', 'gen-2'],
    auth: ['apikey'],
    region: '🌍'
  },
  pika: {
    name: 'Pika',
    models: ['pika-1.5', 'pika-1.0'],
    auth: ['apikey'],
    region: '🌍'
  },
  kling: {
    name: 'Kling',
    models: ['kling-1.5', 'kling-1.0'],
    auth: ['apikey'],
    region: '🌍🇨🇳'
  },
  luma: {
    name: 'Luma Dream Machine',
    models: ['luma-1.0'],
    auth: ['apikey'],
    region: '🌍'
  },
  doubao: {
    name: 'Doubao Seedance',
    models: ['seedance-1.5'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  wanxiang: {
    name: 'Tongyi Wanxiang',
    models: ['wanxiang-2.0'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  vidu: {
    name: 'Vidu',
    models: ['vidu-1.0'],
    auth: ['apikey'],
    region: '🇨🇳'
  },
  hidream: {
    name: 'HiDream',
    models: ['hidream-1.0'],
    auth: ['apikey'],
    region: '🇨🇳'
  }
};

async function ensureConfigDir() {
  await fs.ensureDir(CONFIG_DIR);
}

function showWelcome() {
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║               🎬  Welcome to Kev-Clip            ║'));
  console.log(chalk.cyan.bold('║        AI Video Generation Made Simple           ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════╝\n'));
  console.log(chalk.gray('Let\'s set up your AI providers...\n'));
}

async function selectAuthMethod() {
  const { method } = await inquirer.prompt([{
    type: 'list',
    name: 'method',
    message: 'Choose authentication method:',
    choices: [
      { name: '🔐 OAuth (Recommended) - Login with your account', value: 'oauth' },
      { name: '🔑 API Key - Enter key manually', value: 'apikey' }
    ]
  }]);
  return method;
}

async function selectTextProvider(authMethod) {
  const providers = Object.entries(TEXT_PROVIDERS)
    .filter(([_, p]) => p.auth.includes(authMethod))
    .map(([key, p]) => ({
      name: `${p.region} ${p.name} (${p.models[0]})`,
      value: key,
      short: p.name
    }));

  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: `Select text generation provider (${authMethod}):`,
    choices: providers
  }]);

  return provider;
}

async function selectVideoProvider() {
  const providers = Object.entries(VIDEO_PROVIDERS).map(([key, p]) => ({
    name: `${p.region} ${p.name}`,
    value: key,
    short: p.name
  }));

  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: 'Select video generation provider:',
    choices: providers
  }]);

  return provider;
}

async function configureOAuth(providerKey, type) {
  const provider = type === 'text' ? TEXT_PROVIDERS[providerKey] : null;
  if (!provider || !provider.oauth) {
    console.log(chalk.yellow('OAuth not available for this provider, switching to API key...'));
    return configureApiKey(providerKey, type);
  }

  console.log(chalk.blue(`\nOpening browser for ${provider.name} authorization...`));
  
  // Start local callback server
  const callbackPort = 3456;
  const redirectUri = `http://localhost:${callbackPort}/callback`;
  
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${callbackPort}`);
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        
        if (error) {
          res.end('Authorization failed. You can close this window.');
          server.close();
          reject(new Error(error));
          return;
        }
        
        if (code) {
          // In real implementation, exchange code for token
          // For now, store the code (would exchange in production)
          const token = { code, provider: providerKey, timestamp: Date.now() };
          
          res.end('<h1>✓ Authorization Successful!</h1><p>You can close this window.</p>');
          server.close();
          
          console.log(chalk.green('✓ OAuth authorized successfully'));
          resolve(token);
        }
      }
    });
    
    server.listen(callbackPort, async () => {
      // Build OAuth URL
      const authUrl = `${provider.oauth.authorizeUrl}?` +
        `client_id=kev-clip&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(provider.oauth.scope)}&` +
        `response_type=code&` +
        `state=${Date.now()}`;
      
      await open(authUrl);
      console.log(chalk.gray('Waiting for authorization in browser...'));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timeout'));
    }, 5 * 60 * 1000);
  });
}

async function configureApiKey(providerKey, type) {
  const provider = type === 'text' 
    ? TEXT_PROVIDERS[providerKey] 
    : VIDEO_PROVIDERS[providerKey];
  
  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: `Enter your ${provider.name} API Key:`,
    mask: '*'
  }]);

  // Validate key (basic check)
  if (!apiKey || apiKey.length < 10) {
    console.log(chalk.yellow('⚠ Warning: API key seems short, but continuing...'));
  }

  console.log(chalk.green('✓ API Key saved'));
  return { apiKey };
}

async function saveConfig(config) {
  await ensureConfigDir();
  
  // Save main config
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  
  // Save tokens separately if OAuth
  const tokens = {};
  if (config.text.auth === 'oauth' && config.text.token) {
    tokens[config.text.provider] = config.text.token;
  }
  await fs.writeJson(TOKENS_FILE, tokens, { spaces: 2 });
  
  // Create .env for backward compatibility
  const envContent = `# Kev-Clip Configuration
# Generated automatically - Do not edit manually
# Run 'npm run setup' to reconfigure

TEXT_PROVIDER=${config.text.provider}
TEXT_AUTH=${config.text.auth}
TEXT_MODEL=${config.text.model || config.text.models[0]}
${config.text.apiKey ? `TEXT_API_KEY=${config.text.apiKey}` : ''}

VIDEO_PROVIDER=${config.video.provider}
VIDEO_AUTH=${config.video.auth}
VIDEO_MODEL=${config.video.model || config.video.models[0]}
${config.video.apiKey ? `VIDEO_API_KEY=${config.video.apiKey}` : ''}

PORT=3000
`;
  
  await fs.writeFile('.env', envContent);
}

async function main() {
  try {
    showWelcome();
    
    // Check if already configured
    const existingConfig = await fs.readJson(CONFIG_FILE).catch(() => null);
    if (existingConfig) {
      const { reconfigure } = await inquirer.prompt([{
        type: 'confirm',
        name: 'reconfigure',
        message: 'Existing configuration found. Reconfigure?',
        default: false
      }]);
      
      if (!reconfigure) {
        console.log(chalk.gray('\nUsing existing configuration.'));
        console.log(chalk.cyan('\n🚀 Run "npm start" to launch Kev-Clip\n'));
        return;
      }
    }

    // Step 1: Auth method
    const authMethod = await selectAuthMethod();
    
    // Step 2: Text provider
    console.log(chalk.blue('\n─────────────────────────────────────────'));
    console.log(chalk.blue('📖 STEP 1: Text Generation (Script & Outline)'));
    console.log(chalk.blue('─────────────────────────────────────────\n'));
    
    const textProvider = await selectTextProvider(authMethod);
    const textCreds = authMethod === 'oauth' 
      ? await configureOAuth(textProvider, 'text')
      : await configureApiKey(textProvider, 'text');
    
    // Step 3: Video provider
    console.log(chalk.blue('\n─────────────────────────────────────────'));
    console.log(chalk.blue('🎬 STEP 2: Video Generation'));
    console.log(chalk.blue('─────────────────────────────────────────\n'));
    
    const videoProvider = await selectVideoProvider();
    const videoCreds = await configureApiKey(videoProvider, 'video');
    
    // Build config
    const config = {
      text: {
        provider: textProvider,
        auth: authMethod,
        model: TEXT_PROVIDERS[textProvider].models[0],
        ...(authMethod === 'oauth' ? { token: textCreds } : { apiKey: textCreds.apiKey })
      },
      video: {
        provider: videoProvider,
        auth: 'apikey',
        model: VIDEO_PROVIDERS[videoProvider].models[0],
        apiKey: videoCreds.apiKey
      },
      version: '1.0.0'
    };
    
    // Save
    const spinner = ora('Saving configuration...').start();
    await saveConfig(config);
    spinner.succeed('Configuration saved');
    
    // Success message
    console.log(chalk.green('\n✅ Setup Complete!\n'));
    console.log(chalk.white('Configured providers:'));
    console.log(`  • Text: ${TEXT_PROVIDERS[textProvider].name} (${authMethod})`);
    console.log(`  • Video: ${VIDEO_PROVIDERS[videoProvider].name}`);
    console.log(chalk.cyan('\n🚀 Run "npm start" to launch Kev-Clip'));
    console.log(chalk.gray('   Then open http://localhost:3000 in your browser\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error.message);
    process.exit(1);
  }
}

main();
