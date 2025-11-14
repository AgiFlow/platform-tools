/**
 * MCP Serve Command
 *
 * DESIGN PATTERNS:
 * - Command pattern with Commander for CLI argument parsing
 * - Transport abstraction pattern for flexible deployment (stdio, HTTP, SSE)
 * - Factory pattern for creating transport handlers
 * - Graceful shutdown pattern with signal handling
 *
 * CODING STANDARDS:
 * - Use async/await for asynchronous operations
 * - Implement proper error handling with try-catch blocks
 * - Handle process signals for graceful shutdown
 * - Provide clear CLI options and help messages
 *
 * AVOID:
 * - Hardcoded configuration values (use CLI options or environment variables)
 * - Missing error handling for transport startup
 * - Not cleaning up resources on shutdown
 */

import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import chalk from 'chalk';
import { createServerWithReload } from '../server';
import { StdioTransportHandler } from '../transports/stdio';
import { HttpTransportHandler } from '../transports/http';
import { SseTransportHandler } from '../transports/sse';
import { type TransportConfig, TransportMode } from '../types';
import { CredentialsManagerService } from '../services/CredentialsManagerService';

/**
 * Start MCP server with given transport handler
 */
async function startServer(handler: any) {
  await handler.start();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.error(`\nReceived ${signal}, shutting down gracefully...`);
    try {
      await handler.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Resolve MCP proxy configuration using three-tier approach:
 * 1. Environment variables (AGIFLOW_MCP_CONFIG_URL or AGIFLOW_MCP_PROXY_ENDPOINT + AGIFLOW_MCP_API_KEY)
 * 2. Config file path (--config-file)
 * 3. Interactive authentication with saved credentials
 */
async function resolveProxyConfig(options: any) {
  const projectPath = resolve(cwd());
  const credentialsManager = new CredentialsManagerService();

  // Collect all configuration sources
  const config: {
    configUrl?: string;
    configFilePath?: string;
    configHeaders?: Record<string, string>;
  } = {};

  // Check environment variables for remote config
  // Priority: AGIFLOW_MCP_CONFIG_URL (reload context) > AGIFLOW_MCP_PROXY_ENDPOINT (default)
  const envEndpoint = process.env.AGIFLOW_MCP_CONFIG_URL || process.env.AGIFLOW_MCP_PROXY_ENDPOINT;
  const envApiKey = process.env.AGIFLOW_MCP_API_KEY;

  if (envEndpoint && envApiKey) {
    const source = process.env.AGIFLOW_MCP_CONFIG_URL
      ? 'AGIFLOW_MCP_CONFIG_URL'
      : 'AGIFLOW_MCP_PROXY_ENDPOINT';
    console.error(chalk.blue(`Using remote configuration from environment variables (${source})`));
    config.configUrl = envEndpoint;
    config.configHeaders = {
      'x-api-key': `${envApiKey}`,
    };
  }

  // Check for config file path
  if (options.configFile) {
    console.error(chalk.blue(`Using local configuration from file: ${options.configFile}`));
    config.configFilePath = resolve(options.configFile);
  }

  // If we have either remote or local config, return it
  if (config.configUrl || config.configFilePath) {
    if (config.configUrl && config.configFilePath) {
      console.error(
        chalk.blue(
          `Merging remote and local configurations (strategy: ${options.mergeStrategy || 'local-priority'})`,
        ),
      );
    }
    return config;
  }

  // Method 3: Check saved credentials or prompt for authentication
  const savedCredentials = await credentialsManager.getCredentials(projectPath);

  if (savedCredentials) {
    console.error(chalk.blue('Using saved credentials'));
    return {
      configUrl: savedCredentials.endpoint,
      configHeaders: {
        'x-api-key': `${savedCredentials.apiKey}`,
      },
    };
  }

  // No credentials found - prompt user for authentication
  console.error(chalk.yellow('\n=== AgiFlow MCP Proxy Authentication ==='));
  console.error(chalk.white('To get your MCP proxy endpoint and API key:'));
  console.error(chalk.cyan('  1. Visit: https://agiflow.io/auth'));
  console.error(chalk.cyan('  2. Sign in or create an account'));
  console.error(chalk.cyan('  3. Copy your endpoint and API key\n'));

  const endpoint = await input({
    message: 'Enter your MCP proxy endpoint URL:',
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return 'Please enter a valid URL';
      }
    },
  });

  const apiKey = await input({
    message: 'Enter your API key:',
    validate: (value) => value.length > 0 || 'API key cannot be empty',
  });

  // Save credentials
  await credentialsManager.saveCredentials(projectPath, { endpoint, apiKey });
  console.error(
    chalk.green(`\n✓ Credentials saved to: ${credentialsManager.getCredentialsPath()}`),
  );

  return {
    configUrl: endpoint,
    configHeaders: {
      'x-api-key': `${apiKey}`,
    },
  };
}

/**
 * MCP Serve command
 */
export const mcpServeCommand = new Command('mcp-serve')
  .description('Start MCP proxy server with specified transport')
  .option('-t, --type <type>', 'Transport type: stdio, http, or sse', 'stdio')
  .option(
    '-p, --port <port>',
    'Port to listen on (http/sse only)',
    (val) => parseInt(val, 10),
    3000,
  )
  .option('--host <host>', 'Host to bind to (http/sse only)', 'localhost')
  .option(
    '--use-server-prefix',
    'Prefix tools and resources with server name (e.g., server/tool)',
    false,
  )
  .option('-f, --config-file <path>', 'Path to local MCP configuration file')
  .option(
    '--merge-strategy <strategy>',
    'Strategy for merging remote and local configs: local-priority, remote-priority, or merge-deep',
    'local-priority',
  )
  .option(
    '--progressive',
    'Enable progressive disclosure mode - expose only getTool, useTool, and reload_config instead of all tools',
    false,
  )
  .action(async (options) => {
    try {
      const transportType = options.type.toLowerCase();

      // Resolve configuration using three-tier approach
      const serverOptions: any = await resolveProxyConfig(options);

      // Add prefix flag, merge strategy, and progressive mode to server options
      serverOptions.useServerPrefix = options.useServerPrefix;
      serverOptions.mergeStrategy = options.mergeStrategy;
      serverOptions.progressive = options.progressive;

      if (transportType === 'stdio') {
        const serverWithReload = await createServerWithReload(serverOptions);
        const handler = new StdioTransportHandler(serverWithReload);
        await startServer(handler);
      } else if (transportType === 'http') {
        // For HTTP, pass a factory function to create new server instances per session with reload support
        const config: TransportConfig = {
          mode: TransportMode.HTTP,
          port: options.port || Number(process.env.MCP_PORT) || 3000,
          host: options.host || process.env.MCP_HOST || 'localhost',
        };
        const handler = new HttpTransportHandler(
          () => createServerWithReload(serverOptions),
          config,
        );
        await startServer(handler);
        console.error(`Reload endpoint: http://${config.host}:${config.port}/reload`);
      } else if (transportType === 'sse') {
        // For SSE, pass a factory function to create new server instances per connection with reload support
        const config: TransportConfig = {
          mode: TransportMode.SSE,
          port: options.port || Number(process.env.MCP_PORT) || 3000,
          host: options.host || process.env.MCP_HOST || 'localhost',
        };
        const handler = new SseTransportHandler(
          () => createServerWithReload(serverOptions),
          config,
        );
        await startServer(handler);
        console.error(`Reload endpoint: http://${config.host}:${config.port}/reload`);
      } else {
        console.error(`Unknown transport type: ${transportType}. Use: stdio, http, or sse`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  });
