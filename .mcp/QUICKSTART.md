# MCP Server Quick Start Guide

This guide helps you get the Robert MCP server up and running with popular AI coding assistants.

## What You'll Get

Once configured, AI coding assistants will be able to:
- 🏗️ Understand the Robert extension architecture
- 📚 Access project documentation automatically
- 🔧 Learn about Rally integration and APIs
- 🤝 Understand collaboration features
- 📂 Browse project structure and files

## Prerequisites

1. **Node.js 18+** installed on your system
2. **Robert repository** cloned locally
3. **An AI assistant** that supports MCP (e.g., Claude Desktop, Cline, etc.)

## Setup Steps

### 1. Install Dependencies

```bash
cd robert/server
npm install
```

This installs the `@modelcontextprotocol/sdk` and other required packages.

### 2. Build the MCP Server

```bash
npm run build
```

This compiles the TypeScript MCP server to JavaScript.

### 3. Verify Installation

```bash
# Check the compiled server exists
ls -lh dist/mcp-server.js

# Try running it (it will wait for MCP input)
npm run mcp
# Press Ctrl+C to exit
```

### 4. Configure Your AI Assistant

#### Claude Desktop

1. Open Claude Desktop settings
2. Go to Developer → Edit Config
3. Add the Robert MCP server configuration:

```json
{
  "mcpServers": {
    "robert": {
      "command": "node",
      "args": ["/absolute/path/to/robert/server/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

Replace `/absolute/path/to/robert` with your actual path.

4. Restart Claude Desktop

#### Cline (VS Code Extension)

1. Open VS Code settings
2. Search for "Cline MCP"
3. Add the MCP server configuration to `cline.mcpServers`:

```json
{
  "robert": {
    "command": "node",
    "args": ["server/dist/mcp-server.js"],
    "cwd": "/absolute/path/to/robert"
  }
}
```

4. Reload the Cline extension

#### Other MCP-Compatible Assistants

Most MCP-compatible assistants can auto-discover the configuration from `.mcp/config.json` in the project root. Simply:

1. Open the Robert project in your editor
2. The assistant should detect the `.mcp/config.json` file
3. Enable the Robert MCP server when prompted

## Testing the Connection

Once configured, try asking your AI assistant:

```
Can you show me the Robert project structure?
```

```
What Rally integration settings are available in Robert?
```

```
Read the main extension file and explain how it works
```

If the MCP server is working, the assistant will be able to answer these questions accurately using the MCP tools.

## Available MCP Tools

The Robert MCP server provides these tools:

### 📖 `read_file`
Read any file from the Robert project.

**Example**: "Read the package.json file"

### 📁 `list_directory`
List contents of any directory in the project.

**Example**: "What files are in the src directory?"

### 🌳 `get_project_structure`
Get a hierarchical view of the project structure.

**Example**: "Show me the project structure"

### ⚙️ `get_rally_config`
Get information about Rally integration settings.

**Example**: "What Rally settings are available?"

### 📋 `get_extension_info`
Get VS Code extension metadata and configuration.

**Example**: "What commands does the Robert extension provide?"

## Available Resources

Pre-configured documentation resources:

- `file://README.md` - Main project README
- `file://package.json` - Package configuration
- `file://server/README.md` - Server documentation
- `file://AGENTS.md` - AI agents guide
- `file://COLLABORATION.md` - Collaboration features

## Available Prompts

Contextual prompts for common questions:

- `understand_rally_integration` - Learn about Rally integration
- `understand_collaboration` - Learn about collaboration features
- `understand_architecture` - Learn about extension architecture

## Troubleshooting

### "MCP server not found" or "Connection failed"

1. **Check the path**: Ensure the path in your AI assistant's config points to the correct location
   ```bash
   # Find your absolute path
   cd /path/to/robert
   pwd
   ```

2. **Verify the build**: Make sure the server is built
   ```bash
   ls server/dist/mcp-server.js
   ```

3. **Check Node.js**: Ensure Node.js is in your PATH
   ```bash
   which node
   node --version
   ```

### "Server starts but tools don't work"

1. **Check file permissions**: Ensure the MCP server can read project files
2. **Check project structure**: The server expects to be in `robert/server/dist/mcp-server.js`
3. **Review logs**: Check your AI assistant's MCP logs for errors

### "Tools return 'File not found' errors"

The MCP server uses paths relative to the project root. Make sure:
- You're using relative paths (e.g., `src/extension.ts`, not `/src/extension.ts`)
- The files exist in the repository
- You haven't misspelled the path

## Security Note

The MCP server provides **read-only** access to your project files. It cannot:
- Modify files
- Delete files
- Execute code (other than reading files)
- Access files outside the project directory
- Make network requests

## Next Steps

Now that your MCP server is running:

1. **Explore the project**: Ask your AI assistant to explain different parts of Robert
2. **Get coding help**: Request assistance with Rally integration or webview components
3. **Learn the architecture**: Use the prompts to understand how Robert works
4. **Customize**: Add new tools or resources in `server/src/mcp-server.ts` if needed

## Need Help?

- Check the [full MCP documentation](.mcp/README.md)
- Review the [server README](../server/README.md)
- See the [main project README](../README.md)

Happy coding with AI assistance! 🚀
