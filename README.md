# Platform Tools Internal

Agiflow development tools monorepo - includes Claude Code plugins, MCP toolkit, and development utilities.

## What's Inside

### 📦 Packages

#### [@agiflowai/powertool](./packages/powertool/)
npm package providing:
- **MCP Proxy Server**: Aggregates multiple MCP servers from Agiflow
- **Built-in Prompts**: Project management workflows (plan, task, work, complete)
- **Template Service**: LiquidJS rendering with 14 custom filters

```bash
npm install -g @agiflowai/powertool
# or
npx @agiflowai/powertool mcp-serve
```

### 🔌 Marketplaces

#### [Agiflow Marketplace](./agiflow-marketplace/)
Claude Code plugin marketplace with intelligent project management capabilities:
- `/agiflow-plan` - Convert requirements into structured tasks and work units
- `/agiflow-task` - Implement tasks with progress tracking and validation
- `/agiflow-work` - Execute work units (features/epics) with multiple tasks
- `/agiflow-complete` - Complete tasks with automated validation checks

## Quick Start

### Prerequisites

- Node.js (v18 or later)
- pnpm (v8 or later)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development

### Available Scripts

- `pnpm build` - Build all projects
- `pnpm test` - Test all projects
- `pnpm lint` - Lint all projects
- `pnpm typecheck` - Type check all projects
- `pnpm affected:build` - Build only affected projects
- `pnpm affected:test` - Test only affected projects
- `pnpm affected:lint` - Lint only affected projects
- `pnpm graph` - View project dependency graph

### Working on Packages

#### Develop @agiflowai/powertool

```bash
cd packages/powertool
pnpm dev              # Run in development mode
pnpm build            # Build the package
pnpm test             # Run tests
pnpm typecheck        # Type check
```

#### Test Claude Code Plugin Locally

```bash
# From repository root
cd agiflow-marketplace

# Start Claude Code from parent directory
cd ..
claude

# In Claude Code:
/plugin marketplace add ./agiflow-marketplace
/plugin install agiflow@agiflow-marketplace
```

## Repository Structure

```
.
├── agiflow-marketplace/          # Claude Code plugins
│   ├── .claude-plugin/          # Marketplace manifest
│   └── agiflow-plugin/          # Main plugin
│       ├── commands/            # Slash commands
│       ├── skills/              # Proactive skills
│       └── README.md
├── packages/                     # npm packages
│   └── powertool/               # @agiflowai/powertool
│       ├── src/
│       │   ├── commands/        # CLI commands
│       │   ├── services/        # Core services
│       │   ├── prompts/         # Prompt exports
│       │   ├── instructions/    # Template files
│       │   ├── tools/           # MCP tools
│       │   └── transports/      # Transport handlers
│       └── README.md
├── apps/                         # Application projects
├── libs/                         # Shared library projects
├── nx.json                       # Nx configuration
├── pnpm-workspace.yaml          # pnpm workspace
└── LICENSE.md                    # Sustainable Use License
```

## Related Projects

- **[Agiflow Platform](https://agiflow.io)**: Hosted MCP servers and project management
- **[Agiflow Backend](https://github.com/agiflow/agiflow)**: MCP server implementation
- **[Claude Code](https://docs.claude.com/claude-code)**: AI coding assistant

## Support

- **Documentation**: [https://docs.agiflow.io](https://docs.agiflow.io)
- **Issues**: [GitHub Issues](https://github.com/agiflow/platform-tools-internal/issues)
- **Agiflow Platform**: [https://agiflow.io](https://agiflow.io)

## License

Sustainable Use License - See [LICENSE.md](./LICENSE.md) for details

This project is licensed under a modified [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/):

- ✅ **Free for small businesses** - Companies with fewer than 20 employees
- ✅ **Free for personal use** - Individuals and non-profit organizations
- ✅ **Free for evaluation** - Testing the software for potential commercial use
- 💼 **Commercial license required** - Companies with 20+ employees

For commercial licensing inquiries, please visit: [https://agiflow.io](https://agiflow.io)
