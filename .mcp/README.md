# MCP Server for Robert VS Code Extension

This directory contains the MCP (Model Context Protocol) server configuration for the Robert VS Code extension. The MCP server provides rich context about the project to AI coding assistants, enabling better code suggestions and understanding.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that standardizes how AI assistants interact with development tools and project context. It allows AI coding agents to:

- Understand project structure and architecture
- Access documentation and configuration files
- Learn about Rally integration and collaboration features
- Provide more accurate and context-aware assistance

## Setup

### 1. Install Dependencies

The MCP server requires the Model Context Protocol SDK:

```bash
cd server
npm install
```

This will install `@modelcontextprotocol/sdk` and other dependencies.

### 2. Build the Server

Build the MCP server along with other server components:

```bash
cd server
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Configure Your AI Assistant

The MCP server is configured in `.mcp/config.json`. Most AI assistants (like Claude Desktop, GitHub Copilot, etc.) can discover and use this configuration automatically.

For manual configuration, add this to your AI assistant's MCP settings:

```json
{
  "mcpServers": {
    "robert": {
      "command": "node",
      "args": ["server/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 4. Test the Server

You can test the MCP server manually:

```bash
cd server
npm run mcp
```

The server will start and wait for MCP protocol messages on stdin/stdout.

## Features

The Robert MCP server provides the following capabilities:

### Tools

- **read_file**: Read any file from the project
- **list_directory**: List contents of project directories
- **get_project_structure**: Get hierarchical project structure
- **get_rally_config**: Get Rally integration configuration
- **get_extension_info**: Get VS Code extension metadata

### Resources

Pre-defined resources that can be queried:

- `file://README.md` - Project README
- `file://package.json` - Package configuration
- `file://server/README.md` - Server documentation
- `file://AGENTS.md` - AI agents documentation
- `file://COLLABORATION.md` - Collaboration features

### Prompts

Context-aware prompts for common questions:

- `understand_rally_integration` - Learn about Rally integration
- `understand_collaboration` - Learn about collaboration features
- `understand_architecture` - Learn about extension architecture

## Usage in AI Assistants

Once configured, AI assistants can:

1. **Ask about the project structure**:
   - "Show me the project structure"
   - "What files are in the src directory?"

2. **Read project files**:
   - "Read the main extension file"
   - "Show me the Rally integration code"

3. **Understand configurations**:
   - "What Rally settings are available?"
   - "How is the extension configured?"

4. **Get contextual help**:
   - "Explain the Rally integration"
   - "How does collaboration work?"

## Development

### Adding New Tools

To add new tools to the MCP server:

1. Open `server/src/mcp-server.ts`
2. Add tool definition in `ListToolsRequestSchema` handler
3. Add tool implementation in `CallToolRequestSchema` handler
4. Rebuild: `npm run build`

### Adding New Resources

To expose new project files as resources:

1. Add resource definition in `ListResourcesRequestSchema` handler
2. The `ReadResourceRequestSchema` handler will automatically serve them

### Adding New Prompts

To add new contextual prompts:

1. Add prompt definition in `ListPromptsRequestSchema` handler
2. Add prompt content in `GetPromptRequestSchema` handler

## Troubleshooting

### Server won't start

- Ensure dependencies are installed: `npm install`
- Ensure server is built: `npm run build`
- Check that `dist/mcp-server.js` exists

### AI assistant can't connect

- Verify the path in `.mcp/config.json` is correct
- Check that Node.js is in your PATH
- Review AI assistant's MCP configuration logs

### Tools return errors

- Check file paths are relative to project root
- Ensure the project files exist
- Review error messages in the assistant's output

## Architecture

```
.mcp/
  └── config.json          # MCP server configuration

server/
  ├── src/
  │   └── mcp-server.ts    # MCP server implementation
  └── dist/
      └── mcp-server.js    # Compiled MCP server
```

The MCP server runs as a separate Node.js process that communicates via stdin/stdout using the Model Context Protocol. It provides read-only access to project context and never modifies files.

## Security

- The MCP server has **read-only** access to project files
- It cannot modify, delete, or create files
- It runs in the same security context as your development environment
- No external network access is required

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Robert Extension Documentation](../README.md)

## License

For IBM internal use only.
