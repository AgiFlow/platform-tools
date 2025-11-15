/**
 * DescribeTools Command
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
 * Get detailed information about multiple MCP tools
 */
export const describeToolsCommand = new Command('describe-tools')
  .description('Get detailed information about multiple MCP tools including schemas and parameters')
  .argument('<toolNames>', 'Comma-separated names of the tools to get information about')
  .option(
    '-s, --server <name>',
    'Server name (optional, searches within specific server if provided)',
  )
  .option('-f, --config-file <path>', 'Path to local MCP configuration file')
  .option(
    '--merge-strategy <strategy>',
    'Strategy for merging remote and local configs',
    'local-priority',
  )
  .option('--json', 'Output as JSON', false)
  .action(async (toolNamesArg: string, options) => {
    try {
      // Parse comma-separated tool names
      const toolNames = toolNamesArg.split(',').map((name) => name.trim()).filter((name) => name.length > 0);

      if (!toolNames || toolNames.length === 0) {
        console.error(chalk.red('No tool names provided'));
        process.exit(1);
      }

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
      const connectionPromises = Object.entries(mcpConfig.mcpServers).map(
        async ([name, serverConfig]) => {
          try {
            await clientManager.connectToServer(name, serverConfig);
            console.error(chalk.gray(`Connected to MCP server: ${name}`));
          } catch (error) {
            console.error(chalk.red(`Failed to connect to MCP server ${name}:`), error);
          }
        },
      );

      await Promise.all(connectionPromises);

      const clients = clientManager.getAllClients();

      // If server name is specified, search only that server
      if (options.server) {
        const client = clientManager.getClient(options.server);
        if (!client) {
          console.error(chalk.red(`Server "${options.server}" not found`));
          console.error(
            chalk.gray(`Available servers: ${clients.map((c) => c.serverName).join(', ')}`),
          );
          await clientManager.disconnectAll();
          process.exit(1);
        }

        const tools = await client.listTools();
        const foundTools: any[] = [];
        const notFoundTools: string[] = [];

        for (const toolName of toolNames) {
          const tool = tools.find((t) => t.name === toolName);
          if (tool) {
            foundTools.push({
              server: options.server,
              tool: {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
              },
            });
          } else {
            notFoundTools.push(toolName);
          }
        }

        if (foundTools.length === 0) {
          console.error(
            chalk.red(`None of the requested tools found on server "${options.server}"`),
          );
          console.error(chalk.gray(`Requested: ${toolNames.join(', ')}`));
          console.error(chalk.gray(`Available tools: ${tools.map((t) => t.name).join(', ')}`));
          await clientManager.disconnectAll();
          process.exit(1);
        }

        // Output tool information
        if (options.json) {
          const result: any = { tools: foundTools };
          if (notFoundTools.length > 0) {
            result.notFound = notFoundTools;
          }
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`\nFound ${foundTools.length} tool(s):\n`));
          for (const item of foundTools) {
            console.log(chalk.cyan(`Tool: ${item.tool.name}`));
            console.log(chalk.blue(`Server: ${item.server}`));
            console.log(chalk.white(`Description:`));
            console.log(chalk.gray(`  ${item.tool.description}`));
            console.log(chalk.white(`Input Schema:`));
            console.log(chalk.gray(JSON.stringify(item.tool.inputSchema, null, 2)));
            console.log();
          }

          if (notFoundTools.length > 0) {
            console.log(chalk.yellow(`Not found: ${notFoundTools.join(', ')}`));
          }
        }

        await clientManager.disconnectAll();
        process.exit(0);
        return;
      }

      // Search all servers for the tools
      const foundTools: any[] = [];
      const notFoundTools: string[] = [...toolNames];
      const ambiguousTools: Array<{ toolName: string; servers: string[] }> = [];

      // Build a map of toolName -> array of { server, tool }
      const toolMatches = new Map<string, Array<{ server: string; tool: any }>>();

      const results = await Promise.all(
        clients.map(async (client) => {
          try {
            const tools = await client.listTools();
            const matches: Array<{ toolName: string; server: string; tool: any }> = [];

            for (const toolName of toolNames) {
              const tool = tools.find((t) => t.name === toolName);
              if (tool) {
                matches.push({ toolName, server: client.serverName, tool });
              }
            }

            return matches;
          } catch (error) {
            console.error(chalk.red(`Failed to list tools from ${client.serverName}:`), error);
            return [];
          }
        }),
      );

      // Flatten and organize results
      for (const matches of results) {
        for (const match of matches) {
          if (!toolMatches.has(match.toolName)) {
            toolMatches.set(match.toolName, []);
          }
          toolMatches.get(match.toolName)!.push({
            server: match.server,
            tool: match.tool,
          });
        }
      }

      // Process each requested tool
      for (const toolName of toolNames) {
        const matches = toolMatches.get(toolName);

        if (!matches || matches.length === 0) {
          // Tool not found anywhere
          continue;
        }

        if (matches.length === 1) {
          // Single match - add to found tools
          const match = matches[0];
          foundTools.push({
            server: match.server,
            tool: {
              name: match.tool.name,
              description: match.tool.description,
              inputSchema: match.tool.inputSchema,
            },
          });
          // Remove from not found list
          const idx = notFoundTools.indexOf(toolName);
          if (idx > -1) {
            notFoundTools.splice(idx, 1);
          }
        } else {
          // Multiple matches - mark as ambiguous
          ambiguousTools.push({
            toolName,
            servers: matches.map((m) => m.server),
          });
          // Remove from not found list
          const idx = notFoundTools.indexOf(toolName);
          if (idx > -1) {
            notFoundTools.splice(idx, 1);
          }
        }
      }

      if (foundTools.length === 0 && ambiguousTools.length === 0) {
        console.error(chalk.red('None of the requested tools found on any connected server'));
        console.error(chalk.gray(`Requested: ${toolNames.join(', ')}`));
        await clientManager.disconnectAll();
        process.exit(1);
      }

      // Output results
      if (options.json) {
        const result: any = { tools: foundTools };
        if (notFoundTools.length > 0) {
          result.notFound = notFoundTools;
        }
        if (ambiguousTools.length > 0) {
          result.ambiguous = ambiguousTools;
        }
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (foundTools.length > 0) {
          console.log(chalk.green(`\nFound ${foundTools.length} tool(s):\n`));
          for (const item of foundTools) {
            console.log(chalk.cyan(`Tool: ${item.tool.name}`));
            console.log(chalk.blue(`Server: ${item.server}`));
            console.log(chalk.white(`Description:`));
            console.log(chalk.gray(`  ${item.tool.description}`));
            console.log(chalk.white(`Input Schema:`));
            console.log(chalk.gray(JSON.stringify(item.tool.inputSchema, null, 2)));
            console.log();
          }
        }

        if (ambiguousTools.length > 0) {
          console.log(
            chalk.yellow(
              `\nAmbiguous tools (found on multiple servers, use --server to specify):\n`,
            ),
          );
          for (const item of ambiguousTools) {
            console.log(chalk.cyan(`  ${item.toolName}: ${item.servers.join(', ')}`));
          }
          console.log();
        }

        if (notFoundTools.length > 0) {
          console.log(chalk.red(`\nNot found: ${notFoundTools.join(', ')}\n`));
        }
      }

      // Clean up
      await clientManager.disconnectAll();
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error getting tool information:'), error);
      process.exit(1);
    }
  });
