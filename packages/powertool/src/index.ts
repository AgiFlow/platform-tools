/**
 * @agiflowai/powertool - Public API
 *
 * DESIGN PATTERNS:
 * - Barrel export pattern for clean public API
 * - Named exports only (no default exports)
 * - Organized by module type (server, types, transports)
 *
 * CODING STANDARDS:
 * - Export only public-facing interfaces and classes
 * - Group related exports with comments
 * - Use explicit named exports (no wildcard exports)
 * - Keep in sync with module structure
 *
 * AVOID:
 * - Default exports (use named exports)
 * - Wildcard exports (be explicit)
 * - Exporting internal implementation details
 * - Mixing CLI and library concerns
 */

// Server
export { createServer, type ProxyServerOptions } from './server/index.js';

// Types
export type * from './types/index.js';

// Transports
export { StdioTransportHandler } from './transports/stdio.js';
export { SseTransportHandler } from './transports/sse.js';
export { HttpTransportHandler } from './transports/http.js';

// Tools - Add tool exports here as you create them
// Example: export { MyTool } from './tools/MyTool.js';

// Services
export {
  ConfigFetcherService,
  type ConfigFetcherOptions,
} from './services/ConfigFetcherService.js';
export { McpClientManagerService } from './services/McpClientManagerService.js';
export {
  CredentialsManagerService,
  type McpCredentials,
} from './services/CredentialsManagerService.js';

// Prompts - Add prompt exports here as you create them
// Example: export { MyPrompt } from './prompts/MyPrompt.js';

// Utils - Add utility exports here as you create them
// Example: export { formatHelper } from './utils/formatHelper.js';
