#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server for Robert VS Code Extension
 * 
 * This server provides context about the Robert project to AI coding assistants,
 * including information about Rally integration, collaboration features, 
 * project structure, and development workflows.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Server name and version
const SERVER_NAME = 'robert-mcp-server';
const SERVER_VERSION = '0.1.0';

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Validate that a path is within the project root (prevent path traversal)
 */
function validatePath(relativePath: string): string {
  // Resolve the full path
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  
  // Ensure the resolved path is within PROJECT_ROOT
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error(`Access denied: Path is outside project root`);
  }
  
  return fullPath;
}

/**
 * Read a file from the project
 */
function readProjectFile(relativePath: string): string {
  const fullPath = validatePath(relativePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * List files in a directory
 */
function listDirectory(relativePath: string): string[] {
  const fullPath = validatePath(relativePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Directory not found: ${relativePath}`);
  }
  
  if (!fs.statSync(fullPath).isDirectory()) {
    throw new Error(`Not a directory: ${relativePath}`);
  }
  
  return fs.readdirSync(fullPath);
}

/**
 * Get project structure recursively
 */
function getProjectStructure(relativePath: string = '', depth: number = 2): any {
  if (depth <= 0) return null;
  
  const fullPath = validatePath(relativePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const stats = fs.statSync(fullPath);
  
  if (!stats.isDirectory()) {
    return { type: 'file', name: path.basename(fullPath) };
  }
  
  const items = fs.readdirSync(fullPath)
    .filter(item => !item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'out')
    .map(item => {
      const itemPath = path.join(relativePath, item);
      return getProjectStructure(itemPath, depth - 1);
    })
    .filter(item => item !== null);
  
  return {
    type: 'directory',
    name: path.basename(fullPath) || 'root',
    children: items
  };
}

/**
 * Create and configure the MCP server
 */
async function main() {
  // Create server instance
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'read_file',
          description: 'Read a file from the Robert project',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to the file from project root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'list_directory',
          description: 'List contents of a directory in the Robert project',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to the directory from project root (empty string for root)',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_project_structure',
          description: 'Get the hierarchical structure of the Robert project',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to start from (empty string for root)',
              },
              depth: {
                type: 'number',
                description: 'Maximum depth to traverse (default: 2)',
              },
            },
          },
        },
        {
          name: 'get_rally_config',
          description: 'Get Rally integration configuration information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_extension_info',
          description: 'Get information about the Robert VS Code extension',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments');
    }

    try {
      switch (name) {
        case 'read_file': {
          if (typeof args.path !== 'string') {
            throw new Error('Invalid argument: path must be a string');
          }
          const content = readProjectFile(args.path);
          return {
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          };
        }

        case 'list_directory': {
          if (typeof args.path !== 'string') {
            throw new Error('Invalid argument: path must be a string');
          }
          const items = listDirectory(args.path);
          return {
            content: [
              {
                type: 'text',
                text: items.join('\n'),
              },
            ],
          };
        }

        case 'get_project_structure': {
          const depth = typeof args.depth === 'number' ? args.depth : 2;
          const pathStr = typeof args.path === 'string' ? args.path : '';
          const structure = getProjectStructure(pathStr, depth);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(structure, null, 2),
              },
            ],
          };
        }

        case 'get_rally_config': {
          const packageJson = JSON.parse(readProjectFile('package.json'));
          const rallyConfig = {
            settings: Object.keys(packageJson.contributes?.configuration?.properties || {})
              .filter(key => key.startsWith('robert.rally')),
            description: 'Rally integration settings for Robert extension',
          };
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(rallyConfig, null, 2),
              },
            ],
          };
        }

        case 'get_extension_info': {
          const packageJson = JSON.parse(readProjectFile('package.json'));
          const info = {
            name: packageJson.name,
            displayName: packageJson.displayName,
            version: packageJson.version,
            description: packageJson.description,
            publisher: packageJson.publisher,
            engines: packageJson.engines,
            categories: packageJson.categories,
            commands: packageJson.contributes?.commands?.map((cmd: any) => cmd.command) || [],
            views: packageJson.contributes?.views || {},
          };
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(info, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'file://README.md',
          name: 'Project README',
          description: 'Main README file with project overview',
          mimeType: 'text/markdown',
        },
        {
          uri: 'file://package.json',
          name: 'Package Configuration',
          description: 'NPM package configuration',
          mimeType: 'application/json',
        },
        {
          uri: 'file://server/README.md',
          name: 'Server README',
          description: 'Collaboration server documentation',
          mimeType: 'text/markdown',
        },
        {
          uri: 'file://AGENTS.md',
          name: 'Agents Documentation',
          description: 'Documentation for AI agents',
          mimeType: 'text/markdown',
        },
        {
          uri: 'file://COLLABORATION.md',
          name: 'Collaboration Documentation',
          description: 'Collaboration features documentation',
          mimeType: 'text/markdown',
        },
      ],
    };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    
    if (!uri.startsWith('file://')) {
      throw new Error('Only file:// URIs are supported');
    }
    
    const relativePath = uri.substring(7); // Remove 'file://'
    const content = readProjectFile(relativePath);
    
    return {
      contents: [
        {
          uri,
          mimeType: uri.endsWith('.json') ? 'application/json' : 'text/markdown',
          text: content,
        },
      ],
    };
  });

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'understand_rally_integration',
          description: 'Learn about Rally integration in Robert extension',
        },
        {
          name: 'understand_collaboration',
          description: 'Learn about collaboration features',
        },
        {
          name: 'understand_architecture',
          description: 'Learn about the extension architecture',
        },
      ],
    };
  });

  // Get prompt content
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    
    switch (name) {
      case 'understand_rally_integration':
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Explain how Rally integration works in the Robert VS Code extension, including API configuration, data fetching, and caching mechanisms.',
              },
            },
          ],
        };
      
      case 'understand_collaboration':
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Explain the collaboration features in Robert, including the backend server, WebSocket integration, and real-time messaging.',
              },
            },
          ],
        };
      
      case 'understand_architecture':
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Explain the overall architecture of the Robert VS Code extension, including the extension host, webview providers, and React components.',
              },
            },
          ],
        };
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Robert MCP Server running on stdio');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
