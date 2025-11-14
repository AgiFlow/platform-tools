/**
 * Reload Config Command
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

interface ReloadConfigOptions {
  host: string;
  port: number;
  taskId?: string;
  workUnitId?: string;
  projectId?: string;
  verbose: boolean;
}

/**
 * Reload MCP server configuration and reconnect to all configured servers with optional context parameters
 */
export const reloadConfigCommand = new Command('reload-config')
  .description(
    'Reload MCP server configuration and reconnect to all configured servers with optional context parameters',
  )
  .option('--host <host>', 'MCP server host', 'localhost')
  .option('--port <port>', 'MCP server port', (val) => parseInt(val, 10), 3000)
  .option('--task-id <taskId>', 'Optional task ID to fetch task-specific MCP configuration')
  .option(
    '--work-unit-id <workUnitId>',
    'Optional work unit ID to fetch work-unit-specific MCP configuration',
  )
  .option(
    '--project-id <projectId>',
    'Optional project ID to fetch project-specific MCP configuration',
  )
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (options: ReloadConfigOptions) => {
    try {
      if (options.verbose) {
        console.log('Reloading MCP server configuration with options:', options);
      }

      const url = `http://${options.host}:${options.port}/reload`;

      // Build request body with context parameters
      const body: Record<string, string> = {};
      if (options.taskId) {
        body.taskId = options.taskId;
      }
      if (options.workUnitId) {
        body.workUnitId = options.workUnitId;
      }
      if (options.projectId) {
        body.projectId = options.projectId;
      }

      if (options.verbose) {
        console.log(`Sending reload request to ${url}`);
        if (Object.keys(body).length > 0) {
          console.log('Context parameters:', body);
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Reload request failed: ${response.status} ${response.statusText}\n${errorText}`,
        );
      }

      const result = (await response.json()) as {
        success: boolean;
        message: string;
        connected: string[];
        failed: string[];
      };

      if (options.verbose || result.failed.length > 0) {
        console.log('\nReload Results:');
        console.log(`Status: ${result.success ? 'Success' : 'Completed with errors'}`);
        console.log(`Message: ${result.message}`);

        if (result.connected.length > 0) {
          console.log(`\nConnected servers (${result.connected.length}):`);
          for (const server of result.connected) {
            console.log(`  ✓ ${server}`);
          }
        }

        if (result.failed.length > 0) {
          console.log(`\nFailed servers (${result.failed.length}):`);
          for (const server of result.failed) {
            console.log(`  ✗ ${server}`);
          }
        }
      } else {
        console.log(
          `✓ Configuration reloaded successfully (${result.connected.length} server(s) connected)`,
        );
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Error executing reload-config:', error);
      process.exit(1);
    }
  });
