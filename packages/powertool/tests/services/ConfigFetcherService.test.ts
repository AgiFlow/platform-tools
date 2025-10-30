/**
 * ConfigFetcherService Tests
 *
 * TESTING PATTERNS:
 * - Unit tests with mocked dependencies
 * - Test each method independently
 * - Cover success cases, edge cases, and error handling
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Arrange-Act-Assert pattern
 * - Mock external dependencies
 * - Test behavior, not implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigFetcherService } from '../../src/services/ConfigFetcherService';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ConfigFetcherService', () => {
  let testConfigPath: string;

  beforeEach(async () => {
    // Create a temporary config file for testing
    const tempDir = join(tmpdir(), 'powertool-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
    testConfigPath = join(tempDir, 'test-config.json');

    const testConfig = {
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['test.js'],
        },
      },
    };

    await writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  it('should create service with config file path', () => {
    const service = new ConfigFetcherService({
      configFilePath: testConfigPath,
    });

    expect(service).toBeDefined();
  });

  it('should fetch configuration from file', async () => {
    const service = new ConfigFetcherService({
      configFilePath: testConfigPath,
    });

    const config = await service.fetchConfiguration();

    expect(config).toBeDefined();
    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers['test-server']).toBeDefined();
  });

  it('should throw error when no config source provided', () => {
    // Temporarily remove environment variables
    const originalConfigUrl = process.env.AGIFLOW_MCP_CONFIG_URL;
    const originalProxyEndpoint = process.env.AGIFLOW_MCP_PROXY_ENDPOINT;
    delete process.env.AGIFLOW_MCP_CONFIG_URL;
    delete process.env.AGIFLOW_MCP_PROXY_ENDPOINT;

    expect(() => {
      new ConfigFetcherService({});
    }).toThrow();

    // Restore environment variables
    if (originalConfigUrl) process.env.AGIFLOW_MCP_CONFIG_URL = originalConfigUrl;
    if (originalProxyEndpoint) process.env.AGIFLOW_MCP_PROXY_ENDPOINT = originalProxyEndpoint;
  });
});
