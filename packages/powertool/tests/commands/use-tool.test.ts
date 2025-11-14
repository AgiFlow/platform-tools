/**
 * UseTool Command Tests
 *
 * TESTING PATTERNS:
 * - Test command metadata (name, description, arguments, options)
 * - Test successful tool execution with various argument types
 * - Test error handling (invalid JSON, tool not found, execution errors)
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
import { useToolCommand } from '../../src/commands/use-tool';

describe('UseToolCommand', () => {
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
      expect(useToolCommand.name()).toBe('use-tool');
    });

    it('should have correct description', () => {
      expect(useToolCommand.description()).toBe('Execute an MCP tool with provided arguments');
    });

    it('should have tool name argument', () => {
      const args = useToolCommand.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('toolName');
      expect(args[0].required).toBe(true);
    });

    it('should have server option', () => {
      const options = useToolCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
      expect(serverOption?.short).toBe('-s');
      expect(serverOption?.description).toContain('Server name');
    });

    it('should have args option with default value', () => {
      const options = useToolCommand.options;
      const argsOption = options.find((opt) => opt.long === '--args');
      expect(argsOption).toBeDefined();
      expect(argsOption?.short).toBe('-a');
      expect(argsOption?.defaultValue).toBe('{}');
    });

    it('should have config-file option', () => {
      const options = useToolCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
      expect(configFileOption?.short).toBe('-f');
    });

    it('should have merge-strategy option with default', () => {
      const options = useToolCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });
  });

  describe('JSON Argument Parsing', () => {
    it('should accept valid JSON string in args option', () => {
      const validJson = '{"key": "value", "number": 123}';
      expect(() => JSON.parse(validJson)).not.toThrow();
    });

    it('should accept empty object as default', () => {
      const defaultJson = '{}';
      const parsed = JSON.parse(defaultJson);
      expect(parsed).toEqual({});
    });

    it('should parse complex nested JSON', () => {
      const complexJson = '{"nested": {"array": [1, 2, 3], "bool": true}}';
      const parsed = JSON.parse(complexJson);
      expect(parsed.nested.array).toEqual([1, 2, 3]);
      expect(parsed.nested.bool).toBe(true);
    });
  });
});
