/**
 * GetToolTool - Progressive disclosure tool for discovering MCP tools
 *
 * DESIGN PATTERNS:
 * - Tool pattern with getDefinition() and execute() methods
 * - Dependency injection for client manager
 * - Progressive disclosure pattern
 *
 * CODING STANDARDS:
 * - Implement Tool interface from ../types
 * - Use TOOL_NAME constant with snake_case
 * - Return CallToolResult with content array
 * - Handle errors with isError flag
 *
 * AVOID:
 * - Complex business logic in execute method
 * - Unhandled promise rejections
 * - Missing error handling
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Tool, ToolDefinition } from '../types/index';
import type { McpClientManagerService } from '../services/McpClientManagerService';

interface GetToolToolInput {
  toolName: string;
  serverName?: string;
}

export class GetToolTool implements Tool<GetToolToolInput> {
  static readonly TOOL_NAME = 'get-tool';
  private clientManager: McpClientManagerService;
  private useServerPrefix: boolean;

  constructor(clientManager: McpClientManagerService, useServerPrefix: boolean = true) {
    this.clientManager = clientManager;
    this.useServerPrefix = useServerPrefix;
  }

  async getDefinition(): Promise<ToolDefinition> {
    const clients = this.clientManager.getAllClients();

    // Build server metadata descriptions with tool lists
    const serverDescriptions = await Promise.all(
      clients.map(async (client) => {
        try {
          const tools = await client.listTools();
          const toolList = tools.map(t => `  - ${t.name}`).join('\n');

          return `\n\n**Server: ${client.serverName}**\n- Transport: ${client.transport}\n- Available tools:${toolList ? '\n' + toolList : ''}`;
        } catch (error) {
          console.error(`Failed to list tools from ${client.serverName}:`, error);
          return `\n\n**Server: ${client.serverName}**\n- Transport: ${client.transport}\n`;
        }
      })
    );

    return {
      name: GetToolTool.TOOL_NAME,
      description: `Learn how to use tool a specific MCP tool before using it. Below are supported tools and capabilities.

**Available MCP Servers:**${serverDescriptions.join('')}

**Usage:**
Call this tool with a tool name (and optionally server name if there are duplicates) to get:
- Detailed tool description
- Input schema with all parameters
- Required vs optional parameters

Example: get-tool({ toolName: "list-tasks", serverName: "agiflow-proxy" })`,
      inputSchema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to get detailed information about',
          },
          serverName: {
            type: 'string',
            description: 'Optional server name to disambiguate when multiple servers have the same tool name',
          },
        },
        required: ['toolName'],
        additionalProperties: false,
      },
    };
  }

  async execute(input: GetToolToolInput): Promise<CallToolResult> {
    try {
      const { toolName, serverName } = input;
      const clients = this.clientManager.getAllClients();

      // If server name is specified, search only that server
      if (serverName) {
        const client = this.clientManager.getClient(serverName);
        if (!client) {
          return {
            content: [
              {
                type: 'text',
                text: `Server "${serverName}" not found. Available servers: ${clients.map(c => c.serverName).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        const tools = await client.listTools();
        const tool = tools.find(t => t.name === toolName);

        if (!tool) {
          return {
            content: [
              {
                type: 'text',
                text: `Tool "${toolName}" not found on server "${serverName}". Available tools: ${tools.map(t => t.name).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                server: serverName,
                tool: {
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema,
                },
              }, null, 2),
            },
          ],
        };
      }

      // Search all servers for the tool
      const matchingTools: Array<{ server: string; tool: any }> = [];

      for (const client of clients) {
        try {
          const tools = await client.listTools();
          const tool = tools.find(t => t.name === toolName);

          if (tool) {
            matchingTools.push({
              server: client.serverName,
              tool,
            });
          }
        } catch (error) {
          console.error(`Failed to list tools from ${client.serverName}:`, error);
        }
      }

      if (matchingTools.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Tool "${toolName}" not found on any connected server. Use get-tool without arguments to see available servers.`,
            },
          ],
          isError: true,
        };
      }

      if (matchingTools.length > 1) {
        return {
          content: [
            {
              type: 'text',
              text: `Multiple servers provide tool "${toolName}". Please specify serverName:\n\n${matchingTools.map(m => `- Server: ${m.server}\n  Description: ${m.tool.description}`).join('\n\n')}`,
            },
          ],
        };
      }

      // Single match found
      const match = matchingTools[0];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              server: match.server,
              tool: {
                name: match.tool.name,
                description: match.tool.description,
                inputSchema: match.tool.inputSchema,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting tool information: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
