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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigFetcherService } from '../../src/services/ConfigFetcherService';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ConfigFetcherService', () => {
  let testConfigPath: string;

  beforeEach(async () => {
    // Create a temporary config file for testing
    const tempDir = join(tmpdir(), `powertool-test-${Date.now()}`);
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

  describe('Configuration Merging', () => {
    let localConfigPath: string;
    let remoteConfigUrl: string;
    let fetchMock: any;

    beforeEach(async () => {
      // Create local config file
      const tempDir = join(tmpdir(), `powertool-merge-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      localConfigPath = join(tempDir, 'local-config.json');

      const localConfig = {
        mcpServers: {
          'local-server': {
            command: 'node',
            args: ['local.js'],
          },
          'shared-server': {
            command: 'node',
            args: ['local-shared.js'],
            env: { LOCAL: 'true' },
          },
        },
      };

      await writeFile(localConfigPath, JSON.stringify(localConfig, null, 2));

      // Mock fetch for remote config
      remoteConfigUrl = 'https://api.agiflow.io/api/v1/organizations/test-org/mcp-configs';

      const remoteConfig = {
        mcpServers: {
          'remote-server': {
            command: 'node',
            args: ['remote.js'],
          },
          'shared-server': {
            command: 'node',
            args: ['remote-shared.js'],
            env: { REMOTE: 'true' },
          },
        },
      };

      fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => remoteConfig,
      });

      global.fetch = fetchMock;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should merge configs with local-priority strategy (default)', async () => {
      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: localConfigPath,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'local-priority',
      });

      const config = await service.fetchConfiguration();

      // Should have all three servers
      expect(Object.keys(config.mcpServers)).toHaveLength(3);
      expect(config.mcpServers['local-server']).toBeDefined();
      expect(config.mcpServers['remote-server']).toBeDefined();
      expect(config.mcpServers['shared-server']).toBeDefined();

      // Local server should override remote for shared-server
      expect(config.mcpServers['shared-server'].config.args).toEqual(['local-shared.js']);
      expect(config.mcpServers['shared-server'].config.env).toEqual({ LOCAL: 'true' });
    });

    it('should merge configs with remote-priority strategy', async () => {
      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: localConfigPath,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'remote-priority',
      });

      const config = await service.fetchConfiguration();

      // Should have all three servers
      expect(Object.keys(config.mcpServers)).toHaveLength(3);
      expect(config.mcpServers['local-server']).toBeDefined();
      expect(config.mcpServers['remote-server']).toBeDefined();
      expect(config.mcpServers['shared-server']).toBeDefined();

      // Remote server should override local for shared-server
      expect(config.mcpServers['shared-server'].config.args).toEqual(['remote-shared.js']);
      expect(config.mcpServers['shared-server'].config.env).toEqual({ REMOTE: 'true' });
    });

    it('should merge configs with merge-deep strategy', async () => {
      // Create a more complex config for deep merge testing
      const deepLocalConfig = {
        mcpServers: {
          'deep-server': {
            command: 'node',
            args: ['local.js'],
            env: { LOCAL_VAR: 'local', SHARED_VAR: 'local' },
          },
        },
      };

      const deepLocalPath = join(tmpdir(), `deep-local-${Date.now()}.json`);
      await writeFile(deepLocalPath, JSON.stringify(deepLocalConfig, null, 2));

      const deepRemoteConfig = {
        mcpServers: {
          'deep-server': {
            command: 'node',
            args: ['remote.js'],
            env: { REMOTE_VAR: 'remote', SHARED_VAR: 'remote' },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => deepRemoteConfig,
      });

      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: deepLocalPath,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'merge-deep',
      });

      const config = await service.fetchConfiguration();

      // Should deep merge the server config
      expect(config.mcpServers['deep-server']).toBeDefined();

      // Local args should override remote
      expect(config.mcpServers['deep-server'].config.args).toEqual(['local.js']);

      // Env should be merged with local overriding shared keys
      expect(config.mcpServers['deep-server'].config.env).toEqual({
        LOCAL_VAR: 'local',
        REMOTE_VAR: 'remote',
        SHARED_VAR: 'local', // Local overrides remote
      });
    });

    it('should work with only local config when merge strategy is set', async () => {
      const service = new ConfigFetcherService({
        configFilePath: localConfigPath,
        mergeStrategy: 'local-priority',
      });

      const config = await service.fetchConfiguration();

      // Should have only local servers
      expect(Object.keys(config.mcpServers)).toHaveLength(2);
      expect(config.mcpServers['local-server']).toBeDefined();
      expect(config.mcpServers['shared-server']).toBeDefined();
    });

    it('should work with only remote config when merge strategy is set', async () => {
      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'remote-priority',
      });

      const config = await service.fetchConfiguration();

      // Should have only remote servers
      expect(Object.keys(config.mcpServers)).toHaveLength(2);
      expect(config.mcpServers['remote-server']).toBeDefined();
      expect(config.mcpServers['shared-server']).toBeDefined();
    });

    it('should default to local-priority when no merge strategy specified', async () => {
      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: localConfigPath,
        headers: { 'x-api-key': 'test-key' },
        // No mergeStrategy specified
      });

      const config = await service.fetchConfiguration();

      // Should behave like local-priority (default)
      expect(config.mcpServers['shared-server'].config.args).toEqual(['local-shared.js']);
    });

    it('should handle HTTP/SSE server configs in merge', async () => {
      const httpLocalConfig = {
        mcpServers: {
          'http-server': {
            url: 'http://localhost:8080',
            type: 'http',
            headers: { 'X-Local': 'true' },
          },
        },
      };

      const httpLocalPath = join(tmpdir(), `http-local-${Date.now()}.json`);
      await writeFile(httpLocalPath, JSON.stringify(httpLocalConfig, null, 2));

      const httpRemoteConfig = {
        mcpServers: {
          'http-server': {
            url: 'https://remote.com',
            type: 'http',
            headers: { 'X-Remote': 'true' },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => httpRemoteConfig,
      });

      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: httpLocalPath,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'merge-deep',
      });

      const config = await service.fetchConfiguration();

      // Should deep merge HTTP server config
      expect(config.mcpServers['http-server'].config.url).toBe('http://localhost:8080');
      expect(config.mcpServers['http-server'].config.headers).toEqual({
        'X-Remote': 'true',
        'X-Local': 'true',
      });
    });

    it('should fetch both configs in parallel', async () => {
      const startTime = Date.now();

      const service = new ConfigFetcherService({
        configUrl: remoteConfigUrl,
        configFilePath: localConfigPath,
        headers: { 'x-api-key': 'test-key' },
        mergeStrategy: 'local-priority',
      });

      await service.fetchConfiguration();

      // Both configs should be fetched (mocked fetch should have been called)
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Should complete relatively quickly (parallel execution)
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
