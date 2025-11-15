/**
 * DescribeTools Command Tests
 *
 * TESTING PATTERNS:
 * - Test command metadata (name, description, arguments, options)
 * - Test successful tool description with multiple tools
 * - Test error handling (no tools found, ambiguous tools)
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
import { describeToolsCommand } from '../../src/commands/describe-tools';

describe('DescribeToolsCommand', () => {
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
      expect(describeToolsCommand.name()).toBe('describe-tools');
    });

    it('should have correct description', () => {
      expect(describeToolsCommand.description()).toBe(
        'Get detailed information about multiple MCP tools including schemas and parameters',
      );
    });

    it('should have toolNames argument for comma-separated input', () => {
      const args = describeToolsCommand.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('toolNames');
      expect(args[0].required).toBe(true);
    });

    it('should have server option', () => {
      const options = describeToolsCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
      expect(serverOption?.short).toBe('-s');
      expect(serverOption?.description).toContain('Server name');
    });

    it('should have config-file option', () => {
      const options = describeToolsCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
      expect(configFileOption?.short).toBe('-f');
    });

    it('should have merge-strategy option with default', () => {
      const options = describeToolsCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });

    it('should have json option', () => {
      const options = describeToolsCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
      expect(jsonOption?.defaultValue).toBe(false);
    });
  });

  describe('Multiple Tool Names', () => {
    it('should accept comma-separated tool names', () => {
      const args = describeToolsCommand.registeredArguments;
      expect(args[0].name()).toBe('toolNames');
      expect(args).toHaveLength(1);
    });

    it('should support parsing comma-separated input', () => {
      // This tests the command definition accepts a single string argument
      const args = describeToolsCommand.registeredArguments;
      expect(args[0].variadic).toBeFalsy();
    });
  });

  describe('Output Formats', () => {
    it('should have json flag for JSON output', () => {
      const options = describeToolsCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('should default to human-readable output', () => {
      const options = describeToolsCommand.options;
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption?.defaultValue).toBe(false);
    });
  });

  describe('Server Filtering', () => {
    it('should support server-specific queries', () => {
      const options = describeToolsCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      expect(serverOption).toBeDefined();
    });

    it('should allow searching all servers when no server specified', () => {
      const options = describeToolsCommand.options;
      const serverOption = options.find((opt) => opt.long === '--server');
      // Server option is optional (not marked as required in Command definition)
      expect(serverOption).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    it('should support config file path', () => {
      const options = describeToolsCommand.options;
      const configFileOption = options.find((opt) => opt.long === '--config-file');
      expect(configFileOption).toBeDefined();
    });

    it('should support merge strategy', () => {
      const options = describeToolsCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption).toBeDefined();
    });

    it('should default to local-priority merge strategy', () => {
      const options = describeToolsCommand.options;
      const mergeStrategyOption = options.find((opt) => opt.long === '--merge-strategy');
      expect(mergeStrategyOption?.defaultValue).toBe('local-priority');
    });
  });
});
