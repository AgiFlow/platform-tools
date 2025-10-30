/**
 * LockfileService
 *
 * Manages lockfiles for OAuth coordination between multiple proxy instances.
 * Prevents multiple instances from triggering OAuth flows simultaneously.
 */

import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

export interface LockfileData {
  pid: number;
  port: number;
  timestamp: number;
  serverUrl: string;
}

export class LockfileService {
  private lockDir: string;

  constructor() {
    const homeDir = homedir();
    this.lockDir = join(homeDir, '.agiflow', 'locks');
  }

  /**
   * Generate a hash for the server URL to use as lockfile name
   */
  getServerUrlHash(serverUrl: string): string {
    return createHash('sha256').update(serverUrl).digest('hex').substring(0, 16);
  }

  /**
   * Get the lockfile path for a server
   */
  getLockfilePath(serverUrlHash: string): string {
    return join(this.lockDir, `${serverUrlHash}.lock.json`);
  }

  /**
   * Ensure the lock directory exists
   */
  private async ensureLockDirectory(): Promise<void> {
    if (!existsSync(this.lockDir)) {
      await mkdir(this.lockDir, { recursive: true });
    }
  }

  /**
   * Create a lockfile for the current process
   */
  async createLockfile(serverUrl: string, port: number): Promise<string> {
    await this.ensureLockDirectory();

    const serverUrlHash = this.getServerUrlHash(serverUrl);
    const lockfilePath = this.getLockfilePath(serverUrlHash);

    const lockData: LockfileData = {
      pid: process.pid,
      port,
      timestamp: Date.now(),
      serverUrl,
    };

    await writeFile(lockfilePath, JSON.stringify(lockData, null, 2), 'utf-8');
    return serverUrlHash;
  }

  /**
   * Read a lockfile
   */
  async readLockfile(serverUrlHash: string): Promise<LockfileData | null> {
    const lockfilePath = this.getLockfilePath(serverUrlHash);

    if (!existsSync(lockfilePath)) {
      return null;
    }

    try {
      const content = await readFile(lockfilePath, 'utf-8');
      return JSON.parse(content) as LockfileData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a lockfile
   */
  async deleteLockfile(serverUrlHash: string): Promise<void> {
    const lockfilePath = this.getLockfilePath(serverUrlHash);

    if (existsSync(lockfilePath)) {
      await unlink(lockfilePath);
    }
  }

  /**
   * Check if a lockfile is valid (process running and not too old)
   */
  async isLockValid(lockData: LockfileData): Promise<boolean> {
    // Check if the lockfile is too old (over 30 minutes)
    const MAX_LOCK_AGE = 30 * 60 * 1000; // 30 minutes
    if (Date.now() - lockData.timestamp > MAX_LOCK_AGE) {
      return false;
    }

    // Check if the process is still running
    try {
      process.kill(lockData.pid, 0); // Doesn't kill, just checks if exists
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the auth endpoint is accessible
   */
  async isEndpointAccessible(port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`http://127.0.0.1:${port}/wait-for-auth?poll=false`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.status === 200 || response.status === 202;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a lockfile exists and is valid
   */
  async checkLockfile(serverUrl: string): Promise<LockfileData | null> {
    const serverUrlHash = this.getServerUrlHash(serverUrl);
    const lockData = await this.readLockfile(serverUrlHash);

    if (!lockData) {
      return null;
    }

    const isValid = await this.isLockValid(lockData);
    const isAccessible = await this.isEndpointAccessible(lockData.port);

    if (isValid && isAccessible) {
      return lockData;
    }

    // Lockfile is invalid, clean it up
    await this.deleteLockfile(serverUrlHash);
    return null;
  }
}
