/**
 * ConfigFetcherService
 *
 * DESIGN PATTERNS:
 * - Service pattern for business logic encapsulation
 * - Single responsibility principle
 * - Caching pattern for performance optimization
 *
 * CODING STANDARDS:
 * - Use async/await for asynchronous operations
 * - Throw descriptive errors for error cases
 * - Keep methods focused and well-named
 * - Document complex logic with comments
 *
 * AVOID:
 * - Mixing concerns (keep focused on single domain)
 * - Direct tool implementation (services should be tool-agnostic)
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { RemoteMcpConfiguration } from '../types/index.js';
import { parseMcpConfig } from '../utils/mcpConfigSchema.js';

export interface ConfigFetcherOptions {
  configUrl?: string;
  configFilePath?: string;
  headers?: Record<string, string>;
  cacheTtlMs?: number;
  /**
   * Strategy for merging remote and local configs when both are provided
   * - 'local-priority': Local config overrides remote (default)
   * - 'remote-priority': Remote config overrides local
   * - 'merge-deep': Deep merge both configs (local overrides on conflict)
   */
  mergeStrategy?: 'local-priority' | 'remote-priority' | 'merge-deep';
}

/**
 * Service for fetching and caching MCP server configurations
 * Supports both remote URLs and local file paths
 */
export class ConfigFetcherService {
  private configUrl?: string;
  private configFilePath?: string;
  private headers: Record<string, string>;
  private cacheTtlMs: number;
  private cachedConfig: RemoteMcpConfiguration | null = null;
  private lastFetchTime: number = 0;
  private organizationId?: string;
  private baseUrl?: string;
  private mergeStrategy: 'local-priority' | 'remote-priority' | 'merge-deep';

  constructor(options: ConfigFetcherOptions) {
    this.configUrl = options.configUrl;
    this.configFilePath = options.configFilePath;
    this.headers = options.headers || {};
    this.cacheTtlMs = options.cacheTtlMs || 60000; // Default 1 minute cache
    this.mergeStrategy = options.mergeStrategy || 'local-priority'; // Default to local overrides remote

    // Fall back to environment variables if no configUrl or configFilePath provided
    // Priority: AGIFLOW_MCP_CONFIG_URL (reload context) > AGIFLOW_MCP_PROXY_ENDPOINT (default)
    if (!this.configUrl && !this.configFilePath) {
      this.configUrl = process.env.AGIFLOW_MCP_CONFIG_URL || process.env.AGIFLOW_MCP_PROXY_ENDPOINT;
    }

    // Fall back to environment variable for API key if not provided
    if (process.env.AGIFLOW_MCP_API_KEY && !this.headers['x-api-key']) {
      this.headers['x-api-key'] = process.env.AGIFLOW_MCP_API_KEY;
    }

    if (!this.configUrl && !this.configFilePath) {
      throw new Error(
        'Either configUrl, configFilePath, AGIFLOW_MCP_CONFIG_URL, or AGIFLOW_MCP_PROXY_ENDPOINT environment variable must be provided',
      );
    }

    // Extract organizationId and baseUrl from configUrl if provided
    if (this.configUrl) {
      this.extractOrganizationContext(this.configUrl);
    }
  }

  /**
   * Extract organizationId and baseUrl from the initial config URL
   * Supports patterns like:
   * - https://api.agiflow.io/api/v1/organizations/123/mcp-configs
   * - https://api.agiflow.io (will use as base URL)
   */
  private extractOrganizationContext(url: string): void {
    const orgPattern = /\/organizations\/([^/]+)/;
    const match = url.match(orgPattern);

    if (match) {
      this.organizationId = match[1];
      // Extract base URL (everything before /api/v1/organizations)
      const apiIndex = url.indexOf('/api/v1/organizations');
      if (apiIndex !== -1) {
        this.baseUrl = url.substring(0, apiIndex);
      }
    } else {
      // If no organizationId in URL, treat entire URL as base URL
      // Remove trailing /api/v1/mcp-configs if present
      this.baseUrl = url.replace(/\/api\/v1\/mcp-configs$/, '');
    }
  }

  /**
   * Fetch MCP configuration from remote URL or local file with caching
   * Supports merging both remote and local configurations based on mergeStrategy
   * @param context Optional context parameters (taskId, workUnitId, projectId) to fetch specific configurations
   */
  async fetchConfiguration(context?: {
    taskId?: string;
    workUnitId?: string;
    projectId?: string;
  }): Promise<RemoteMcpConfiguration> {
    const now = Date.now();

    // Return cached config if still valid and no context parameters (context params should bypass cache)
    if (this.cachedConfig && now - this.lastFetchTime < this.cacheTtlMs && !context) {
      return this.cachedConfig;
    }

    let config: RemoteMcpConfiguration;

    // Load configurations from available sources
    const hasLocalConfig = !!this.configFilePath;
    const hasRemoteConfig = !!this.configUrl;

    if (hasLocalConfig && hasRemoteConfig) {
      // Both sources available - merge them
      const [localConfig, remoteConfig] = await Promise.all([
        this.loadFromFile(),
        this.loadFromUrl(context),
      ]);
      config = this.mergeConfigurations(localConfig, remoteConfig);
    } else if (hasLocalConfig) {
      // Only local config
      config = await this.loadFromFile();
    } else if (hasRemoteConfig) {
      // Only remote config
      config = await this.loadFromUrl(context);
    } else {
      throw new Error('No configuration source available');
    }

    // Validate configuration structure
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Invalid MCP configuration: missing or invalid mcpServers');
    }

    // Cache the configuration only if no context parameters
    if (!context) {
      this.cachedConfig = config;
      this.lastFetchTime = now;
    }

    return config;
  }

  /**
   * Load configuration from a local file
   */
  private async loadFromFile(): Promise<RemoteMcpConfiguration> {
    if (!this.configFilePath) {
      throw new Error('No config file path provided');
    }

    if (!existsSync(this.configFilePath)) {
      throw new Error(`Config file not found: ${this.configFilePath}`);
    }

    try {
      const content = await readFile(this.configFilePath, 'utf-8');
      const rawConfig = JSON.parse(content);

      // Parse and transform using Zod schema
      return parseMcpConfig(rawConfig) as RemoteMcpConfiguration;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load config file: ${error.message}`);
      }
      throw new Error('Failed to load config file: Unknown error');
    }
  }

  /**
   * Load configuration from a remote URL
   * @param context Optional context parameters to construct specific endpoint URLs
   */
  private async loadFromUrl(context?: {
    taskId?: string;
    workUnitId?: string;
    projectId?: string;
  }): Promise<RemoteMcpConfiguration> {
    if (!this.configUrl) {
      throw new Error('No config URL provided');
    }

    if (!this.baseUrl) {
      throw new Error('No base URL extracted from config URL');
    }

    try {
      // Construct the URL based on context parameters
      let url: string;

      if (!this.organizationId) {
        throw new Error(
          'No organizationId found in config URL. URL must contain /organizations/:organizationId',
        );
      }

      if (context?.taskId) {
        // /api/v1/organizations/:organizationId/tasks/:taskId/mcp-configs
        url = `${this.baseUrl}/api/v1/organizations/${this.organizationId}/tasks/${context.taskId}/mcp-configs`;
      } else if (context?.projectId) {
        // /api/v1/organizations/:organizationId/projects/:projectId/mcp-configs
        url = `${this.baseUrl}/api/v1/organizations/${this.organizationId}/projects/${context.projectId}/mcp-configs`;
      } else {
        // /api/v1/organizations/:organizationId/mcp-configs
        // Use the original configUrl if it's a full endpoint, otherwise construct it
        url = this.configUrl.endsWith('/mcp-configs')
          ? this.configUrl
          : `${this.baseUrl}/api/v1/organizations/${this.organizationId}/mcp-configs`;
      }

      const response = await fetch(url, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch MCP configuration: ${response.status} ${response.statusText}`,
        );
      }

      const rawConfig = await response.json();

      // Parse and transform using Zod schema
      return parseMcpConfig(rawConfig) as RemoteMcpConfiguration;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch MCP configuration from URL: ${error.message}`);
      }
      throw new Error('Failed to fetch MCP configuration from URL: Unknown error');
    }
  }

  /**
   * Merge two MCP configurations based on the configured merge strategy
   * @param localConfig Configuration loaded from local file
   * @param remoteConfig Configuration loaded from remote URL
   * @returns Merged configuration
   */
  private mergeConfigurations(
    localConfig: RemoteMcpConfiguration,
    remoteConfig: RemoteMcpConfiguration,
  ): RemoteMcpConfiguration {
    switch (this.mergeStrategy) {
      case 'local-priority':
        // Local servers override remote servers with the same name
        return {
          mcpServers: {
            ...remoteConfig.mcpServers,
            ...localConfig.mcpServers,
          },
        };

      case 'remote-priority':
        // Remote servers override local servers with the same name
        return {
          mcpServers: {
            ...localConfig.mcpServers,
            ...remoteConfig.mcpServers,
          },
        };

      case 'merge-deep': {
        // Deep merge: combine both, local overrides on conflict
        const merged: Record<string, any> = { ...remoteConfig.mcpServers };

        // Merge local servers, performing deep merge for servers with the same name
        for (const [serverName, localServerConfig] of Object.entries(localConfig.mcpServers)) {
          if (merged[serverName]) {
            // Server exists in both - deep merge the config
            const remoteServer = merged[serverName];
            const mergedConfig: any = {
              ...remoteServer.config,
              ...localServerConfig.config,
            };

            // Deep merge nested objects like env, headers
            const remoteEnv = 'env' in remoteServer.config ? remoteServer.config.env : undefined;
            const localEnv =
              'env' in localServerConfig.config ? localServerConfig.config.env : undefined;
            if (remoteEnv || localEnv) {
              mergedConfig.env = {
                ...(remoteEnv || {}),
                ...(localEnv || {}),
              };
            }

            const remoteHeaders =
              'headers' in remoteServer.config ? remoteServer.config.headers : undefined;
            const localHeaders =
              'headers' in localServerConfig.config ? localServerConfig.config.headers : undefined;
            if (remoteHeaders || localHeaders) {
              mergedConfig.headers = {
                ...(remoteHeaders || {}),
                ...(localHeaders || {}),
              };
            }

            merged[serverName] = {
              ...remoteServer,
              ...localServerConfig,
              config: mergedConfig,
            };
          } else {
            // Server only in local - add it
            merged[serverName] = localServerConfig;
          }
        }

        return { mcpServers: merged };
      }

      default:
        throw new Error(`Unknown merge strategy: ${this.mergeStrategy}`);
    }
  }

  /**
   * Clear the cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    const now = Date.now();
    return this.cachedConfig !== null && now - this.lastFetchTime < this.cacheTtlMs;
  }
}
