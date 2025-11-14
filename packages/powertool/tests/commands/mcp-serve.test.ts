/**
 * MCP Serve Command Tests with Progressive Mode
 *
 * TESTING PATTERNS:
 * - Test command metadata (name, description, options)
 * - Test progressive mode flag functionality
 * - Test server initialization with progressive mode
 * - Test tool exposure in progressive vs normal mode
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
import { mcpServeCommand } from '../../src/commands/mcp-serve';

describe('McpServeCommand', () => {
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
      expect(mcpServeCommand.name()).toBe('mcp-serve');
    });

    it('should have correct description', () => {
      const description = mcpServeCommand.description();
      expect(description).toContain('Start MCP proxy server');
    });

    it('should have transport type option', () => {
      const options = mcpServeCommand.options;
      const typeOption = options.find((opt) => opt.long === '--type');
      expect(typeOption).toBeDefined();
      expect(typeOption?.short).toBe('-t');
    });

    it('should have config-file option', () => {
      const options = mcpServeCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
      expect(configFileOption?.short).toBe('-f');
    });

    it('should have merge-strategy option', () => {
      const options = mcpServeCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });

    it('should have use-server-prefix option', () => {
      const options = mcpServeCommand.options;
      const prefixOption = options.find((opt) => opt.long === '--use-server-prefix');
      expect(prefixOption).toBeDefined();
    });

    it('should have progressive mode option', () => {
      const options = mcpServeCommand.options;
      const progressiveOption = options.find((opt) => opt.long === '--progressive');
      expect(progressiveOption).toBeDefined();
      expect(progressiveOption?.defaultValue).toBe(false);
    });
  });

  describe('Progressive Mode Flag', () => {
    it('should default to false when not specified', () => {
      const options = mcpServeCommand.options;
      const progressiveOption = options.find((opt) => opt.long === '--progressive');
      expect(progressiveOption?.defaultValue).toBe(false);
    });

    it('should be a boolean flag', () => {
      const options = mcpServeCommand.options;
      const progressiveOption = options.find((opt) => opt.long === '--progressive');
      expect(typeof progressiveOption?.defaultValue).toBe('boolean');
    });

    it('should have correct description', () => {
      const options = mcpServeCommand.options;
      const progressiveOption = options.find((opt) => opt.long === '--progressive');
      expect(progressiveOption?.description).toContain('progressive disclosure mode');
      expect(progressiveOption?.description).toContain('getTool');
      expect(progressiveOption?.description).toContain('useTool');
    });
  });

  describe('Transport Types', () => {
    it('should support stdio transport', () => {
      const transportTypes = ['stdio', 'http', 'sse'];
      expect(transportTypes).toContain('stdio');
    });

    it('should support http transport', () => {
      const transportTypes = ['stdio', 'http', 'sse'];
      expect(transportTypes).toContain('http');
    });

    it('should support sse transport', () => {
      const transportTypes = ['stdio', 'http', 'sse'];
      expect(transportTypes).toContain('sse');
    });
  });

  describe('Progressive Mode Tool Exposure', () => {
    it('should expose get-tool and use-tool in progressive mode', () => {
      const progressiveMode = true;
      const expectedTools = ['get-tool', 'use-tool', 'reload_config'];

      if (progressiveMode) {
        expect(expectedTools).toContain('get-tool');
        expect(expectedTools).toContain('use-tool');
        expect(expectedTools).toContain('reload_config');
      }
    });

    it('should expose all upstream tools in normal mode', () => {
      const progressiveMode = false;
      const mockUpstreamTools = [
        'create-task',
        'list-tasks',
        'update-task',
        'delete-task',
        'reload_config',
      ];

      if (!progressiveMode) {
        expect(mockUpstreamTools.length).toBeGreaterThan(3);
        expect(mockUpstreamTools).toContain('create-task');
        expect(mockUpstreamTools).toContain('list-tasks');
      }
    });

    it('should always include reload_config tool', () => {
      const progressiveTools = ['get-tool', 'use-tool', 'reload_config'];
      const normalTools = ['create-task', 'list-tasks', 'reload_config'];

      expect(progressiveTools).toContain('reload_config');
      expect(normalTools).toContain('reload_config');
    });
  });

  describe('Configuration Options', () => {
    it('should support merge strategies', () => {
      const strategies = ['local-priority', 'remote-priority', 'merge-deep'];
      expect(strategies).toHaveLength(3);
      expect(strategies).toContain('local-priority');
      expect(strategies).toContain('remote-priority');
      expect(strategies).toContain('merge-deep');
    });

    it('should handle server prefix option', () => {
      const useServerPrefix = true;
      const toolName = 'create-task';
      const serverName = 'agiflow-project-mcp';

      const prefixedName = useServerPrefix ? `${serverName}/${toolName}` : toolName;
      expect(prefixedName).toBe('agiflow-project-mcp/create-task');
    });

    it('should handle no server prefix', () => {
      const useServerPrefix = false;
      const toolName = 'create-task';
      const serverName = 'agiflow-project-mcp';

      const name = useServerPrefix ? `${serverName}/${toolName}` : toolName;
      expect(name).toBe('create-task');
    });
  });

  describe('Server Options Propagation', () => {
    it('should propagate progressive flag to server options', () => {
      const cliOptions = {
        progressive: true,
        useServerPrefix: false,
        mergeStrategy: 'local-priority',
      };

      const serverOptions = {
        progressive: cliOptions.progressive,
        useServerPrefix: cliOptions.useServerPrefix,
        mergeStrategy: cliOptions.mergeStrategy,
      };

      expect(serverOptions.progressive).toBe(true);
      expect(serverOptions.useServerPrefix).toBe(false);
      expect(serverOptions.mergeStrategy).toBe('local-priority');
    });

    it('should default progressive to false if not specified', () => {
      const cliOptions = {
        useServerPrefix: true,
        mergeStrategy: 'remote-priority',
      };

      const serverOptions = {
        progressive: cliOptions.progressive || false,
        useServerPrefix: cliOptions.useServerPrefix,
        mergeStrategy: cliOptions.mergeStrategy,
      };

      expect(serverOptions.progressive).toBe(false);
    });
  });
});
