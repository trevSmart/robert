# Testing Robert Extension with AI Agents

This guide explains how to set up the Robert extension for testing with automated AI agents in virtual environments.

## The Problem

When an AI agent needs to test the Robert extension, it needs to:

1. **Connect to Jira API** - Without modifying VS Code settings files
2. **Avoid manual configuration** - Settings should come from environment variables
3. **Work in isolated environments** - Virtual machines or Docker containers

The solution: Environment variable support with hierarchical fallback.

## Quick Start for AI Agents

### Option 1: Using the Setup Script

The easiest way is to use the provided setup script:

```bash
#!/bin/bash
# Set your Jira credentials
export JIRA_API_KEY="your-api-token"
export JIRA_INSTANCE="https://your-jira-instance.com"
export JIRA_PROJECT_NAME="YourProjectName"

# Source the setup script
source test/example-ai-agent-setup.sh

# Now run your tests
npm test
```

### Option 2: Direct Environment Variables

If you prefer to set variables directly:

```bash
export ROBERT_JIRA_EMAIL="you@example.com"
export ROBERT_JIRA_API_TOKEN="your-api-token"
export ROBERT_JIRA_BASE_URL="https://your-site.atlassian.net"
export ROBERT_JIRA_PROJECT_KEY="DSS"
export ROBERT_DEBUG_MODE="true"

# Launch VS Code or run tests
code .
```

### Option 3: Environment File

Create a `.env.test` file (add to `.gitignore`):

```bash
# .env.test
ROBERT_JIRA_EMAIL=you@example.com
ROBERT_JIRA_API_TOKEN=your-api-token
ROBERT_JIRA_BASE_URL=https://your-site.atlassian.net
ROBERT_JIRA_PROJECT_KEY=DSS
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
│    (ROBERT_JIRA_API_TOKEN, etc.)   │
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

## Testing Jira Connection

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
Setting 'jiraApiToken' loaded from environment variable 'ROBERT_JIRA_API_TOKEN'
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
      
      - name: Run tests with Jira configuration
        env:
          ROBERT_JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          ROBERT_JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          ROBERT_JIRA_BASE_URL: https://your-site.atlassian.net
          ROBERT_JIRA_PROJECT_KEY: ${{ secrets.JIRA_PROJECT }}
          ROBERT_DEBUG_MODE: "true"
        run: npm test
```

## Supported Environment Variables for AI Agents

### Essential for Jira Connection

| Variable | Required | Example |
|----------|----------|---------|
| `ROBERT_JIRA_EMAIL` | Yes | `you@example.com` |
| `ROBERT_JIRA_API_TOKEN` | Yes | `your-api-token` |
| `ROBERT_JIRA_BASE_URL` | No | `https://your-site.atlassian.net` |
| `ROBERT_JIRA_PROJECT_KEY` | Yes | `DSS` |

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
  ROBERT_JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
  ROBERT_JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}

# ❌ Bad - hardcoded key
env:
  ROBERT_JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
  ROBERT_JIRA_API_TOKEN: "abc123xyz..."
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
    ROBERT_JIRA_EMAIL
    ROBERT_JIRA_API_TOKEN
    ROBERT_JIRA_PROJECT_KEY
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
echo "  Jira Instance: ${ROBERT_JIRA_BASE_URL:-default}"
echo "  Project: ${ROBERT_JIRA_PROJECT_KEY:-not set}"
echo "  API Token: ${ROBERT_JIRA_API_TOKEN:+***$(echo ${ROBERT_JIRA_API_TOKEN} | tail -c 4)}"
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
2. **Test URL** - Ensure Jira instance URL is accessible
3. **Project name** - Ensure project exists and is spelled correctly
4. **Network** - Verify agent can reach the Jira server

### Boolean values not working

Use these values for boolean settings:
- `true` - Enables the setting
- `false`, `0`, or empty - Disables the setting

## See Also

- [Environment Variables Reference](../ENVIRONMENT_VARIABLES.md)
- [SettingsManager Implementation](../src/SettingsManager.ts)
- [Jira API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
