/**
 * CredentialsManagerService
 *
 * DESIGN PATTERNS:
 * - Service pattern for business logic encapsulation
 * - Single responsibility principle
 * - File-based credential storage
 *
 * CODING STANDARDS:
 * - Use async/await for asynchronous operations
 * - Throw descriptive errors for error cases
 * - Keep methods focused and well-named
 * - Document complex logic with comments
 *
 * SECURITY:
 * - Credentials stored in plain JSON (user aware via documentation)
 * - File permissions set to 600 (read/write owner only)
 * - Stored in user's home directory: ~/.agiflow/mcp.credentials.json
 *
 * AVOID:
 * - Mixing concerns (keep focused on single domain)
 * - Direct tool implementation (services should be tool-agnostic)
 * - World-readable credential files
 */

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';

export interface McpCredentials {
  endpoint: string;
  apiKey: string;
  // Per-server OAuth credentials
  servers?: Record<
    string,
    {
      clientInfo?: OAuthClientInformationFull;
      tokens?: OAuthTokens;
      codeVerifier?: string;
    }
  >;
}

interface CredentialsStore {
  [projectPath: string]: McpCredentials;
}

/**
 * Service for managing MCP proxy credentials
 * Stores credentials in $HOME/.agiflow/mcp.credentials.json
 */
export class CredentialsManagerService {
  private credentialsPath: string;

  constructor() {
    const homeDir = homedir();
    const agiflowDir = join(homeDir, '.agiflow');
    this.credentialsPath = join(agiflowDir, 'mcp.credentials.json');
  }

  /**
   * Get credentials for a specific project path
   */
  async getCredentials(projectPath: string): Promise<McpCredentials | null> {
    try {
      const store = await this.loadCredentialsStore();
      return store[projectPath] || null;
    } catch (_error) {
      // If file doesn't exist, return null
      return null;
    }
  }

  /**
   * Save credentials for a specific project path
   *
   * SECURITY: Sets file permissions to 600 (owner read/write only) to protect sensitive data
   */
  async saveCredentials(projectPath: string, credentials: McpCredentials): Promise<void> {
    await this.ensureCredentialsDirectory();

    const store = await this.loadCredentialsStore();
    store[projectPath] = credentials;

    await writeFile(this.credentialsPath, JSON.stringify(store, null, 2), 'utf-8');

    // SECURITY: Set restrictive file permissions (600 = rw-------)
    // Only the owner can read/write, protecting OAuth tokens and secrets
    try {
      await chmod(this.credentialsPath, 0o600);
    } catch (error) {
      // On Windows, chmod may not work as expected, but that's acceptable
      // as Windows uses a different permission model (ACLs)
      console.warn('Warning: Could not set file permissions on credentials file:', error);
    }
  }

  /**
   * Check if credentials exist for a project path
   */
  async hasCredentials(projectPath: string): Promise<boolean> {
    const credentials = await this.getCredentials(projectPath);
    return credentials !== null;
  }

  /**
   * Delete credentials for a specific project path
   */
  async deleteCredentials(projectPath: string): Promise<void> {
    const store = await this.loadCredentialsStore();
    delete store[projectPath];
    await writeFile(this.credentialsPath, JSON.stringify(store, null, 2), 'utf-8');
  }

  /**
   * Get the credentials file path
   */
  getCredentialsPath(): string {
    return this.credentialsPath;
  }

  /**
   * Load the entire credentials store
   */
  private async loadCredentialsStore(): Promise<CredentialsStore> {
    if (!existsSync(this.credentialsPath)) {
      return {};
    }

    try {
      const content = await readFile(this.credentialsPath, 'utf-8');
      return JSON.parse(content) as CredentialsStore;
    } catch (_error) {
      // If parsing fails, return empty store
      return {};
    }
  }

  /**
   * Ensure the .agiflow directory exists with secure permissions
   *
   * SECURITY: Sets directory permissions to 700 (owner access only)
   */
  private async ensureCredentialsDirectory(): Promise<void> {
    const agiflowDir = join(homedir(), '.agiflow');
    if (!existsSync(agiflowDir)) {
      // SECURITY: Create directory with restrictive permissions (700 = rwx------)
      await mkdir(agiflowDir, { recursive: true, mode: 0o700 });
    }
  }
}
