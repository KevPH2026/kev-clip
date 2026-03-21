#!/usr/bin/env node

/**
 * Create Kev-Clip CLI
 * Usage: npx create-kev-clip my-project
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const projectName = process.argv[2];

if (!projectName) {
  console.error('Please specify project name:');
  console.error('  npx create-kev-clip my-project');
  process.exit(1);
}

const targetDir = path.resolve(projectName);

if (fs.existsSync(targetDir)) {
  console.error(`Directory ${projectName} already exists.`);
  process.exit(1);
}

console.log(`Creating ${projectName}...`);

// Copy template
const templateDir = path.join(__dirname, '..');
fs.copySync(templateDir, targetDir, {
  filter: (src) => {
    // Skip node_modules and git
    return !src.includes('node_modules') && !src.includes('.git');
  }
});

// Update package.json
const pkgPath = path.join(targetDir, 'package.json');
const pkg = fs.readJsonSync(pkgPath);
pkg.name = projectName;
delete pkg.bin;
fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });

console.log(`\n✅ Created ${projectName}`);
console.log('\nNext steps:');
console.log(`  cd ${projectName}`);
console.log('  npm install');
console.log('  npm start\n');
