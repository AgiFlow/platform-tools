# @agiflowai/powertool

AgiFlow MCP Proxy Server - A powerful MCP toolkit that fetches configurations from Agiflow and proxies tools, resources, and prompts from multiple MCP servers.

## Features

### MCP Proxy Capabilities
- **Remote Configuration**: Fetch MCP server configurations from Agiflow hosted at https://agiflow.io
- **Local Configuration**: Use local JSON configuration files for MCP servers
- **Configuration Merging**: Combine remote and local configs with flexible merge strategies
- **Multi-Server Proxy**: Connect to and proxy multiple MCP servers (stdio, HTTP, SSE)
- **Tool Aggregation**: Aggregate tools from all connected servers with automatic namespacing
- **Resource Proxying**: Proxy resources from all connected servers
- **Prompt Forwarding**: Forward prompt requests to the appropriate remote servers
- **Connection Management**: Automatic connection pooling and lifecycle management
- **Flexible Transports**: Support for stdio, HTTP, and SSE transports

## Installation

### For End Users (via npm)

```bash
# Install globally
npm install -g @agiflowai/powertool

# Or use with npx (no installation needed)
npx @agiflowai/powertool mcp-serve
```

### For Development

```bash
# Clone and install dependencies
pnpm install

# Build the package
pnpm build
```

## Quick Start

### Getting Your Configuration from Agiflow

1. **Sign up at [https://agiflow.io](https://agiflow.io)**
2. **Create a new project** in the Agiflow dashboard
3. **Follow the setup wizard** to generate your MCP configuration
   - The wizard provides your project-specific endpoint URL and API key
   - Agiflow hosts your MCP servers as HTTP endpoints

### Add to Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "agiflow": {
      "command": "npx",
      "args": ["-y", "@agiflowai/powertool", "mcp-serve"],
      "env": {
        "AGIFLOW_MCP_PROXY_ENDPOINT": "https://agiflow.io/api/v1/projects/your-project-id/mcp/config",
        "AGIFLOW_MCP_API_KEY": "your-generated-api-key"
      }
    }
  }
}
```

## Configuration Format

The Agiflow endpoint returns JSON configuration in the following format:

```json
{
  "mcpServers": {
    "server-name": {
      "name": "server-name",
      "transport": "stdio|http|sse",
      "config": {
        // For stdio:
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-example"],
        "env": { "KEY": "value" }

        // For HTTP/SSE:
        "url": "http://localhost:3000/mcp",
        "headers": { "Authorization": "Bearer token" }
      }
    }
  }
}
```

## Usage

### CLI

The proxy server supports three ways to configure your MCP servers (in order of precedence):

#### Method 1: Environment Variables (Recommended for CI/CD)

Get your endpoint and API key from the Agiflow dashboard setup wizard:

```bash
export AGIFLOW_MCP_PROXY_ENDPOINT=https://agiflow.io/api/v1/projects/your-project-id/mcp/config
export AGIFLOW_MCP_API_KEY=your-api-key-here
@agiflowai/powertool mcp-serve
```

#### Method 2: Local Configuration File

```bash
# Using a local JSON config file
@agiflowai/powertool mcp-serve --config-file ./mcp-config.json

# With HTTP transport
@agiflowai/powertool mcp-serve --config-file ./mcp-config.json --type http --port 3000
```

#### Method 4: Merged Configuration (Local + Remote)

You can combine both remote Agiflow configuration and local configuration files. This is useful when you want to:
- Use Agiflow's hosted servers while adding your own local servers
- Override specific server configurations from Agiflow
- Test local servers alongside production remote servers

```bash
# Set remote config via environment variables and provide a local file
export AGIFLOW_MCP_PROXY_ENDPOINT=https://agiflow.io/api/v1/projects/your-project-id/mcp/config
export AGIFLOW_MCP_API_KEY=your-api-key-here
@agiflowai/powertool mcp-serve --config-file ./local-mcp-config.json

# Control merge behavior with --merge-strategy
@agiflowai/powertool mcp-serve \
  --config-file ./local-mcp-config.json \
  --merge-strategy local-priority  # local overrides remote (default)

# Or prioritize remote config
@agiflowai/powertool mcp-serve \
  --config-file ./local-mcp-config.json \
  --merge-strategy remote-priority  # remote overrides local

# Deep merge both configs
@agiflowai/powertool mcp-serve \
  --config-file ./local-mcp-config.json \
  --merge-strategy merge-deep  # merge configs deeply
```

**Merge Strategies Explained:**

1. **`local-priority` (default)**: Local servers completely replace remote servers with the same name
   ```
   Remote: { "server-a": {...remote...}, "server-b": {...} }
   Local:  { "server-a": {...local...}, "server-c": {...} }
   Result: { "server-a": {...local...}, "server-b": {...}, "server-c": {...} }
   ```

2. **`remote-priority`**: Remote servers completely replace local servers with the same name
   ```
   Remote: { "server-a": {...remote...}, "server-b": {...} }
   Local:  { "server-a": {...local...}, "server-c": {...} }
   Result: { "server-a": {...remote...}, "server-b": {...}, "server-c": {...} }
   ```

3. **`merge-deep`**: Deep merge server configs, local properties override remote on conflict
   ```
   Remote: { "server-a": { transport: "http", config: { url: "remote.com", headers: { "X-Remote": "1" } } } }
   Local:  { "server-a": { config: { url: "localhost", headers: { "X-Local": "1" } } } }
   Result: { "server-a": { transport: "http", config: { url: "localhost", headers: { "X-Remote": "1", "X-Local": "1" } } } }
   ```

#### Method 3: Interactive Authentication (Easiest for Development)

Simply run the command without any configuration:

```bash
@agiflowai/powertool mcp-serve
```

The CLI will:
1. Check for saved credentials in `$HOME/.agiflow/mcp.credentials.json`
2. If not found, prompt you to authenticate:
   - Visit [https://agiflow.io](https://agiflow.io) and sign up/login
   - Create a project and follow the setup wizard
   - Copy your endpoint URL and API key from the wizard
   - Enter them in the CLI prompts
3. Save credentials for future use (per project directory)

### Command Options

- `-t, --type <type>` - Transport type: `stdio`, `http`, or `sse` (default: `stdio`)
- `-p, --port <port>` - Port to listen on for HTTP/SSE (default: `3000`)
- `--host <host>` - Host to bind to for HTTP/SSE (default: `localhost`)
- `-f, --config-file <path>` - Path to local MCP configuration JSON file
- `--merge-strategy <strategy>` - Merge strategy when both remote and local configs are provided: `local-priority`, `remote-priority`, or `merge-deep` (default: `local-priority`)
- `--use-server-prefix` - Prefix tools and resources with server name (e.g., `server/tool`)
- `--progressive` - Enable progressive MCP tools (`get-tool` and `use-tool`) for tool discovery and execution

### Configuration Merging

When both remote (Agiflow) and local configuration sources are provided, powertool can merge them together. This enables powerful workflows like:

- 🔧 **Development**: Use Agiflow production servers while testing local development servers
- 🎯 **Override**: Override specific remote server configurations with local settings
- 🔐 **Augment**: Add authentication headers or environment variables to remote servers
- 🧪 **Testing**: Mix production and test servers in the same environment

**Example: Combining Remote + Local Configs**

```bash
# Set up remote Agiflow configuration
export AGIFLOW_MCP_PROXY_ENDPOINT=https://agiflow.io/api/v1/projects/your-project-id/mcp/config
export AGIFLOW_MCP_API_KEY=your-api-key

# Create local-config.json with additional servers
cat > local-config.json << EOF
{
  "mcpServers": {
    "local-filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "custom-server": {
      "url": "http://localhost:8080/mcp",
      "type": "http"
    }
  }
}
EOF

# Start with merged configuration
@agiflowai/powertool mcp-serve --config-file ./local-config.json
```

The result: **All remote Agiflow servers + local-filesystem + custom-server**

### Configuration Priority

Configuration sources are resolved in this order:

1. **Environment variables** (`AGIFLOW_MCP_PROXY_ENDPOINT` + `AGIFLOW_MCP_API_KEY`) - Remote config
2. **Config file** (via `--config-file` option) - Local config
3. **Saved credentials** (`$HOME/.agiflow/mcp.credentials.json` - per project) - Remote config
4. **Interactive prompt** (if none of the above are available) - Remote config

**When both remote and local sources exist, they are merged according to `--merge-strategy`**

### Usage with Claude Code

Add to your Claude Code configuration:

**Option 1: Using environment variables (from Agiflow setup wizard)**
```json
{
  "mcpServers": {
    "agiflow": {
      "command": "npx",
      "args": ["-y", "@agiflowai/powertool", "mcp-serve"],
      "env": {
        "AGIFLOW_MCP_PROXY_ENDPOINT": "https://agiflow.io/api/v1/projects/your-project-id/mcp/config",
        "AGIFLOW_MCP_API_KEY": "your-generated-api-key"
      }
    }
  }
}
```

**Option 2: Using saved credentials (recommended for development)**
```json
{
  "mcpServers": {
    "agiflow": {
      "command": "npx",
      "args": ["-y", "@agiflowai/powertool", "mcp-serve"]
    }
  }
}
```
_Note: Run `npx @agiflowai/powertool mcp-serve` once in your project directory to authenticate and save credentials._

**Option 3: Using a local config file (for testing)**
```json
{
  "mcpServers": {
    "agiflow": {
      "command": "npx",
      "args": [
        "-y",
        "@agiflowai/powertool",
        "mcp-serve",
        "--config-file",
        "/path/to/mcp-config.json"
      ]
    }
  }
}
```

## Development

```bash
# Run in development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint and format
pnpm lint
pnpm lint:fix
```

## Progressive MCP Usage

When `--progressive` is enabled, powertool provides two meta-tools for progressive discovery of MCP tools:

### `get-tool` - Discover Tool Information

Query detailed information about any MCP tool before using it:
- Tool description and documentation
- Complete input schema with parameter types
- Required vs optional parameters
- Which server provides the tool

### `use-tool` - Execute MCP Tools

Execute any MCP tool from connected servers:
- Automatically finds the correct server for a tool
- Supports disambiguation when multiple servers provide the same tool
- Forwards tool arguments to the underlying MCP server

**Recommended Flow:**
1. Call `get-tool` with `toolName` to see the tool's schema
2. Call `use-tool` with `toolName` and `toolArgs` based on the discovered schema
3. If multiple servers provide the same tool, specify `serverName` to disambiguate

## How It Works

### MCP Proxy Flow

1. **Configuration Fetch**: On startup, fetches MCP server configurations from Agiflow
2. **Server Connection**: Connects to all configured MCP servers based on their transport type
3. **Request Proxying**: Proxies incoming requests to the appropriate remote server
4. **Namespacing**: Prefixes tool/prompt names and resource URIs with server names to avoid conflicts
5. **Aggregation**: Combines results from all servers into a single response

### Tool Naming

Tools are automatically namespaced: `serverName/toolName`

Example: If a server named `filesystem` has a tool `read_file`, it becomes `filesystem/read_file`

### Resource URIs

Resources are prefixed with server name: `serverName://resourceUri`

Example: `filesystem://file:///path/to/file.txt`

### Prompts

Prompts are namespaced: `serverName/promptName`

Example: `code-review/review-pr`

## Architecture

### Core Services

- **ConfigFetcherService**: Fetches and caches remote MCP configurations from Agiflow
- **McpClientManagerService**: Manages connections to remote MCP servers
- **CredentialsManagerService**: Manages OAuth flow and credential persistence
- **LockfileService**: Manages project-specific configuration locks

### Server Components

- **Proxy Server**: Aggregates and forwards requests to remote servers
- **Transport Handlers**: Support for stdio, HTTP, and SSE transports
- **OAuth Callback Server**: Handles OAuth authentication flow

### Tools

- **ReloadConfigTool**: Dynamically reload MCP configuration without restart

## Project Structure

```
packages/powertool/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Public API exports
│   ├── commands/                 # CLI commands
│   │   ├── mcp-serve.ts         # MCP server command
│   │   └── reload-config.ts     # Config reload command
│   ├── services/                 # Core services
│   │   ├── ConfigFetcherService.ts
│   │   ├── McpClientManagerService.ts
│   │   ├── CredentialsManagerService.ts
│   │   ├── LockfileService.ts
│   │   ├── McpOAuthClientProvider.ts
│   │   └── OAuthCallbackServer.ts
│   ├── instructions/             # Reference documentation
│   │   └── agents/
│   │       └── agiflow-agents.md # MCP tools reference
│   ├── tools/                    # MCP tools
│   │   └── ReloadConfigTool.ts
│   ├── transports/               # Transport handlers
│   │   ├── stdio.ts
│   │   ├── http.ts
│   │   └── sse.ts
│   └── server/                   # Proxy server implementation
└── tests/                        # Test files
```

## Related Projects

- **[Agiflow Marketplace](../../agiflow-marketplace/)**: Claude Code plugin marketplace with slash commands
- **[Agiflow Platform](https://agiflow.io)**: Hosted MCP servers and project management
- **[Agiflow Backend](https://github.com/agiflow/agiflow)**: MCP server implementation

## Support

- **Documentation**: [https://docs.agiflow.io](https://docs.agiflow.io)
- **Issues**: [GitHub Issues](https://github.com/agiflow/platform-tools-internal/issues)
- **Agiflow Platform**: [https://agiflow.io](https://agiflow.io)

## License

Sustainable Use License - See [LICENSE.md](../../LICENSE.md) for details

This project is licensed under a modified [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/):

- ✅ **Free for small businesses** - Companies with fewer than 20 employees
- ✅ **Free for personal use** - Individuals and non-profit organizations
- ✅ **Free for evaluation** - Testing the software for potential commercial use
- 💼 **Commercial license required** - Companies with 20+ employees

For commercial licensing inquiries, please contact: [https://agiflow.io](https://agiflow.io)