/**
 * mcpConfigSchema Utility Tests
 *
 * TESTING PATTERNS:
 * - Test pure functions with various inputs
 * - Cover edge cases and invalid inputs
 * - Verify return values and types
 * - No mocking needed for pure functions
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Group related tests with nested describe blocks
 * - Test one function per describe block
 * - Include positive and negative test cases
 */

import { describe, it, expect } from 'vitest';
import {
  parseMcpConfig,
  transformClaudeCodeConfig,
  ClaudeCodeMcpConfigSchema,
} from '../../src/utils/mcpConfigSchema';

describe('mcpConfigSchema', () => {
  describe('parseMcpConfig', () => {
    it('should parse valid stdio server config', () => {
      const rawConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      };

      const result = parseMcpConfig(rawConfig);

      expect(result).toBeDefined();
      expect(result.mcpServers['test-server']).toBeDefined();
      expect(result.mcpServers['test-server'].transport).toBe('stdio');
    });

    it('should parse valid HTTP server config', () => {
      const rawConfig = {
        mcpServers: {
          'http-server': {
            url: 'http://localhost:3000',
            type: 'http',
          },
        },
      };

      const result = parseMcpConfig(rawConfig);

      expect(result).toBeDefined();
      expect(result.mcpServers['http-server']).toBeDefined();
      expect(result.mcpServers['http-server'].transport).toBe('http');
    });

    it('should parse valid SSE server config', () => {
      const rawConfig = {
        mcpServers: {
          'sse-server': {
            url: 'http://localhost:3000/sse',
            type: 'sse',
          },
        },
      };

      const result = parseMcpConfig(rawConfig);

      expect(result).toBeDefined();
      expect(result.mcpServers['sse-server']).toBeDefined();
      expect(result.mcpServers['sse-server'].transport).toBe('sse');
    });

    it('should skip disabled servers', () => {
      const rawConfig = {
        mcpServers: {
          'enabled-server': {
            command: 'node',
            args: ['server.js'],
          },
          'disabled-server': {
            command: 'node',
            args: ['disabled.js'],
            disabled: true,
          },
        },
      };

      const result = parseMcpConfig(rawConfig);

      expect(result.mcpServers['enabled-server']).toBeDefined();
      expect(result.mcpServers['disabled-server']).toBeUndefined();
    });

    it('should throw error for invalid config', () => {
      const invalidConfig = {
        mcpServers: 'not-an-object',
      };

      expect(() => parseMcpConfig(invalidConfig)).toThrow();
    });
  });

  describe('transformClaudeCodeConfig', () => {
    it('should transform stdio config correctly', () => {
      const claudeConfig = ClaudeCodeMcpConfigSchema.parse({
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            env: { NODE_ENV: 'test' },
          },
        },
      });

      const result = transformClaudeCodeConfig(claudeConfig);

      expect(result.mcpServers['test-server'].transport).toBe('stdio');
      expect(result.mcpServers['test-server'].config).toEqual({
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'test' },
      });
    });

    it('should transform HTTP config correctly', () => {
      const claudeConfig = ClaudeCodeMcpConfigSchema.parse({
        mcpServers: {
          'http-server': {
            url: 'http://localhost:3000',
            headers: { 'X-Api-Key': 'test' },
          },
        },
      });

      const result = transformClaudeCodeConfig(claudeConfig);

      expect(result.mcpServers['http-server'].transport).toBe('http');
      expect(result.mcpServers['http-server'].config).toEqual({
        url: 'http://localhost:3000',
        headers: { 'X-Api-Key': 'test' },
      });
    });
  });
});
