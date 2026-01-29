# MCP Server Usage Examples

This document provides practical examples of using the Robert MCP server with AI coding assistants.

## Prerequisites

Make sure you've completed the setup:
```bash
cd server
npm install
npm run build
npm run test:mcp  # Verify setup
```

## Example 1: Understanding Project Structure

**You ask:**
> "Show me the structure of the Robert project"

**AI assistant uses:**
```javascript
// MCP tool: get_project_structure
{
  "path": "",
  "depth": 2
}
```

**AI assistant responds with:**
A hierarchical view of the project showing:
- `src/` - Extension source code
- `server/` - Collaboration server and MCP server
- `resources/` - Icons and images
- Configuration files

## Example 2: Reading the Extension Entry Point

**You ask:**
> "Show me the main extension file and explain how it works"

**AI assistant uses:**
```javascript
// MCP tool: read_file
{
  "path": "src/extension.ts"
}
```

**AI assistant responds with:**
The content of `src/extension.ts` and an explanation of:
- How the extension activates
- What commands are registered
- How webview providers are configured
- Rally data initialization

## Example 3: Learning About Rally Integration

**You ask:**
> "What Rally settings are available in Robert?"

**AI assistant uses:**
```javascript
// MCP tool: get_rally_config
{}
```

**AI assistant responds with:**
A list of Rally configuration options:
- `robert.rallyInstance` - Rally server URL
- `robert.rallyApiKey` - API authentication key
- `robert.rallyProjectName` - Project name
- Their descriptions and default values

## Example 4: Exploring the Webview Components

**You ask:**
> "What React components are in the webview directory?"

**AI assistant uses:**
```javascript
// MCP tool: list_directory
{
  "path": "src/webview"
}
```

**AI assistant responds with:**
A list of webview components:
- `MainWebview.tsx`
- `SettingsWebview.tsx`
- `LogoWebview.tsx`
- Component files and utilities

## Example 5: Understanding VS Code Extension Configuration

**You ask:**
> "What commands does the Robert extension provide?"

**AI assistant uses:**
```javascript
// MCP tool: get_extension_info
{}
```

**AI assistant responds with:**
Extension metadata including:
- Extension name and version
- Available commands (Open Main View, Show Output, etc.)
- Views and view containers
- Custom editor configuration

## Example 6: Reading Documentation

**You ask:**
> "Show me the collaboration server documentation"

**AI assistant uses:**
```javascript
// MCP resource: read_resource
{
  "uri": "file://server/README.md"
}
```

**AI assistant responds with:**
The complete server documentation explaining:
- REST API endpoints
- WebSocket events
- Database schema
- Setup instructions

## Example 7: Using Contextual Prompts

**You ask:**
> "Use the rally integration prompt"

**AI assistant uses:**
```javascript
// MCP prompt: understand_rally_integration
```

**AI assistant responds with:**
A detailed explanation of:
- How Rally API integration works
- Data fetching mechanisms
- Caching strategies
- Configuration requirements

## Example 8: Searching for Specific Code

**You ask:**
> "Find all TypeScript files in the source directory"

**AI assistant uses:**
```javascript
// MCP tool: list_directory
{
  "path": "src"
}
```

Then filters the results for `.ts` and `.tsx` files.

**AI assistant responds with:**
A filtered list of TypeScript source files.

## Example 9: Understanding Error Handling

**You ask:**
> "Show me how errors are handled in the extension"

**AI assistant uses:**
```javascript
// MCP tool: read_file
{
  "path": "src/ErrorHandler.ts"
}
```

**AI assistant responds with:**
The error handler code and explanation of:
- Centralized error logging
- Error decorators
- Global error capture
- Output channel integration

## Example 10: Getting Settings Manager Details

**You ask:**
> "How does settings management work?"

**AI assistant uses:**
```javascript
// MCP tool: read_file
{
  "path": "src/SettingsManager.ts"
}
```

**AI assistant responds with:**
The settings manager implementation showing:
- Singleton pattern
- VS Code configuration API integration
- Settings validation
- Persistence mechanism

## Advanced Usage

### Combining Multiple Tools

The AI assistant can chain multiple MCP tools:

1. **List directory** to find relevant files
2. **Read file** to get their contents
3. **Get project structure** for context
4. **Read resources** for documentation

### Using Prompts for Learning

The MCP server provides pre-configured prompts:

```
"understand_rally_integration"
"understand_collaboration"
"understand_architecture"
```

These give the AI assistant structured guidance for explaining complex topics.

### Exploring Server Code

Ask about the collaboration server:

**You ask:**
> "How does the WebSocket server work?"

**AI assistant:**
1. Lists server directory structure
2. Reads relevant service files
3. Explains the implementation
4. References the API documentation

## Tips for Effective Usage

### 1. Be Specific
❌ "Tell me about Robert"
✅ "Show me the Rally integration code in src/libs/rally/"

### 2. Ask for Context
❌ "Read extension.ts"
✅ "Read extension.ts and explain how it initializes Rally data"

### 3. Use Relative Paths
❌ "/home/user/robert/src/extension.ts"
✅ "src/extension.ts"

### 4. Leverage Prompts
❌ "How does Rally work?"
✅ "Use the understand_rally_integration prompt"

### 5. Explore Incrementally
1. Start with project structure
2. Drill down into specific directories
3. Read individual files
4. Ask for explanations

## Common Workflows

### Learning the Codebase

```
1. "Show me the project structure"
2. "What's in the src directory?"
3. "Read src/extension.ts"
4. "Explain how this extension activates"
5. "What Rally integration code exists?"
```

### Debugging an Issue

```
1. "Read the error handling code"
2. "Show me recent commits to ErrorHandler.ts"
3. "What Rally API calls are made?"
4. "Read the Rally service implementation"
5. "How are errors logged?"
```

### Adding a Feature

```
1. "What commands does the extension have?"
2. "Read the webview provider code"
3. "Show me Rally API integration"
4. "What settings are available?"
5. "Read the collaboration server API"
```

## Limitations

The MCP server provides **read-only** access:

✅ Can do:
- Read any project file
- List directory contents
- Get project metadata
- Access documentation

❌ Cannot do:
- Modify files
- Create files
- Delete files
- Execute commands
- Access files outside the project

## Troubleshooting Examples

### "File not found" Error

**Incorrect:**
```javascript
{ "path": "/src/extension.ts" }  // Leading slash
```

**Correct:**
```javascript
{ "path": "src/extension.ts" }   // Relative path
```

### "Directory not found" Error

**Check:**
1. Path is relative to project root
2. Directory exists: `ls -la src/`
3. No typos in directory name

### Tool Doesn't Return Expected Data

**Verify:**
1. Correct tool name
2. Required parameters provided
3. Parameters have correct types
4. File actually exists in repository

## Next Steps

- Read [.mcp/README.md](README.md) for technical details
- See [.mcp/QUICKSTART.md](QUICKSTART.md) for setup guide
- Check [../README.md](../README.md) for project overview
- Explore [../server/README.md](../server/README.md) for server docs

Happy coding with AI assistance! 🤖✨
