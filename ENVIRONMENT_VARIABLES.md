# Environment Variables Configuration

Robert supports environment variables for configuring Jira connection settings and other options. This is especially useful for automated testing, CI/CD pipelines, and running the extension in virtual environments.

## Priority Order

Settings are resolved in this priority order:

1. **VS Code Settings** (highest priority) - User-configured values in VS Code settings
2. **Environment Variables** (middle priority) - System environment variables
3. **Default Values** (lowest priority) - Built-in defaults

This means if you set a value in VS Code settings, it will always be used even if an environment variable is set.

## Supported Environment Variables

### Provider Selection

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_PROVIDER` | string | `jira` | Data backend: `jira` or `rally` (the `robert.provider` setting takes priority) |

### Rally Configuration (used when provider is `rally`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_RALLY_API_KEY` | string | `""` | Rally API key (required) |
| `ROBERT_RALLY_INSTANCE` | string | `https://eu1.rallydev.com` | Rally instance URL |
| `ROBERT_RALLY_PROJECT_NAME` | string | `""` | Rally project name |

### Jira Configuration (used when provider is `jira`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_JIRA_EMAIL` | string | `""` | Atlassian account email used with the API token (required) |
| `ROBERT_JIRA_API_TOKEN` | string | `""` | Jira Cloud API token (required) |
| `ROBERT_JIRA_BASE_URL` | string | `https://your-site.atlassian.net` | Jira Cloud base URL |
| `ROBERT_JIRA_PROJECT_KEY` | string | `""` | Jira project key (optional). Empty or unset means **all projects** (JQL `project is not EMPTY`). Previously defaulted to `DSS` |

### Extension Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_API_ENDPOINT` | string | `https://your-site.atlassian.net` | General API endpoint |
| `ROBERT_REFRESH_INTERVAL` | number | `30` | Auto-refresh interval in seconds (5-3600) |
| `ROBERT_MAX_RESULTS` | number | `100` | Maximum results per query (10-1000) |
| `ROBERT_AUTO_REFRESH` | boolean | `true` | Enable automatic refresh |
| `ROBERT_DEBUG_MODE` | boolean | `false` | Enable debug logging |
| `ROBERT_ADVANCED_FEATURES` | boolean | `false` | Enable advanced features |

### Collaboration Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_COLLABORATION_SERVER_URL` | string | `https://robert-8vdt.onrender.com` | Collaboration server URL |
| `ROBERT_COLLABORATION_ENABLED` | boolean | `false` | Enable collaboration features |
| `ROBERT_COLLABORATION_AUTO_CONNECT` | boolean | `true` | Auto-connect to collaboration server |

### UI Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_SHOW_OUTPUT_ON_STARTUP` | boolean | `false` | Show output channel on extension startup |
| `ROBERT_STATUS_BAR_SPRINT_DAYS` | boolean | `true` | Display sprint days left in status bar |

## Boolean Environment Variable Values

For boolean environment variables, the following values are recognized as `true`:
- `true` (case-insensitive)
- `1`
- `yes` (case-insensitive)

Any other value is treated as `false`.

## Usage Examples

### Basic Jira Connection Setup

Set up environment variables for automated agent testing:

```bash
export ROBERT_JIRA_EMAIL="you@example.com"
export ROBERT_JIRA_API_TOKEN="your-api-token"
export ROBERT_JIRA_BASE_URL="https://your-site.atlassian.net"
export ROBERT_JIRA_PROJECT_KEY="DSS"
```

### CI/CD Pipeline Configuration

For a GitHub Actions or similar CI/CD pipeline:

```yaml
env:
  ROBERT_JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
  ROBERT_JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
  ROBERT_JIRA_BASE_URL: https://your-site.atlassian.net
  ROBERT_JIRA_PROJECT_KEY: DSS
  ROBERT_DEBUG_MODE: "true"
```

### Local Development with Environment File

Create a `.env.local` file (don't commit this to version control):

```bash
ROBERT_JIRA_EMAIL=you@example.com
ROBERT_JIRA_API_TOKEN=your-api-token
ROBERT_JIRA_BASE_URL=https://your-site.atlassian.net
ROBERT_JIRA_PROJECT_KEY=DSS
ROBERT_DEBUG_MODE=true
```

Then source it before running VS Code:

```bash
source .env.local
code .
```

### Virtual Agent Testing

For automated testing environments (like an AI agent):

```bash
#!/bin/bash
export ROBERT_JIRA_EMAIL="you@example.com"
export ROBERT_JIRA_API_TOKEN="test-api-key"
export ROBERT_JIRA_BASE_URL="https://your-site.atlassian.net"
export ROBERT_JIRA_PROJECT_KEY="DSS"
export ROBERT_DEBUG_MODE="true"

# Launch VS Code with the extension
code .
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit API keys** - Use `.env.local` or `.env.test` files and add them to `.gitignore`
2. **Use secret management** - In CI/CD pipelines, use secret management systems (GitHub Secrets, GitLab CI/CD Secrets, etc.)
3. **Environment variables are visible** - Process environment variables are visible to child processes and may appear in logs
4. **Prefer VS Code Secret Storage** - For interactive use, VS Code's secret storage is more secure than environment variables

## Logging

When a setting is loaded from an environment variable instead of VS Code settings, it will be logged:

```
[Robert] ℹ️ INFO in SettingsManager:
Setting 'jiraApiToken' loaded from environment variable 'ROBERT_JIRA_API_TOKEN'
```

This appears in the Robert output channel, helping you debug configuration issues.

## Troubleshooting

### Settings not loading from environment variables

1. **Check variable name** - Variable names must match exactly (case-sensitive on Unix/Linux)
2. **Check VS Code settings** - VS Code settings have priority; they might be overriding your environment variables
3. **Verify export** - On Unix/Linux, use `export` to ensure variables are inherited by child processes
4. **Enable debug mode** - Set `ROBERT_DEBUG_MODE=true` to see detailed logging

### Values not parsed correctly

- For boolean values, use `true`, `false`, `1`, `0`, `yes`, or `no`
- For numeric values, use only digits (no quotes or units)
- For strings, you can omit quotes (they're not needed in environment variables)

### Testing environment variable configuration

```bash
# Verify variables are set
env | grep ROBERT

# Launch VS Code and check the "Robert" output channel for confirmation logs
code .
```

## See Also

- [VS Code Settings Guide](https://code.visualstudio.com/docs/getstarted/settings)
- [SettingsManager Source](src/SettingsManager.ts) - Implementation details
