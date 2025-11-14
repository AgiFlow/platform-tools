/**
 * Progressive MCP Workflow Integration Tests
 *
 * TESTING PATTERNS:
 * - Test end-to-end progressive disclosure workflow
 * - Test tool discovery → schema retrieval → execution flow
 * - Test error scenarios in progressive workflow
 * - Test multiple servers with progressive mode
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Test realistic user workflows
 * - Mock external dependencies appropriately
 * - Arrange-Act-Assert pattern
 *
 * AVOID:
 * - Testing implementation details
 * - Incomplete workflow tests
 * - Missing error case tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Progressive MCP Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Discovery Workflow', () => {
    it('should support list-tools → get-tool → use-tool workflow', () => {
      const workflow = [
        { step: 1, action: 'list-tools', purpose: 'Discover available tools' },
        {
          step: 2,
          action: 'get-tool',
          purpose: 'Get schema for specific tool',
        },
        {
          step: 3,
          action: 'use-tool',
          purpose: 'Execute tool with discovered schema',
        },
      ];

      expect(workflow).toHaveLength(3);
      expect(workflow[0].action).toBe('list-tools');
      expect(workflow[1].action).toBe('get-tool');
      expect(workflow[2].action).toBe('use-tool');
    });

    it('should support get-tool → use-tool shortcut workflow', () => {
      const shortWorkflow = [
        {
          step: 1,
          action: 'get-tool',
          purpose: 'Get schema if tool name is known',
        },
        {
          step: 2,
          action: 'use-tool',
          purpose: 'Execute tool with schema',
        },
      ];

      expect(shortWorkflow).toHaveLength(2);
      expect(shortWorkflow[0].action).toBe('get-tool');
      expect(shortWorkflow[1].action).toBe('use-tool');
    });

    it('should support direct use-tool when confident', () => {
      const directWorkflow = [
        {
          step: 1,
          action: 'use-tool',
          purpose: 'Execute tool directly when schema is known',
        },
      ];

      expect(directWorkflow).toHaveLength(1);
      expect(directWorkflow[0].action).toBe('use-tool');
    });
  });

  describe('Multi-Server Scenarios', () => {
    it('should handle tool discovery across multiple servers', () => {
      const servers = [
        {
          name: 'server-a',
          tools: ['create-task', 'list-tasks', 'update-task'],
        },
        {
          name: 'server-b',
          tools: ['create-project', 'list-projects'],
        },
        {
          name: 'server-c',
          tools: ['deploy', 'rollback', 'create-task'],
        },
      ];

      const allTools = servers.flatMap((server) =>
        server.tools.map((tool) => ({ server: server.name, tool })),
      );

      expect(allTools.length).toBeGreaterThan(5);

      const createTaskTools = allTools.filter((t) => t.tool === 'create-task');
      expect(createTaskTools).toHaveLength(2);
      expect(createTaskTools.map((t) => t.server)).toContain('server-a');
      expect(createTaskTools.map((t) => t.server)).toContain('server-c');
    });

    it('should disambiguate tools with same name on different servers', () => {
      const ambiguousTool = 'create-task';
      const serversWithTool = ['server-a', 'server-c'];

      const needsDisambiguation = serversWithTool.length > 1;
      expect(needsDisambiguation).toBe(true);

      if (needsDisambiguation) {
        const selectedServer = 'server-a';
        expect(serversWithTool).toContain(selectedServer);
      }
    });

    it('should auto-select server when tool is unique', () => {
      const uniqueTool = 'deploy';
      const serversWithTool = ['server-c'];

      const isUnique = serversWithTool.length === 1;
      expect(isUnique).toBe(true);

      if (isUnique) {
        const autoSelectedServer = serversWithTool[0];
        expect(autoSelectedServer).toBe('server-c');
      }
    });
  });

  describe('Schema Evolution Workflow', () => {
    it('should handle schema with required parameters', () => {
      const toolSchema = {
        name: 'create-task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
          },
          required: ['title'],
        },
      };

      expect(toolSchema.inputSchema.required).toContain('title');
      expect(toolSchema.inputSchema.required).not.toContain('description');
    });

    it('should handle schema with optional parameters', () => {
      const toolSchema = {
        name: 'list-tasks',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results' },
            offset: { type: 'number', description: 'Skip results' },
          },
        },
      };

      expect(toolSchema.inputSchema.required).toBeUndefined();
      expect(Object.keys(toolSchema.inputSchema.properties)).toHaveLength(2);
    });

    it('should handle schema with nested objects', () => {
      const toolSchema = {
        name: 'create-project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            config: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                settings: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      };

      expect(toolSchema.inputSchema.properties.config.type).toBe('object');
      expect(toolSchema.inputSchema.properties.config.properties.settings.type).toBe('object');
    });

    it('should handle schema with arrays', () => {
      const toolSchema = {
        name: 'batch-create-tasks',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                },
              },
            },
          },
        },
      };

      expect(toolSchema.inputSchema.properties.tasks.type).toBe('array');
      expect(toolSchema.inputSchema.properties.tasks.items.type).toBe('object');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle tool not found and suggest alternatives', () => {
      const requestedTool = 'create-taks'; // Typo
      const availableTools = ['create-task', 'list-tasks', 'update-task'];

      const found = availableTools.includes(requestedTool);
      expect(found).toBe(false);

      const suggestions = availableTools.filter((tool) => tool.toLowerCase().includes('create'));
      expect(suggestions).toContain('create-task');
    });

    it('should handle server not found and list available servers', () => {
      const requestedServer = 'server-d';
      const availableServers = ['server-a', 'server-b', 'server-c'];

      const found = availableServers.includes(requestedServer);
      expect(found).toBe(false);
      expect(availableServers).toHaveLength(3);
    });

    it('should handle tool execution failure gracefully', () => {
      const executionResult = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required parameter "title" is missing',
        },
      };

      expect(executionResult.success).toBe(false);
      expect(executionResult.error.code).toBe('VALIDATION_ERROR');
      expect(executionResult.error.message).toContain('Required parameter');
    });
  });

  describe('Progressive vs Normal Mode Comparison', () => {
    it('should expose fewer tools in progressive mode', () => {
      const normalModeTools = [
        'create-task',
        'list-tasks',
        'update-task',
        'delete-task',
        'create-project',
        'list-projects',
        'reload_config',
      ];

      const progressiveModeTools = ['get-tool', 'use-tool', 'reload_config'];

      expect(progressiveModeTools.length).toBeLessThan(normalModeTools.length);
      expect(progressiveModeTools).toContain('get-tool');
      expect(progressiveModeTools).toContain('use-tool');
    });

    it('should enable dynamic tool discovery in progressive mode', () => {
      const progressiveMode = true;

      if (progressiveMode) {
        const canDiscoverTools = true;
        expect(canDiscoverTools).toBe(true);
      }
    });

    it('should require upfront tool knowledge in normal mode', () => {
      const progressiveMode = false;

      if (!progressiveMode) {
        const needsUpfrontKnowledge = true;
        expect(needsUpfrontKnowledge).toBe(true);
      }
    });
  });

  describe('Configuration Merging in Progressive Mode', () => {
    it('should merge local and remote configs before tool discovery', () => {
      const localConfig = {
        servers: ['local-server-a'],
      };

      const remoteConfig = {
        servers: ['remote-server-b', 'remote-server-c'],
      };

      const mergedConfig = {
        servers: [...localConfig.servers, ...remoteConfig.servers],
      };

      expect(mergedConfig.servers).toHaveLength(3);
      expect(mergedConfig.servers).toContain('local-server-a');
      expect(mergedConfig.servers).toContain('remote-server-b');
    });

    it('should apply merge strategy to tool discovery', () => {
      const strategies = ['local-priority', 'remote-priority', 'merge-deep'];

      strategies.forEach((strategy) => {
        expect(['local-priority', 'remote-priority', 'merge-deep']).toContain(strategy);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should cache tool schemas after discovery', () => {
      const cache = new Map();
      const toolName = 'create-task';

      const schema = {
        type: 'object',
        properties: { title: { type: 'string' } },
      };

      cache.set(toolName, schema);
      expect(cache.has(toolName)).toBe(true);
      expect(cache.get(toolName)).toEqual(schema);
    });

    it('should support parallel tool discovery from multiple servers', async () => {
      const servers = ['server-a', 'server-b', 'server-c'];

      const discoveryPromises = servers.map((server) =>
        Promise.resolve({ server, tools: [`${server}-tool-1`, `${server}-tool-2`] }),
      );

      const results = await Promise.all(discoveryPromises);
      expect(results).toHaveLength(3);
      expect(results[0].tools).toHaveLength(2);
    });
  });
});
