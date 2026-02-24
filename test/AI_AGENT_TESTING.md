# Testing Robert Extension with AI Agents

This guide explains how to set up the Robert extension for testing with automated AI agents in virtual environments.

## The Problem

When an AI agent needs to test the Robert extension, it needs to:

1. **Connect to Rally API** - Without modifying VS Code settings files
2. **Avoid manual configuration** - Settings should come from environment variables
3. **Work in isolated environments** - Virtual machines or Docker containers

The solution: Environment variable support with hierarchical fallback.

## Quick Start for AI Agents

### Option 1: Using the Setup Script

The easiest way is to use the provided setup script:

```bash
#!/bin/bash
# Set your Rally credentials
export RALLY_API_KEY="your-api-key-here"
export RALLY_INSTANCE="https://your-rally-instance.com"
export RALLY_PROJECT_NAME="YourProjectName"

# Source the setup script
source test/example-ai-agent-setup.sh

# Now run your tests
npm test
```

### Option 2: Direct Environment Variables

If you prefer to set variables directly:

```bash
export ROBERT_RALLY_API_KEY="your-api-key"
export ROBERT_RALLY_INSTANCE="https://rally1.rallydev.com"
export ROBERT_RALLY_PROJECT_NAME="TestProject"
export ROBERT_DEBUG_MODE="true"

# Launch VS Code or run tests
code .
```

### Option 3: Environment File

Create a `.env.test` file (add to `.gitignore`):

```bash
# .env.test
ROBERT_RALLY_API_KEY=your-test-api-key
ROBERT_RALLY_INSTANCE=https://test-rally.com
ROBERT_RALLY_PROJECT_NAME=TestProject
ROBERT_DEBUG_MODE=true
```

Then load it in your test setup:

```bash
set -a  # Mark variables for export
source .env.test
set +a  # Unset the mark

# Now run tests
npm test
```

## How Settings Resolution Works

The Robert extension resolves configuration in this order:

```
┌─────────────────────────────────────┐
│ 1. VS Code Settings (highest)       │
│    (user-configured in settings.json)
└─────────────────────────────────────┘
                    ↓
        (if not set or empty)
                    ↓
┌─────────────────────────────────────┐
│ 2. Environment Variables            │
│    (ROBERT_RALLY_API_KEY, etc.)     │
└─────────────────────────────────────┘
                    ↓
        (if not set or empty)
                    ↓
┌─────────────────────────────────────┐
│ 3. Built-in Defaults (lowest)       │
│    (Extension defaults)             │
└─────────────────────────────────────┘
```

For AI agents:
- VS Code settings won't be set (empty environment)
- Environment variables are checked next
- If you set environment variables, they'll be used
- If not set, defaults are used (which would fail connection)

## Testing Rally Connection

To verify that your environment is correctly configured:

```bash
# 1. Check environment variables are set
env | grep ROBERT

# 2. Look for confirmation in logs
# Launch VS Code and check the "Robert" output channel
code .
```

The output channel will show messages like:
```
[Robert] ℹ️ INFO in SettingsManager:
Setting 'rallyApiKey' loaded from environment variable 'ROBERT_RALLY_API_KEY'
```

## Complete Example: GitHub Actions Workflow

```yaml
name: Test Robert Extension with AI Agent

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with Rally configuration
        env:
          ROBERT_RALLY_API_KEY: ${{ secrets.RALLY_API_KEY }}
          ROBERT_RALLY_INSTANCE: https://rally1.rallydev.com
          ROBERT_RALLY_PROJECT_NAME: ${{ secrets.RALLY_PROJECT }}
          ROBERT_DEBUG_MODE: "true"
        run: npm test
```

## Supported Environment Variables for AI Agents

### Essential for Rally Connection

| Variable | Required | Example |
|----------|----------|---------|
| `ROBERT_RALLY_API_KEY` | Yes | `your-api-key` |
| `ROBERT_RALLY_INSTANCE` | No | `https://rally1.rallydev.com` |
| `ROBERT_RALLY_PROJECT_NAME` | Yes | `MyProject` |

### Optional for Agent Testing

| Variable | Default | Example |
|----------|---------|---------|
| `ROBERT_DEBUG_MODE` | `false` | `true` |
| `ROBERT_AUTO_REFRESH` | `true` | `false` |
| `ROBERT_COLLABORATION_ENABLED` | `false` | `false` |
| `ROBERT_MAX_RESULTS` | `100` | `50` |

## Best Practices for AI Agent Testing

### 1. Use Secret Management

Never hardcode API keys. Use your CI/CD platform's secret management:

```yaml
# ✅ Good - using secrets
env:
  ROBERT_RALLY_API_KEY: ${{ secrets.RALLY_API_KEY }}

# ❌ Bad - hardcoded key
env:
  ROBERT_RALLY_API_KEY: "abc123xyz..."
```

### 2. Enable Debug Mode

For troubleshooting, enable debug logging:

```bash
export ROBERT_DEBUG_MODE="true"
export ROBERT_AUTO_REFRESH="false"  # Disable refresh during tests
```

### 3. Disable Collaboration Features

For isolated testing, disable collaboration:

```bash
export ROBERT_COLLABORATION_ENABLED="false"
export ROBERT_COLLABORATION_AUTO_CONNECT="false"
```

### 4. Validate Configuration Early

Check that all required variables are set before running tests:

```bash
#!/bin/bash
set -e

required_vars=(
    ROBERT_RALLY_API_KEY
    ROBERT_RALLY_PROJECT_NAME
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable not set: $var"
        exit 1
    fi
done

npm test
```

### 5. Log Configuration (Safely)

Log settings without exposing secrets:

```bash
echo "Configuration:"
echo "  Rally Instance: ${ROBERT_RALLY_INSTANCE:-default}"
echo "  Project: ${ROBERT_RALLY_PROJECT_NAME:-not set}"
echo "  API Key: ${ROBERT_RALLY_API_KEY:+***$(echo ${ROBERT_RALLY_API_KEY} | tail -c 4)}"
echo "  Debug Mode: ${ROBERT_DEBUG_MODE:-false}"
```

## Troubleshooting

### Settings not loading from environment

1. **Check variable names** - Must match exactly (case-sensitive)
2. **Verify export** - On Unix/Linux, use `export` keyword
3. **Check VS Code settings** - If VS Code settings exist, they override env vars
4. **Review logs** - Enable `ROBERT_DEBUG_MODE=true` for details

### Connection fails

1. **Verify API key** - Check if it's still valid
2. **Test URL** - Ensure Rally instance URL is accessible
3. **Project name** - Ensure project exists and is spelled correctly
4. **Network** - Verify agent can reach the Rally server

### Boolean values not working

Use these values for boolean settings:
- `true` - Enables the setting
- `false`, `0`, or empty - Disables the setting

## See Also

- [Environment Variables Reference](../ENVIRONMENT_VARIABLES.md)
- [SettingsManager Implementation](../src/SettingsManager.ts)
- [Rally API Documentation](https://rally1.rallydev.com/slm/doc/webservice)
