#!/usr/bin/env node

/**
 * MCP Server Test Script
 * 
 * This script verifies that the Robert MCP server is properly installed,
 * built, and configured.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function header(message) {
  log(`\n${message}`, 'bold');
  log('='.repeat(message.length), 'bold');
}

// Get project root (script is in .mcp/)
const projectRoot = path.resolve(__dirname, '..');
const serverRoot = path.join(projectRoot, 'server');
const mcpServerPath = path.join(serverRoot, 'dist', 'mcp-server.js');
const configPath = path.join(projectRoot, '.mcp', 'config.json');

let exitCode = 0;

// Test 1: Check Node.js version
header('Test 1: Node.js Version');
try {
  const nodeVersion = process.version;
  const versionMatch = nodeVersion.match(/^v(\d+)/);
  const majorVersion = versionMatch ? parseInt(versionMatch[1]) : 0;
  
  if (majorVersion >= 18) {
    success(`Node.js version: ${nodeVersion} (>= 18)`);
  } else {
    error(`Node.js version: ${nodeVersion} (< 18 - upgrade required)`);
    exitCode = 1;
  }
} catch (err) {
  error(`Failed to check Node.js version: ${err.message}`);
  exitCode = 1;
}

// Test 2: Check server dependencies
header('Test 2: Server Dependencies');
try {
  const packageJsonPath = path.join(serverRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    error('Server package.json not found');
    exitCode = 1;
  } else {
    success('Server package.json found');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    if (packageJson.dependencies && packageJson.dependencies['@modelcontextprotocol/sdk']) {
      success(`MCP SDK dependency: ${packageJson.dependencies['@modelcontextprotocol/sdk']}`);
      
      // Check if node_modules exists
      const nodeModulesPath = path.join(serverRoot, 'node_modules', '@modelcontextprotocol', 'sdk');
      if (fs.existsSync(nodeModulesPath)) {
        success('MCP SDK installed in node_modules');
      } else {
        warning('MCP SDK not installed - run: cd server && npm install');
        exitCode = 1;
      }
    } else {
      error('MCP SDK not in dependencies');
      exitCode = 1;
    }
  }
} catch (err) {
  error(`Failed to check dependencies: ${err.message}`);
  exitCode = 1;
}

// Test 3: Check if MCP server is built
header('Test 3: MCP Server Build');
try {
  if (!fs.existsSync(mcpServerPath)) {
    error(`MCP server not built at: ${mcpServerPath}`);
    warning('Run: cd server && npm run build');
    exitCode = 1;
  } else {
    success(`MCP server built at: ${mcpServerPath}`);
    
    const stats = fs.statSync(mcpServerPath);
    info(`File size: ${stats.size} bytes`);
    
    if (stats.size < 1000) {
      warning('MCP server file seems too small - may not be properly built');
      exitCode = 1;
    } else {
      success('MCP server file size looks good');
    }
    
    // Check if it's valid JavaScript
    try {
      const content = fs.readFileSync(mcpServerPath, 'utf-8');
      if (content.includes('Model Context Protocol') || content.includes('MCP')) {
        success('MCP server file contains expected code');
      } else {
        warning('MCP server file may not contain MCP code');
      }
    } catch (err) {
      error(`Failed to read MCP server file: ${err.message}`);
    }
  }
} catch (err) {
  error(`Failed to check MCP server: ${err.message}`);
  exitCode = 1;
}

// Test 4: Check MCP configuration
header('Test 4: MCP Configuration');
try {
  if (!fs.existsSync(configPath)) {
    error(`MCP config not found at: ${configPath}`);
    exitCode = 1;
  } else {
    success(`MCP config found at: ${configPath}`);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (config.mcpServers && config.mcpServers.robert) {
      success('Robert MCP server configured');
      info(`  Command: ${config.mcpServers.robert.command}`);
      info(`  Args: ${config.mcpServers.robert.args.join(' ')}`);
      
      if (config.mcpServers.robert.description) {
        info(`  Description: ${config.mcpServers.robert.description}`);
      }
    } else {
      error('Robert MCP server not found in config');
      exitCode = 1;
    }
  }
} catch (err) {
  error(`Failed to check MCP config: ${err.message}`);
  exitCode = 1;
}

// Test 5: Check project structure
header('Test 5: Project Structure');
try {
  const requiredFiles = [
    'package.json',
    'README.md',
    'src/extension.ts',
    'server/package.json',
    'server/src/mcp-server.ts',
  ];
  
  let allFound = true;
  for (const file of requiredFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
    } else {
      error(`Missing: ${file}`);
      allFound = false;
      exitCode = 1;
    }
  }
  
  if (allFound) {
    success('All required project files found');
  }
} catch (err) {
  error(`Failed to check project structure: ${err.message}`);
  exitCode = 1;
}

// Test 6: Try to get absolute path
header('Test 6: Path Information');
try {
  info(`Project root: ${projectRoot}`);
  info(`Server root: ${serverRoot}`);
  info(`MCP server: ${mcpServerPath}`);
  
  const relativeFromCwd = path.relative(process.cwd(), mcpServerPath);
  info(`Relative path from current directory: ${relativeFromCwd}`);
  
  success('Path information available for configuration');
} catch (err) {
  error(`Failed to get path information: ${err.message}`);
}

// Summary
header('Test Summary');
if (exitCode === 0) {
  success('All tests passed! ✨');
  log('\nNext steps:', 'bold');
  log('1. Configure your AI assistant with the MCP server');
  log('2. Use this absolute path in your config:');
  log(`   ${mcpServerPath}`, 'blue');
  log('3. See .mcp/QUICKSTART.md for detailed setup instructions');
} else {
  error('Some tests failed. Please fix the issues above.');
  log('\nCommon fixes:', 'bold');
  log('• Install dependencies: cd server && npm install');
  log('• Build the server: cd server && npm run build');
  log('• Check Node.js version: node --version (should be >= 18)');
}

process.exit(exitCode);
