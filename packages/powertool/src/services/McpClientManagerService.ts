/**
 * McpClientManagerService
 *
 * DESIGN PATTERNS:
 * - Service pattern for business logic encapsulation
 * - Single responsibility principle
 * - Connection pooling and lifecycle management
 * - Factory pattern for creating MCP clients
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

import type { ChildProcess } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  McpServerConfig,
  McpStdioConfig,
  McpHttpConfig,
  McpSseConfig,
  McpClientConnection,
  McpServerTransportType,
} from '../types/index.js';
import { McpOAuthClientProvider } from './McpOAuthClientProvider.js';
import { CredentialsManagerService } from './CredentialsManagerService.js';
import { LockfileService } from './LockfileService.js';
import {
  createOAuthCallbackServer,
  waitForAuthentication,
  type OAuthCallbackServer,
} from './OAuthCallbackServer.js';
import { unlinkSync } from 'node:fs';
import { exec } from 'node:child_process';

/**
 * MCP Client wrapper for managing individual server connections
 */
class McpClient implements McpClientConnection {
  serverName: string;
  transport: McpServerTransportType;
  private client: Client;
  private childProcess?: ChildProcess;
  private connected: boolean = false;

  constructor(serverName: string, transport: McpServerTransportType, client: Client) {
    this.serverName = serverName;
    this.transport = transport;
    this.client = client;
  }

  setChildProcess(process: ChildProcess): void {
    this.childProcess = process;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  async listTools(): Promise<any[]> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    const response = await this.client.listTools();
    return response.tools;
  }

  async listResources(): Promise<any[]> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    const response = await this.client.listResources();
    return response.resources;
  }

  async listPrompts(): Promise<any[]> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    const response = await this.client.listPrompts();
    return response.prompts;
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    return await this.client.callTool({ name, arguments: args });
  }

  async readResource(uri: string): Promise<any> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    return await this.client.readResource({ uri });
  }

  async getPrompt(name: string, args?: any): Promise<any> {
    if (!this.connected) {
      throw new Error(`Client for ${this.serverName} is not connected`);
    }
    return await this.client.getPrompt({ name, arguments: args });
  }

  async close(): Promise<void> {
    if (this.childProcess) {
      this.childProcess.kill();
    }
    await this.client.close();
    this.connected = false;
  }
}

/**
 * Service for managing MCP client connections to remote servers
 */
export class McpClientManagerService {
  private clients: Map<string, McpClient> = new Map();
  private credentialsManager: CredentialsManagerService;
  private lockfileService: LockfileService;
  private projectPath: string;
  private oauthServers: Map<string, OAuthCallbackServer> = new Map();

  constructor(projectPath?: string) {
    this.credentialsManager = new CredentialsManagerService();
    this.lockfileService = new LockfileService();
    this.projectPath = projectPath || process.cwd();

    // Cleanup lockfiles on exit
    process.on('exit', () => {
      this.cleanupLockfiles();
    });
    process.on('SIGINT', () => {
      this.cleanupLockfiles();
      process.exit(0);
    });
  }

  private cleanupLockfiles(): void {
    for (const [serverName, oauthServer] of this.oauthServers) {
      try {
        // Close the OAuth callback server
        oauthServer.server.close();

        const client = this.clients.get(serverName);
        if (client) {
          const serverConfig = { transport: client.transport };
          if (serverConfig.transport === 'http' || serverConfig.transport === 'sse') {
            // Clean up lockfile
            const serverUrl = ''; // We don't have URL here, but lockfile will be cleaned by path
            // TODO: Store server URL for cleanup
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.oauthServers.clear();
  }

  /**
   * Connect to an MCP server based on its configuration
   */
  async connectToServer(serverName: string, config: McpServerConfig): Promise<void> {
    if (this.clients.has(serverName)) {
      throw new Error(`Client for ${serverName} is already connected`);
    }

    const client = new Client(
      {
        name: `@agiflowai/powertool-proxy-client`,
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    );

    const mcpClient = new McpClient(serverName, config.transport, client);

    try {
      if (config.transport === 'stdio') {
        await this.connectStdioClient(mcpClient, config.config as McpStdioConfig);
      } else if (config.transport === 'http') {
        await this.connectHttpClient(mcpClient, config.config as McpHttpConfig);
      } else if (config.transport === 'sse') {
        await this.connectSseClient(mcpClient, config.config as McpSseConfig);
      } else {
        throw new Error(`Unsupported transport type: ${config.transport}`);
      }

      mcpClient.setConnected(true);
      this.clients.set(serverName, mcpClient);
    } catch (error) {
      await mcpClient.close();
      throw error;
    }
  }

  private async connectStdioClient(mcpClient: McpClient, config: McpStdioConfig): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    await mcpClient['client'].connect(transport);
  }

  private async connectHttpClient(mcpClient: McpClient, config: McpHttpConfig): Promise<void> {
    const serverUrl = config.url;

    // Check for existing lockfile
    const existingLock = await this.lockfileService.checkLockfile(serverUrl);

    let callbackServer: OAuthCallbackServer | undefined;
    let session: any | undefined;
    let shouldWaitForOtherInstance = false;

    if (existingLock) {
      console.error(
        `Found existing OAuth process for ${mcpClient.serverName}, waiting for completion...`,
      );
      shouldWaitForOtherInstance = true;

      // SECURITY: Cannot wait for other instance's session - they have different session IDs
      // Instead, we'll start our own OAuth flow
      console.error(`Starting our own OAuth flow with unique session...`);
      shouldWaitForOtherInstance = false;
    }

    if (!shouldWaitForOtherInstance) {
      // Create our own callback server with auto-assigned port
      callbackServer = await createOAuthCallbackServer({ port: 0 });
      this.oauthServers.set(mcpClient.serverName, callbackServer);

      // SECURITY: Generate unique session for CSRF protection
      session = callbackServer.generateSession();

      // Create lockfile
      const serverUrlHash = await this.lockfileService.createLockfile(
        serverUrl,
        callbackServer.port,
      );

      process.once('exit', () => {
        try {
          const lockfilePath = this.lockfileService.getLockfilePath(serverUrlHash);
          unlinkSync(lockfilePath);
        } catch (error) {
          // Ignore
        }
      });
    }

    // Create OAuth provider
    const authProvider = new McpOAuthClientProvider(
      mcpClient.serverName,
      this.credentialsManager,
      this.projectPath,
      callbackServer?.port || 0,
      async (authUrl: URL) => {
        console.error(`\n=== OAuth Authorization Required for ${mcpClient.serverName} ===`);
        console.error(`Opening browser to: ${authUrl.toString()}\n`);

        // Try to open browser
        const openCommand =
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
        exec(`${openCommand} "${authUrl.toString()}"`, (error) => {
          if (error) {
            console.error(
              `Could not open browser automatically. Please visit: ${authUrl.toString()}`,
            );
          }
        });
      },
    );

    // SECURITY: Set session before OAuth flow starts
    if (session) {
      authProvider.setSession(session);
    }

    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      authProvider,
      requestInit: config.headers
        ? {
            headers: config.headers,
          }
        : undefined,
    });

    try {
      await mcpClient['client'].connect(transport);
    } catch (error) {
      if (error instanceof UnauthorizedError && callbackServer && session) {
        // Wait for OAuth callback with session ID
        console.error(`Waiting for OAuth authorization...`);
        await callbackServer.waitForAuthCode(session.sessionId);

        // Retry connection
        await mcpClient['client'].connect(transport);
      } else {
        throw error;
      }
    }
  }

  private async connectSseClient(mcpClient: McpClient, config: McpSseConfig): Promise<void> {
    const serverUrl = config.url;

    // Check for existing lockfile
    const existingLock = await this.lockfileService.checkLockfile(serverUrl);

    let callbackServer: OAuthCallbackServer | undefined;
    let session: any | undefined;
    let shouldWaitForOtherInstance = false;

    if (existingLock) {
      console.error(
        `Found existing OAuth process for ${mcpClient.serverName}, waiting for completion...`,
      );
      shouldWaitForOtherInstance = true;

      // SECURITY: Cannot wait for other instance's session - they have different session IDs
      // Instead, we'll start our own OAuth flow
      console.error(`Starting our own OAuth flow with unique session...`);
      shouldWaitForOtherInstance = false;
    }

    if (!shouldWaitForOtherInstance) {
      // Create our own callback server with auto-assigned port
      callbackServer = await createOAuthCallbackServer({ port: 0 });
      this.oauthServers.set(mcpClient.serverName, callbackServer);

      // SECURITY: Generate unique session for CSRF protection
      session = callbackServer.generateSession();

      // Create lockfile
      const serverUrlHash = await this.lockfileService.createLockfile(
        serverUrl,
        callbackServer.port,
      );

      // Setup cleanup
      process.once('exit', () => {
        try {
          const lockfilePath = this.lockfileService.getLockfilePath(serverUrlHash);
          unlinkSync(lockfilePath);
        } catch (error) {
          // Ignore
        }
      });
    }

    // Create OAuth provider
    const authProvider = new McpOAuthClientProvider(
      mcpClient.serverName,
      this.credentialsManager,
      this.projectPath,
      callbackServer?.port || 0,
      async (authUrl: URL) => {
        console.error(`\n=== OAuth Authorization Required for ${mcpClient.serverName} ===`);
        console.error(`Opening browser to: ${authUrl.toString()}\n`);

        // Try to open browser
        const openCommand =
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
        exec(`${openCommand} "${authUrl.toString()}"`, (error) => {
          if (error) {
            console.error(
              `Could not open browser automatically. Please visit: ${authUrl.toString()}`,
            );
          }
        });
      },
    );

    // SECURITY: Set session before OAuth flow starts
    if (session) {
      authProvider.setSession(session);
    }

    const transport = new SSEClientTransport(new URL(config.url), {
      authProvider,
    });

    try {
      await mcpClient['client'].connect(transport);
    } catch (error) {
      if (error instanceof UnauthorizedError && callbackServer && session) {
        // Wait for OAuth callback with session ID
        console.error(`Waiting for OAuth authorization...`);
        await callbackServer.waitForAuthCode(session.sessionId);

        // Retry connection
        await mcpClient['client'].connect(transport);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get a connected client by server name
   */
  getClient(serverName: string): McpClientConnection | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Get all connected clients
   */
  getAllClients(): McpClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.close();
      this.clients.delete(serverName);
    }

    // Close OAuth callback server if it exists
    const oauthServer = this.oauthServers.get(serverName);
    if (oauthServer) {
      await new Promise<void>((resolve) => {
        oauthServer.server.close(() => resolve());
      });
      this.oauthServers.delete(serverName);
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) => client.close());
    await Promise.all(disconnectPromises);
    this.clients.clear();

    // Close all OAuth callback servers
    const oauthClosePromises = Array.from(this.oauthServers.values()).map((oauthServer) => {
      return new Promise<void>((resolve) => {
        oauthServer.server.close(() => resolve());
      });
    });
    await Promise.all(oauthClosePromises);
    this.oauthServers.clear();
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }
}
