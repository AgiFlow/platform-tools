/**
 * STDIO Transport
 *
 * DESIGN PATTERNS:
 * - Transport handler pattern implementing TransportHandler interface
 * - Standard I/O based communication for CLI usage
 * - Support for ProxyServerWithReload pattern for reload capability
 *
 * CODING STANDARDS:
 * - Initialize server and transport properly
 * - Handle cleanup on shutdown with stop() method
 * - Use async/await for all operations
 * - Support both plain Server and ProxyServerWithReload
 *
 * AVOID:
 * - Forgetting to close transport on shutdown
 * - Missing error handling for connection failures
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { TransportHandler } from '../types/index.js';
import type { ProxyServerWithReload } from '../server/index.js';

/**
 * Stdio transport handler for MCP server
 * Used for command-line and direct integrations
 * Supports both plain Server and ProxyServerWithReload for reload capability
 */
export class StdioTransportHandler implements TransportHandler {
  private server: Server;
  private transport: StdioServerTransport | null = null;

  constructor(server: Server | ProxyServerWithReload) {
    // Extract the actual server instance if ProxyServerWithReload was passed
    this.server = 'server' in server ? server.server : server;
  }

  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error('@agiflowai/powertool MCP server started on stdio');
  }

  async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
