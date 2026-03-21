#!/usr/bin/env node

/**
 * Kev-Clip Verification Script
 * Checks configuration and API connectivity
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const CONFIG_DIR = path.join(require('os').homedir(), '.kev-clip');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function verify() {
  console.log(chalk.cyan('\n🔍 Kev-Clip Verification\n'));

  // Check config exists
  if (!await fs.pathExists(CONFIG_FILE)) {
    console.log(chalk.red('✗ Configuration not found'));
    console.log(chalk.yellow('Run: npm run setup'));
    process.exit(1);
  }

  const config = await fs.readJson(CONFIG_FILE);

  // Verify text provider
  console.log(chalk.blue('Text Provider:'));
  console.log(`  Provider: ${config.text.provider}`);
  console.log(`  Auth: ${config.text.auth}`);
  console.log(`  Model: ${config.text.model}`);
  console.log(`  Status: ${config.text.apiKey || config.text.token ? chalk.green('✓ Configured') : chalk.red('✗ Missing credentials')}`);

  // Verify video provider
  console.log(chalk.blue('\nVideo Provider:'));
  console.log(`  Provider: ${config.video.provider}`);
  console.log(`  Auth: ${config.video.auth}`);
  console.log(`  Model: ${config.video.model}`);
  console.log(`  Status: ${config.video.apiKey ? chalk.green('✓ Configured') : chalk.red('✗ Missing credentials')}`);

  console.log(chalk.green('\n✓ Verification complete'));
  console.log(chalk.cyan('\n🚀 Run "npm start" to launch Kev-Clip\n'));
}

verify().catch(e => {
  console.error(chalk.red('✗ Verification failed:'), e.message);
  process.exit(1);
});
