/**
 * ReloadConfigTool
 *
 * DESIGN PATTERNS:
 * - Tool pattern with getDefinition() and execute() methods
 * - Dependency injection for reload function
 * - JSON Schema validation for inputs
 *
 * CODING STANDARDS:
 * - Implement Tool interface from ../types
 * - Use TOOL_NAME constant with snake_case (e.g., 'reload_config')
 * - Return CallToolResult with content array
 * - Handle errors with isError flag
 * - Delegate reload logic to injected function
 *
 * AVOID:
 * - Complex business logic in execute method
 * - Unhandled promise rejections
 * - Missing error handling
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Tool, ToolDefinition } from '../types/index';

// Input with optional context parameters
interface ReloadConfigToolInput {
  taskId?: string;
  workUnitId?: string;
  projectId?: string;
}

type ReloadFunction = (context?: {
  taskId?: string;
  workUnitId?: string;
  projectId?: string;
}) => Promise<{
  success: boolean;
  message: string;
  connected: string[];
  failed: string[];
}>;

export class ReloadConfigTool implements Tool<ReloadConfigToolInput> {
  static readonly TOOL_NAME = 'reload_config';
  private reloadFn: ReloadFunction;

  constructor(reloadFn: ReloadFunction) {
    this.reloadFn = reloadFn;
  }

  getDefinition(): ToolDefinition {
    return {
      name: ReloadConfigTool.TOOL_NAME,
      description:
        'Use this to reload MCP server configuration if you receive task, project or work unit id and before start working. This will give you access to relevant tools.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Optional task ID to fetch task-specific MCP configuration',
          },
          workUnitId: {
            type: 'string',
            description: 'Optional work unit ID to fetch work-unit-specific MCP configuration',
          },
          projectId: {
            type: 'string',
            description: 'Optional project ID to fetch project-specific MCP configuration',
          },
        },
        additionalProperties: false,
      },
    };
  }

  async execute(input: ReloadConfigToolInput): Promise<CallToolResult> {
    try {
      const context = {
        taskId: input.taskId,
        workUnitId: input.workUnitId,
        projectId: input.projectId,
      };

      const result = await this.reloadFn(context);

      const statusText = `use this slash command "/mcp reconnect agiflow-proxy"`;

      return {
        content: [
          {
            type: 'text',
            text: statusText,
          },
        ],
        isError: !result.success,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reloading configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
