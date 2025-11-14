/**
 * errorLogger Utilities
 *
 * DESIGN PATTERNS:
 * - Pure functions with no side effects
 * - Single responsibility per function
 * - Functional programming approach
 *
 * CODING STANDARDS:
 * - Export individual functions, not classes
 * - Use descriptive function names with verbs
 * - Add JSDoc comments for complex logic
 * - Keep functions small and focused
 *
 * AVOID:
 * - Side effects (mutating external state)
 * - Stateful logic (use services for state)
 * - External dependencies (keep utilities pure)
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

/**
 * Save error log to OS temporary directory
 *
 * @param error - The error object or message to log
 * @param context - Additional context about where the error occurred
 * @returns Path to the saved error log file
 */
export function saveErrorLog(error: Error | string, context: string = 'unknown'): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : 'No stack trace';

  // Create error log content
  const logContent = `
=== MCP Powertool Error Log ===
Timestamp: ${new Date().toISOString()}
Context: ${context}
Error Message: ${errorMessage}

Stack Trace:
${errorStack}

Environment:
- Node Version: ${process.version}
- Platform: ${process.platform}
- Architecture: ${process.arch}
- CWD: ${process.cwd()}

Environment Variables:
- AGIFLOW_MCP_CONFIG_URL: ${process.env.AGIFLOW_MCP_CONFIG_URL || 'not set'}
- AGIFLOW_MCP_PROXY_ENDPOINT: ${process.env.AGIFLOW_MCP_PROXY_ENDPOINT || 'not set'}
- AGIFLOW_MCP_API_KEY: ${process.env.AGIFLOW_MCP_API_KEY ? '[SET]' : 'not set'}
`.trim();

  // Ensure tmp directory exists
  const tmpDir = tmpdir();
  const logDir = join(tmpDir, 'mcp-powertool-logs');

  try {
    mkdirSync(logDir, { recursive: true });
  } catch (err) {
    // If we can't create the directory, fall back to tmpdir
    console.error('Failed to create log directory:', err);
  }

  // Create log file path
  const logFileName = `error-${context.replace(/[^a-z0-9]/gi, '-')}-${timestamp}.log`;
  const logFilePath = join(logDir, logFileName);

  // Write log file
  try {
    writeFileSync(logFilePath, logContent, 'utf-8');
    return logFilePath;
  } catch (err) {
    console.error('Failed to write error log file:', err);
    throw new Error(`Failed to save error log: ${err}`);
  }
}

/**
 * Format error for logging
 *
 * @param error - The error to format
 * @returns Formatted error string
 */
export function formatError(error: Error | string): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
