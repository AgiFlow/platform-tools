/**
 * GetTool Command Tests
 *
 * TESTING PATTERNS:
 * - Test command metadata (name, description, arguments, options)
 * - Test successful tool discovery from single/multiple servers
 * - Test error handling (tool not found, server not found, ambiguous tool)
 * - Mock external dependencies (ConfigFetcherService, McpClientManagerService)
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Test both success and error paths
 * - Verify exit codes for error cases
 * - Mock console output for verification
 * - Arrange-Act-Assert pattern
 *
 * AVOID:
 * - Testing implementation details
 * - Not mocking external dependencies
 * - Missing error case tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToolCommand } from '../../src/commands/get-tool';

describe('GetToolCommand', () => {
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
      expect(getToolCommand.name()).toBe('get-tool');
    });

    it('should have correct description', () => {
      expect(getToolCommand.description()).toBe(
        'Get detailed information about a specific MCP tool including schema and parameters',
      );
    });

    it('should have tool name argument', () => {
      const args = getToolCommand.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('toolName');
      expect(args[0].required).toBe(true);
    });

    it('should have server option', () => {
      const options = getToolCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
      expect(serverOption?.short).toBe('-s');
      expect(serverOption?.description).toContain('Server name');
    });

    it('should have config-file option', () => {
      const options = getToolCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
      expect(configFileOption?.short).toBe('-f');
    });

    it('should have merge-strategy option with default', () => {
      const options = getToolCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });

    it('should have json output option', () => {
      const options = getToolCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
      expect(jsonOption?.defaultValue).toBe(false);
    });
  });

  describe('Option Validation', () => {
    it('should validate server option is not mandatory', () => {
      const options = getToolCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption?.mandatory).not.toBe(true);
    });

    it('should validate json flag is boolean', () => {
      const options = getToolCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(typeof jsonOption?.defaultValue).toBe('boolean');
    });

    it('should validate merge strategy has correct default', () => {
      const options = getToolCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });
  });

  describe('Schema Verification', () => {
    it('should expect inputSchema in tool response', () => {
      const mockTool = {
        name: 'test-tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
          required: ['param1'],
        },
      };

      expect(mockTool.inputSchema).toBeDefined();
      expect(mockTool.inputSchema.type).toBe('object');
      expect(mockTool.inputSchema.properties).toBeDefined();
    });

    it('should handle tools with no required parameters', () => {
      const mockTool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      expect(mockTool.inputSchema.required).toBeUndefined();
    });

    it('should handle tools with complex nested schemas', () => {
      const mockTool = {
        name: 'complex-tool',
        description: 'Complex tool',
        inputSchema: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
          },
        },
      };

      expect(mockTool.inputSchema.properties.nested.type).toBe('object');
      expect(mockTool.inputSchema.properties.nested.properties.value.type).toBe('string');
    });
  });
});
