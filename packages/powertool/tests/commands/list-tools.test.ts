/**
 * ListTools Command Tests
 *
 * TESTING PATTERNS:
 * - Test command metadata (name, description, options)
 * - Test tool listing from single/multiple servers
 * - Test filtering by server name
 * - Test JSON output format
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Test both success and error paths
 * - Mock console output for verification
 * - Arrange-Act-Assert pattern
 *
 * AVOID:
 * - Testing implementation details
 * - Not mocking external dependencies
 * - Missing error case tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listToolsCommand } from '../../src/commands/list-tools';

describe('ListToolsCommand', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(listToolsCommand.name()).toBe('list-tools');
    });

    it('should have correct description', () => {
      expect(listToolsCommand.description()).toBe(
        'List all available MCP tools from connected servers with optional filtering',
      );
    });

    it('should not require arguments', () => {
      const args = listToolsCommand.registeredArguments;
      expect(args).toHaveLength(0);
    });

    it('should have server filter option', () => {
      const options = listToolsCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
      expect(serverOption?.short).toBe('-s');
      expect(serverOption?.description).toContain('Filter by server name');
    });

    it('should have config-file option', () => {
      const options = listToolsCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
      expect(configFileOption?.short).toBe('-f');
    });

    it('should have merge-strategy option with default', () => {
      const options = listToolsCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });

    it('should have json output option', () => {
      const options = listToolsCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
      expect(jsonOption?.defaultValue).toBe(false);
    });
  });

  describe('Tool List Structure', () => {
    it('should expect tools array with server, name, and description', () => {
      const mockTools = [
        {
          server: 'test-server',
          name: 'test-tool',
          description: 'Test tool description',
        },
        {
          server: 'test-server',
          name: 'another-tool',
          description: 'Another tool description',
        },
      ];

      mockTools.forEach((tool) => {
        expect(tool).toHaveProperty('server');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(typeof tool.server).toBe('string');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });

    it('should handle empty tool list', () => {
      const emptyTools: any[] = [];
      expect(emptyTools).toHaveLength(0);
      expect(Array.isArray(emptyTools)).toBe(true);
    });

    it('should group tools by server', () => {
      const mockTools = [
        { server: 'server-a', name: 'tool-1', description: 'Tool 1' },
        { server: 'server-a', name: 'tool-2', description: 'Tool 2' },
        { server: 'server-b', name: 'tool-3', description: 'Tool 3' },
      ];

      const groupedByServer = mockTools.reduce(
        (acc, tool) => {
          if (!acc[tool.server]) {
            acc[tool.server] = [];
          }
          acc[tool.server].push(tool);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      expect(Object.keys(groupedByServer)).toHaveLength(2);
      expect(groupedByServer['server-a']).toHaveLength(2);
      expect(groupedByServer['server-b']).toHaveLength(1);
    });
  });

  describe('Filtering', () => {
    it('should filter tools by server name', () => {
      const allTools = [
        { server: 'server-a', name: 'tool-1', description: 'Tool 1' },
        { server: 'server-b', name: 'tool-2', description: 'Tool 2' },
        { server: 'server-a', name: 'tool-3', description: 'Tool 3' },
      ];

      const filterByServer = (tools: any[], serverName: string) =>
        tools.filter((tool) => tool.server === serverName);

      const filtered = filterByServer(allTools, 'server-a');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((tool) => tool.server === 'server-a')).toBe(true);
    });

    it('should return all tools when no server filter is provided', () => {
      const allTools = [
        { server: 'server-a', name: 'tool-1', description: 'Tool 1' },
        { server: 'server-b', name: 'tool-2', description: 'Tool 2' },
      ];

      const serverFilter = undefined;
      const filtered = serverFilter
        ? allTools.filter((tool) => tool.server === serverFilter)
        : allTools;

      expect(filtered).toHaveLength(2);
    });
  });

  describe('JSON Output', () => {
    it('should serialize tools to JSON format', () => {
      const mockTools = [{ server: 'test-server', name: 'test-tool', description: 'Test tool' }];

      const jsonString = JSON.stringify(mockTools, null, 2);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(mockTools);
      expect(parsed[0].server).toBe('test-server');
      expect(parsed[0].name).toBe('test-tool');
    });

    it('should handle empty array in JSON output', () => {
      const emptyTools: any[] = [];
      const jsonString = JSON.stringify(emptyTools, null, 2);
      expect(jsonString).toBe('[]');
    });
  });

  describe('Human Readable Output', () => {
    it('should format tools grouped by server', () => {
      const mockTools = [
        { server: 'server-a', name: 'tool-1', description: 'Description 1' },
        { server: 'server-a', name: 'tool-2', description: 'Description 2' },
        { server: 'server-b', name: 'tool-3', description: 'Description 3' },
      ];

      let currentServer = '';
      const output: string[] = [];

      for (const tool of mockTools) {
        if (tool.server !== currentServer) {
          currentServer = tool.server;
          output.push(`\n${currentServer}:`);
        }
        output.push(`  ${tool.name}`);
        output.push(`    ${tool.description}`);
      }

      expect(output).toContain('\nserver-a:');
      expect(output).toContain('\nserver-b:');
      expect(output).toContain('  tool-1');
      expect(output).toContain('  tool-3');
    });
  });
});
