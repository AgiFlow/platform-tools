/**
 * MCP Proxy Server Setup
 *
 * DESIGN PATTERNS:
 * - Proxy pattern for forwarding requests to remote MCP servers
 * - Factory pattern for server creation
 * - Service layer for business logic
 *
 * CODING STANDARDS:
 * - Fetch remote MCP configuration on initialization
 * - Connect to all configured remote MCP servers
 * - Proxy tools, resources, and prompts from remote servers
 * - Handle errors gracefully with proper error messages
 *
 * AVOID:
 * - Hardcoded server configurations
 * - Missing error handling for remote server failures
 * - Not cleaning up connections on shutdown
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfigFetcherService } from '../services/ConfigFetcherService.js';
import { McpClientManagerService } from '../services/McpClientManagerService.js';
import { ReloadConfigTool } from '../tools/ReloadConfigTool.js';
import { DescribeTools } from '../tools/DescribeTools.js';
import { UseToolTool } from '../tools/UseToolTool.js';
import { saveErrorLog, formatError } from '../utils/errorLogger.js';

export interface ProxyServerOptions {
  configUrl?: string;
  configFilePath?: string;
  configHeaders?: Record<string, string>;
  useServerPrefix?: boolean;
  /**
   * Strategy for merging remote and local configs when both are provided
   * - 'local-priority': Local config overrides remote (default)
   * - 'remote-priority': Remote config overrides local
   * - 'merge-deep': Deep merge both configs (local overrides on conflict)
   */
  mergeStrategy?: 'local-priority' | 'remote-priority' | 'merge-deep';
  /**
   * Enable progressive disclosure mode
   * When true, exposes only getTool, useTool, and reload_config tools
   * instead of listing all tools from all servers
   */
  progressive?: boolean;
  /**
   * Cache options for MCP server data
   */
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

export interface ProxyServerWithReload {
  server: Server;
  reload: (context?: {
    taskId?: string;
    workUnitId?: string;
    projectId?: string;
  }) => Promise<{ success: boolean; message: string; connected: string[]; failed: string[] }>;
}

/**
 * Create an MCP proxy server with reload capability
 */
export async function createServerWithReload(options: ProxyServerOptions): Promise<ProxyServerWithReload> {
  const server = new Server(
    {
      name: '@agiflowai/powertool',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: true,
        },
        prompts: {
          listChanged: true,
        },
      },
    },
  );

  // Initialize services
  const configFetcher = new ConfigFetcherService({
    configUrl: options.configUrl,
    configFilePath: options.configFilePath,
    headers: options.configHeaders,
    mergeStrategy: options.mergeStrategy,
  });

  const clientManager = new McpClientManagerService(undefined, options.cache);
  const useServerPrefix = options.useServerPrefix ?? true; // Default to true for backward compatibility
  const progressive = options.progressive ?? false;

  // Placeholder for tools (will be set after reload function is created)
  let reloadTool: ReloadConfigTool | null = null;
  let describeTools: DescribeTools | null = null;
  let useToolTool: UseToolTool | null = null;

  // Fetch configuration and connect to remote servers
  try {
    const config = await configFetcher.fetchConfiguration();

    // Connect to all configured MCP servers
    const connectionPromises = Object.entries(config.mcpServers).map(async ([name, serverConfig]) => {
      try {
        await clientManager.connectToServer(name, serverConfig);
        console.error(`Connected to MCP server: ${name}`);
      } catch (error) {
        console.error(`Failed to connect to MCP server ${name}:`, error);
      }
    });

    await Promise.all(connectionPromises);
  } catch (error) {
    // Log error to tmp folder instead of throwing
    const errorObj = error instanceof Error ? error : new Error(String(error));
    try {
      const logPath = saveErrorLog(errorObj, 'config-fetch');
      console.error(`Failed to fetch MCP configuration: ${formatError(errorObj)}`);
      console.error(`Error log saved to: ${logPath}`);
      console.error('Server will start with no remote servers connected.');
    } catch (logError) {
      console.error('Failed to fetch MCP configuration:', error);
      console.error('Failed to save error log:', logError);
      console.error('Server will start with no remote servers connected.');
    }
    // Continue server initialization without remote servers
  }

  // List all tools from all connected servers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools: any[] = [];

    // In progressive mode, only expose describeTools, useTool, and reload_config
    if (progressive) {
      if (reloadTool) {
        allTools.push(await reloadTool.getDefinition());
      }
      if (describeTools) {
        allTools.push(await describeTools.getDefinition());
      }
      if (useToolTool) {
        allTools.push(await useToolTool.getDefinition());
      }
      return { tools: allTools };
    }

    // Standard mode: list all tools from all servers
    // Add reload_config tool if available
    if (reloadTool) {
      allTools.push(await reloadTool.getDefinition());
    }

    // Add tools from all connected servers
    const clients = clientManager.getAllClients();

    const toolsResults = await Promise.all(
      clients.map(async (client) => {
        try {
          const tools = await client.listTools();
          // Conditionally prefix tool names with server name
          return tools.map((tool) => ({
            ...tool,
            name: useServerPrefix ? `${client.serverName}/${tool.name}` : tool.name,
          }));
        } catch (error) {
          console.error(`Failed to list tools from ${client.serverName}:`, error);
          return [];
        }
      }),
    );

    allTools.push(...toolsResults.flat());

    return { tools: allTools };
  });

  // Proxy tool calls to the appropriate remote server
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle reload_config tool
    if (name === ReloadConfigTool.TOOL_NAME && reloadTool) {
      return await reloadTool.execute(args as any);
    }

    // Handle progressive mode tools
    if (progressive) {
      if (name === DescribeTools.TOOL_NAME && describeTools) {
        return await describeTools.execute(args as any);
      }
      if (name === UseToolTool.TOOL_NAME && useToolTool) {
        return await useToolTool.execute(args as any);
      }
    }

    if (useServerPrefix) {
      // Parse server name and tool name from format: "serverName/toolName"
      const [serverName, ...toolNameParts] = name.split('/');
      const toolName = toolNameParts.join('/');

      if (!serverName || !toolName) {
        throw new Error(`Invalid tool name format: ${name}. Expected format: serverName/toolName`);
      }

      const client = clientManager.getClient(serverName);
      if (!client) {
        throw new Error(`No connection to MCP server: ${serverName}`);
      }

      try {
        return await client.callTool(toolName, args);
      } catch (error) {
        throw new Error(`Failed to call tool ${toolName} on server ${serverName}: ${error}`);
      }
    } else {
      // Without prefix, search for the tool in all connected servers
      const clients = clientManager.getAllClients();

      for (const client of clients) {
        try {
          const tools = await client.listTools();
          const hasTool = tools.some((tool) => tool.name === name);

          if (hasTool) {
            return await client.callTool(name, args);
          }
        } catch (error) {
          // Continue to next server if this one fails
          console.error(`Failed to check/call tool on ${client.serverName}:`, error);
        }
      }

      throw new Error(`Tool "${name}" not found in any connected MCP server`);
    }
  });

  // List all resources from all connected servers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const allResources: any[] = [];
    const clients = clientManager.getAllClients();

    const resourcesResults = await Promise.all(
      clients.map(async (client) => {
        try {
          const resources = await client.listResources();
          // Conditionally prefix resource URIs with server name
          return resources.map((resource) => ({
            ...resource,
            uri: useServerPrefix ? `${client.serverName}://${resource.uri}` : resource.uri,
          }));
        } catch (error) {
          console.error(`Failed to list resources from ${client.serverName}:`, error);
          return [];
        }
      }),
    );

    allResources.push(...resourcesResults.flat());

    return { resources: allResources };
  });

  // Proxy resource reads to the appropriate remote server
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (useServerPrefix) {
      // Parse server name and resource URI from format: "serverName://resourceUri"
      const match = uri.match(/^([^:]+):\/\/(.+)$/);
      if (!match) {
        throw new Error(`Invalid resource URI format: ${uri}. Expected format: serverName://resourceUri`);
      }

      const [, serverName, resourceUri] = match;

      const client = clientManager.getClient(serverName);
      if (!client) {
        throw new Error(`No connection to MCP server: ${serverName}`);
      }

      try {
        return await client.readResource(resourceUri);
      } catch (error) {
        throw new Error(`Failed to read resource ${resourceUri} from server ${serverName}: ${error}`);
      }
    } else {
      // Without prefix, search for the resource in all connected servers
      const clients = clientManager.getAllClients();

      for (const client of clients) {
        try {
          const resources = await client.listResources();
          const hasResource = resources.some((resource) => resource.uri === uri);

          if (hasResource) {
            return await client.readResource(uri);
          }
        } catch (error) {
          // Continue to next server if this one fails
          console.error(`Failed to check/read resource on ${client.serverName}:`, error);
        }
      }

      throw new Error(`Resource "${uri}" not found in any connected MCP server`);
    }
  });

  // List all prompts from all connected servers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const allPrompts: any[] = [];

    // Add prompts from all connected servers
    const clients = clientManager.getAllClients();

    const promptsResults = await Promise.all(
      clients.map(async (client) => {
        try {
          const prompts = await client.listPrompts();
          // Conditionally prefix prompt names with server name
          return prompts.map((prompt) => ({
            ...prompt,
            name: useServerPrefix ? `${client.serverName}/${prompt.name}` : prompt.name,
          }));
        } catch (error) {
          console.error(`Failed to list prompts from ${client.serverName}:`, error);
          return [];
        }
      }),
    );

    allPrompts.push(...promptsResults.flat());

    return { prompts: allPrompts };
  });

  // Proxy prompt requests to the appropriate remote server
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (useServerPrefix) {
      // Parse server name and prompt name from format: "serverName/promptName"
      const [serverName, ...promptNameParts] = name.split('/');
      const promptName = promptNameParts.join('/');

      if (!serverName || !promptName) {
        throw new Error(`Invalid prompt name format: ${name}. Expected format: serverName/promptName`);
      }

      const client = clientManager.getClient(serverName);
      if (!client) {
        throw new Error(`No connection to MCP server: ${serverName}`);
      }

      try {
        return await client.getPrompt(promptName, args);
      } catch (error) {
        throw new Error(`Failed to get prompt ${promptName} from server ${serverName}: ${error}`);
      }
    } else {
      // Without prefix, search for the prompt in all connected servers
      const clients = clientManager.getAllClients();

      for (const client of clients) {
        try {
          const prompts = await client.listPrompts();
          const hasPrompt = prompts.some((prompt) => prompt.name === name);

          if (hasPrompt) {
            return await client.getPrompt(name, args);
          }
        } catch (error) {
          // Continue to next server if this one fails
          console.error(`Failed to check/get prompt on ${client.serverName}:`, error);
        }
      }

      throw new Error(`Prompt "${name}" not found in any connected MCP server`);
    }
  });

  // Clean up connections on server close
  server.onclose = async () => {
    await clientManager.disconnectAll();
  };

  // Reload function to refresh configuration and reconnect to servers
  const reload = async (context?: {
    taskId?: string;
    workUnitId?: string;
    projectId?: string;
  }) => {
    const connected: string[] = [];
    const failed: string[] = [];

    try {
      const contextInfo = context?.taskId
        ? `taskId=${context.taskId}`
        : context?.workUnitId
          ? `workUnitId=${context.workUnitId}`
          : context?.projectId
            ? `projectId=${context.projectId}`
            : 'default';

      // Send logging notification about reload start
      await server.sendLoggingMessage({
        level: 'info',
        data: `Reloading MCP server configuration (context: ${contextInfo})...`,
      });
      console.error(`Reloading MCP server configuration (context: ${contextInfo})...`);

      // If context is provided, construct and save the new config URL as AGIFLOW_MCP_CONFIG_URL
      if (context && (context.taskId || context.projectId)) {
        const baseUrl = configFetcher['baseUrl'];
        const organizationId = configFetcher['organizationId'];

        if (baseUrl && organizationId) {
          let newConfigUrl: string;
          if (context.taskId) {
            newConfigUrl = `${baseUrl}/api/v1/organizations/${organizationId}/tasks/${context.taskId}/mcp-configs`;
          } else if (context.projectId) {
            newConfigUrl = `${baseUrl}/api/v1/organizations/${organizationId}/projects/${context.projectId}/mcp-configs`;
          } else {
            newConfigUrl = `${baseUrl}/api/v1/organizations/${organizationId}/mcp-configs`;
          }

          // Set AGIFLOW_MCP_CONFIG_URL for future boots
          process.env.AGIFLOW_MCP_CONFIG_URL = newConfigUrl;
          console.error(`Updated AGIFLOW_MCP_CONFIG_URL to: ${newConfigUrl}`);
        }
      }

      // Snapshot current capabilities before reload
      const oldClients = clientManager.getAllClients();
      const oldServerNames = new Set(oldClients.map((c) => c.serverName));

      // Collect current tools, resources, and prompts for diff comparison
      const oldTools: any[] = [];
      const oldResources: any[] = [];
      const oldPrompts: any[] = [];

      await Promise.all(
        oldClients.map(async (client) => {
          const [tools, resources, prompts] = await Promise.all([
            client.listTools().catch(() => []),
            client.listResources().catch(() => []),
            client.listPrompts().catch(() => []),
          ]);
          oldTools.push(...tools);
          oldResources.push(...resources);
          oldPrompts.push(...prompts);
        }),
      );

      // Stringify for comparison
      const oldToolsStr = JSON.stringify(oldTools.sort((a, b) => a.name?.localeCompare(b.name) || 0));
      const oldResourcesStr = JSON.stringify(oldResources.sort((a, b) => a.uri?.localeCompare(b.uri) || 0));
      const oldPromptsStr = JSON.stringify(oldPrompts.sort((a, b) => a.name?.localeCompare(b.name) || 0));

      // Re-fetch configuration with context parameters
      configFetcher.clearCache();
      const newConfig = await configFetcher.fetchConfiguration(context);

      // Get new server names
      const newServerNames = new Set(Object.keys(newConfig.mcpServers));

      // Detect changes
      const serversAdded = [...newServerNames].filter((name) => !oldServerNames.has(name));
      const serversRemoved = [...oldServerNames].filter((name) => !newServerNames.has(name));
      const serversRetained = [...newServerNames].filter((name) => oldServerNames.has(name));

      // Disconnect servers that are no longer in config
      for (const serverName of serversRemoved) {
        try {
          await clientManager.disconnectServer(serverName);
          console.error(`Disconnected removed server: ${serverName}`);
        } catch (error) {
          console.error(`Failed to disconnect server ${serverName}:`, error);
        }
      }

      // Connect to new servers and reconnect existing ones
      const connectionPromises = Object.entries(newConfig.mcpServers).map(async ([name, serverConfig]) => {
        try {
          // Disconnect if already connected (to force reconnect)
          if (oldServerNames.has(name)) {
            await clientManager.disconnectServer(name);
          }

          // Connect
          await clientManager.connectToServer(name, serverConfig);
          connected.push(name);
          console.error(`Connected to MCP server: ${name}`);
        } catch (error) {
          failed.push(name);
          console.error(`Failed to connect to MCP server ${name}:`, error);
        }
      });

      await Promise.all(connectionPromises);

      // Collect new capabilities
      const newClients = clientManager.getAllClients();
      const newTools: any[] = [];
      const newResources: any[] = [];
      const newPrompts: any[] = [];

      await Promise.all(
        newClients.map(async (client) => {
          const [tools, resources, prompts] = await Promise.all([
            client.listTools().catch(() => []),
            client.listResources().catch(() => []),
            client.listPrompts().catch(() => []),
          ]);
          newTools.push(...tools);
          newResources.push(...resources);
          newPrompts.push(...prompts);
        }),
      );

      // Stringify for comparison
      const newToolsStr = JSON.stringify(newTools.sort((a, b) => a.name?.localeCompare(b.name) || 0));
      const newResourcesStr = JSON.stringify(newResources.sort((a, b) => a.uri?.localeCompare(b.uri) || 0));
      const newPromptsStr = JSON.stringify(newPrompts.sort((a, b) => a.name?.localeCompare(b.name) || 0));

      // Determine what changed by comparing stringified versions
      const toolsChanged = oldToolsStr !== newToolsStr;
      const resourcesChanged = oldResourcesStr !== newResourcesStr;
      const promptsChanged = oldPromptsStr !== newPromptsStr;

      // Send change notifications
      if (toolsChanged) {
        await server.sendToolListChanged();
        console.error(`Tool list changed: ${oldTools.length} -> ${newTools.length} tools`);
      }

      if (resourcesChanged) {
        await server.sendResourceListChanged();
        console.error(`Resource list changed: ${oldResources.length} -> ${newResources.length} resources`);
      }

      if (promptsChanged) {
        await server.sendPromptListChanged();
        console.error(`Prompt list changed: ${oldPrompts.length} -> ${newPrompts.length} prompts`);
      }

      // Build detailed change summary
      const changeSummary = [];
      if (serversAdded.length > 0) {
        changeSummary.push(`Added servers: ${serversAdded.join(', ')}`);
      }
      if (serversRemoved.length > 0) {
        changeSummary.push(`Removed servers: ${serversRemoved.join(', ')}`);
      }
      if (serversRetained.length > 0 && (serversAdded.length > 0 || serversRemoved.length > 0)) {
        changeSummary.push(`Retained servers: ${serversRetained.length}`);
      }
      if (toolsChanged) {
        changeSummary.push(`Tools: ${oldTools.length} -> ${newTools.length}`);
      }
      if (resourcesChanged) {
        changeSummary.push(`Resources: ${oldResources.length} -> ${newResources.length}`);
      }
      if (promptsChanged) {
        changeSummary.push(`Prompts: ${oldPrompts.length} -> ${newPrompts.length}`);
      }

      const message =
        `Reload complete. Connected: ${connected.length}, Failed: ${failed.length}` +
        (changeSummary.length > 0 ? `. Changes: ${changeSummary.join('; ')}` : '');

      // Send logging notification about completion
      await server.sendLoggingMessage({
        level: failed.length > 0 ? 'warning' : 'info',
        data: message,
      });
      console.error(message);

      return {
        success: failed.length === 0,
        message,
        connected,
        failed,
      };
    } catch (error) {
      const message = `Failed to reload configuration: ${error}`;
      await server.sendLoggingMessage({
        level: 'error',
        data: message,
      });
      console.error(message);
      return {
        success: false,
        message,
        connected,
        failed,
      };
    }
  };

  // Instantiate the reload tool with the reload function
  reloadTool = new ReloadConfigTool(reload);

  // Instantiate progressive mode tools if enabled
  if (progressive) {
    describeTools = new DescribeTools(clientManager, useServerPrefix);
    useToolTool = new UseToolTool(clientManager, useServerPrefix);
  }

  return { server, reload };
}

/**
 * Create an MCP proxy server that forwards requests to remote MCP servers
 * @deprecated Use createServerWithReload for reload capability
 */
export async function createServer(options: ProxyServerOptions): Promise<Server> {
  const { server } = await createServerWithReload(options);
  return server;
}
