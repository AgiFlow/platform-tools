/**
 * CacheService
 *
 * DESIGN PATTERNS:
 * - Service pattern for cache management
 * - Single responsibility principle
 * - File-based caching with TTL support
 *
 * CODING STANDARDS:
 * - Use async/await for asynchronous operations
 * - Handle file system errors gracefully
 * - Keep cache organized by server config hash
 * - Implement automatic cache expiration
 *
 * AVOID:
 * - Storing sensitive data in cache
 * - Unbounded cache growth
 * - Missing error handling for file operations
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { McpServerConfig } from '../types/index.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface McpServerCache {
  instruction?: string;
  tools: any[];
  resources: any[];
  prompts: any[];
}

/**
 * Service for caching MCP server data (tools, resources, prompts, instructions)
 */
export class CacheService {
  private cacheDir: string;
  private cacheTTL: number; // Time to live in milliseconds
  private enabled: boolean;

  constructor(options?: { ttl?: number; enabled?: boolean }) {
    this.cacheDir = join(tmpdir(), 'agiflow-powertool-cache');
    this.cacheTTL = options?.ttl || 60 * 60 * 1000; // Default: 1 hour
    this.enabled = options?.enabled !== undefined ? options.enabled : true;
  }

  /**
   * Generate a hash key from server configuration
   */
  private generateCacheKey(serverName: string, config: McpServerConfig): string {
    // Create a deterministic string representation of the config
    const configString = JSON.stringify({
      name: serverName,
      transport: config.transport,
      config: config.config,
    });

    // Generate SHA-256 hash
    return createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Get the cache file path for a given cache key
   */
  private getCacheFilePath(cacheKey: string): string {
    return join(this.cacheDir, `${cacheKey}.json`);
  }

  /**
   * Initialize cache directory
   */
  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get cached data for a server
   */
  async get(serverName: string, config: McpServerConfig): Promise<McpServerCache | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      await this.ensureCacheDir();

      const cacheKey = this.generateCacheKey(serverName, config);
      const cacheFilePath = this.getCacheFilePath(cacheKey);

      if (!existsSync(cacheFilePath)) {
        return null;
      }

      const cacheContent = await readFile(cacheFilePath, 'utf-8');
      const cacheEntry: CacheEntry<McpServerCache> = JSON.parse(cacheContent);

      // Check if cache has expired
      const now = Date.now();
      if (now > cacheEntry.expiresAt) {
        // Cache expired, delete it
        await unlink(cacheFilePath).catch(() => {
          // Ignore errors
        });
        return null;
      }

      console.error(
        `Cache hit for ${serverName} (expires in ${Math.round((cacheEntry.expiresAt - now) / 1000)}s)`,
      );
      return cacheEntry.data;
    } catch (error) {
      console.error(`Failed to read cache for ${serverName}:`, error);
      return null;
    }
  }

  /**
   * Set cached data for a server
   */
  async set(serverName: string, config: McpServerConfig, data: McpServerCache): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.ensureCacheDir();

      const cacheKey = this.generateCacheKey(serverName, config);
      const cacheFilePath = this.getCacheFilePath(cacheKey);

      const now = Date.now();
      const cacheEntry: CacheEntry<McpServerCache> = {
        data,
        timestamp: now,
        expiresAt: now + this.cacheTTL,
      };

      await writeFile(cacheFilePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
      console.error(`Cached data for ${serverName} (TTL: ${Math.round(this.cacheTTL / 1000)}s)`);
    } catch (error) {
      console.error(`Failed to write cache for ${serverName}:`, error);
    }
  }

  /**
   * Clear cache for a specific server
   */
  async clear(serverName: string, config: McpServerConfig): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(serverName, config);
      const cacheFilePath = this.getCacheFilePath(cacheKey);

      if (existsSync(cacheFilePath)) {
        await unlink(cacheFilePath);
        console.error(`Cleared cache for ${serverName}`);
      }
    } catch (error) {
      console.error(`Failed to clear cache for ${serverName}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    try {
      if (!existsSync(this.cacheDir)) {
        return;
      }

      const files = await readdir(this.cacheDir);
      const deletePromises = files
        .filter((file) => file.endsWith('.json'))
        .map((file) => unlink(join(this.cacheDir, file)).catch(() => {}));

      await Promise.all(deletePromises);
      console.error(`Cleared all cache entries (${files.length} files)`);
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanExpired(): Promise<void> {
    try {
      if (!existsSync(this.cacheDir)) {
        return;
      }

      const now = Date.now();
      const files = await readdir(this.cacheDir);
      let expiredCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(this.cacheDir, file);
        try {
          const content = await readFile(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(content);

          if (now > entry.expiresAt) {
            await unlink(filePath);
            expiredCount++;
          }
        } catch (error) {
          // If we can't read or parse the file, delete it
          await unlink(filePath).catch(() => {});
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        console.error(`Cleaned up ${expiredCount} expired cache entries`);
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalEntries: number; totalSize: number }> {
    try {
      if (!existsSync(this.cacheDir)) {
        return { totalEntries: 0, totalSize: 0 };
      }

      const files = await readdir(this.cacheDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      let totalSize = 0;
      for (const file of jsonFiles) {
        const filePath = join(this.cacheDir, file);
        try {
          const content = await readFile(filePath, 'utf-8');
          totalSize += Buffer.byteLength(content, 'utf-8');
        } catch {
          // Ignore errors for individual files
        }
      }

      return {
        totalEntries: jsonFiles.length,
        totalSize,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalEntries: 0, totalSize: 0 };
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set cache enabled state
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
