#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cursorCmd = process.platform === 'win32' ? 'cursor.cmd' : 'cursor';

const run = (command, args, errorMessage) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`\n${errorMessage} (missing command: ${command}).`);
    } else {
      console.error(`\n${errorMessage}`);
      console.error(result.error);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(npmCmd, ['run', 'package:patch'], 'Failed to build the updated VSIX before installation');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const vsixRelative = path.join('dist', `robert-${pkg.version}.vsix`);
const vsixAbsolute = path.resolve(__dirname, '..', vsixRelative);

if (!fs.existsSync(vsixAbsolute)) {
  console.error(`\nVSIX not found at ${vsixAbsolute}.`);
  console.error('Make sure the package step produced the expected artifact.');
  process.exit(1);
}

console.log(`\nInstalling ${vsixRelative}...`);
run(cursorCmd, ['--install-extension', vsixAbsolute, '--force'], 'Failed to install the packaged VSIX into Cursor');
