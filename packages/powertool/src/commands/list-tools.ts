/**
 * ListTools Command
 *
 * DESIGN PATTERNS:
 * - Command pattern with Commander for CLI argument parsing
 * - Async/await pattern for asynchronous operations
 * - Error handling pattern with try-catch and proper exit codes
 *
 * CODING STANDARDS:
 * - Use async action handlers for asynchronous operations
 * - Provide clear option descriptions and default values
 * - Handle errors gracefully with process.exit()
 * - Log progress and errors to console
 * - Use Commander's .option() and .argument() for inputs
 *
 * AVOID:
 * - Synchronous blocking operations in action handlers
 * - Missing error handling (always use try-catch)
 * - Hardcoded values (use options or environment variables)
 * - Not exiting with appropriate exit codes on errors
 */

import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import chalk from 'chalk';
import { ConfigFetcherService } from '../services/ConfigFetcherService';
import { McpClientManagerService } from '../services/McpClientManagerService';
import { CredentialsManagerService } from '../services/CredentialsManagerService';

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
  const envEndpoint = process.env.AGIFLOW_MCP_CONFIG_URL || process.env.AGIFLOW_MCP_PROXY_ENDPOINT;
  const envApiKey = process.env.AGIFLOW_MCP_API_KEY;

  if (envEndpoint && envApiKey) {
    config.configUrl = envEndpoint;
    config.configHeaders = {
      'x-api-key': `${envApiKey}`,
    };
  }

  // Check for config file path
  if (options.configFile) {
    config.configFilePath = resolve(options.configFile);
  }

  // If we have either remote or local config, return it
  if (config.configUrl || config.configFilePath) {
    return config;
  }

  // Method 3: Check saved credentials or prompt for authentication
  const savedCredentials = await credentialsManager.getCredentials(projectPath);

  if (savedCredentials) {
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

  return {
    configUrl: endpoint,
    configHeaders: {
      'x-api-key': `${apiKey}`,
    },
  };
}

/**
 * List all available MCP tools from connected servers with optional filtering
 */
export const listToolsCommand = new Command('list-tools')
  .description('List all available MCP tools from connected servers with optional filtering')
  .option('-s, --server <name>', 'Filter by server name')
  .option('-f, --config-file <path>', 'Path to local MCP configuration file')
  .option('--merge-strategy <strategy>', 'Strategy for merging remote and local configs', 'local-priority')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    try {
      // Resolve configuration
      const config = await resolveProxyConfig(options);

      // Initialize services
      const configFetcher = new ConfigFetcherService({
        configUrl: config.configUrl,
        configFilePath: config.configFilePath,
        headers: config.configHeaders,
        mergeStrategy: options.mergeStrategy || 'local-priority',
      });

      const clientManager = new McpClientManagerService();

      // Fetch configuration and connect to servers
      const mcpConfig = await configFetcher.fetchConfiguration();

      // Connect to all configured MCP servers
      const connectionPromises = Object.entries(mcpConfig.mcpServers).map(async ([name, serverConfig]) => {
        try {
          await clientManager.connectToServer(name, serverConfig);
          console.error(chalk.gray(`Connected to MCP server: ${name}`));
        } catch (error) {
          console.error(chalk.red(`Failed to connect to MCP server ${name}:`), error);
        }
      });

      await Promise.all(connectionPromises);

      // Get all tools from all connected clients
      const clients = clientManager.getAllClients();
      const allTools: any[] = [];

      for (const client of clients) {
        try {
          if (options.server && client.serverName !== options.server) {
            continue;
          }

          const tools = await client.listTools();
          for (const tool of tools) {
            allTools.push({
              server: client.serverName,
              name: tool.name,
              description: tool.description,
            });
          }
        } catch (error) {
          console.error(chalk.red(`Failed to list tools from ${client.serverName}:`), error);
        }
      }

      // Output results
      if (options.json) {
        console.log(JSON.stringify(allTools, null, 2));
      } else {
        if (allTools.length === 0) {
          console.log(chalk.yellow('\nNo tools found'));
        } else {
          console.log(chalk.green(`\nFound ${allTools.length} tools:\n`));

          let currentServer = '';
          for (const tool of allTools) {
            if (tool.server !== currentServer) {
              currentServer = tool.server;
              console.log(chalk.blue(`\n${currentServer}:`));
            }
            console.log(`  ${chalk.cyan(tool.name)}`);
            console.log(`    ${chalk.gray(tool.description)}`);
          }
          console.log();
        }
      }

      // Clean up
      await clientManager.disconnectAll();
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error listing tools:'), error);
      process.exit(1);
    }
  });
