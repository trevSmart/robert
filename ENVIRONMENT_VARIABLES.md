# Environment Variables Configuration

Robert supports environment variables for configuring Rally connection settings and other options. This is especially useful for automated testing, CI/CD pipelines, and running the extension in virtual environments.

## Priority Order

Settings are resolved in this priority order:

1. **VS Code Settings** (highest priority) - User-configured values in VS Code settings
2. **Environment Variables** (middle priority) - System environment variables
3. **Default Values** (lowest priority) - Built-in defaults

This means if you set a value in VS Code settings, it will always be used even if an environment variable is set.

## Supported Environment Variables

### Rally Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_RALLY_API_KEY` | string | `""` | Rally API authentication key (required for Rally connection) |
| `ROBERT_RALLY_INSTANCE` | string | `https://rally1.rallydev.com` | Rally server instance URL |
| `ROBERT_RALLY_PROJECT_NAME` | string | `""` | Target Rally project name |

### Extension Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ROBERT_API_ENDPOINT` | string | `https://rally.example.com` | General API endpoint |
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

### Basic Rally Connection Setup

Set up environment variables for automated agent testing:

```bash
export ROBERT_RALLY_API_KEY="your-api-key-here"
export ROBERT_RALLY_INSTANCE="https://rally1.rallydev.com"
export ROBERT_RALLY_PROJECT_NAME="Your Project Name"
```

### CI/CD Pipeline Configuration

For a GitHub Actions or similar CI/CD pipeline:

```yaml
env:
  ROBERT_RALLY_API_KEY: ${{ secrets.RALLY_API_KEY }}
  ROBERT_RALLY_INSTANCE: https://rally1.rallydev.com
  ROBERT_RALLY_PROJECT_NAME: MyProject
  ROBERT_DEBUG_MODE: "true"
```

### Local Development with Environment File

Create a `.env.local` file (don't commit this to version control):

```bash
ROBERT_RALLY_API_KEY=your-development-api-key
ROBERT_RALLY_INSTANCE=https://your-rally-instance.com
ROBERT_RALLY_PROJECT_NAME=TestProject
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
export ROBERT_RALLY_API_KEY="test-api-key"
export ROBERT_RALLY_INSTANCE="https://test-rally.example.com"
export ROBERT_RALLY_PROJECT_NAME="TestProject"
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
Setting 'rallyApiKey' loaded from environment variable 'ROBERT_RALLY_API_KEY'
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
