# Agiflow Marketplace for Claude Code

Official marketplace for Agiflow plugins that extend Claude Code with intelligent project management capabilities.

## Plugins

### Agiflow Plugin

Plan project backlogs, manage tasks, and organize work units with Agiflow MCP integration.

**Features:**
- `/agiflow-plan` - Convert requirements into structured tasks and work units
- `/agiflow-task` - Implement single tasks with progress tracking
- `/agiflow-work` - Execute work units (features/epics) with multiple tasks
- `/agiflow-complete` - Complete and validate tasks with final checks
- Automatic agent assignment based on work type
- Smart work unit organization (3-8 tasks per unit)
- Proactive project management skill that triggers on relevant queries
- Duplicate prevention and quality validation
- Integration with Architect MCP for design pattern compliance

[View Plugin Documentation →](./project-management/README.md)

## Quick Start

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Configure Agiflow MCP Server

#### Option A: Get Configuration from Agiflow (Recommended)

1. **Sign up at [https://agiflow.io](https://agiflow.io)**
2. **Create a new project** in the Agiflow dashboard
3. **Follow the setup wizard** to generate your MCP configuration
   - The wizard will provide you with a ready-to-use `.mcp.json` configuration
   - Configuration includes your project-specific endpoint and API key
   - Agiflow provides HTTP MCP servers hosted at `https://agiflow.io`

4. **Copy the configuration** to your project's `.mcp.json` file

**Example configuration from Agiflow:**
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

#### Option B: Interactive Authentication (Alternative)

Simply run the command without configuration, and `@agiflowai/powertool` will guide you through authentication:

```bash
npx @agiflowai/powertool mcp-serve
```

The CLI will:
1. Prompt you to visit https://agiflow.io/auth
2. Ask you to copy your endpoint URL and API key
3. Save credentials locally for future use

Then add to your `.mcp.json`:
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

#### Option C: Local Development

For contributors developing the powertool package:

```json
{
  "mcpServers": {
    "agiflow-proxy": {
      "type": "stdio",
      "command": "bun",
      "args": ["./packages/powertool/src/cli.ts", "mcp-serve", "--config-file", "./mcp-proxy-config.json"]
    }
  }
}
```

### 3. Install from GitHub (Production)

```bash
# Start Claude Code
claude

# Add marketplace
/plugin marketplace add https://github.com/agiflow/claude-code-marketplace

# Install plugin
/plugin install agiflow@agiflow-marketplace

# Restart Claude Code
```

### 4. Install from Local Directory (Development)

```bash
# Clone this repository
git clone https://github.com/agiflow/claude-code-marketplace.git

# Start Claude Code
claude

# Add local marketplace
/plugin marketplace add ./path/to/agiflow-marketplace

# Install plugin
/plugin install agiflow@agiflow-marketplace

# Restart Claude Code
```

## Usage

### Available Commands

#### `/agiflow-plan` - Planning Projects

Convert requirements into structured tasks and work units.

```bash
/agiflow-plan
```

Claude will:
1. Analyze your project context
2. Break down requirements into 5-15 focused tasks
3. Assign tasks to appropriate agents
4. Group related tasks into work units (3-8 tasks per unit)
5. Create everything in Agiflow with acceptance criteria

**Example:**
```
You: /agiflow-plan Add shopping cart functionality with checkout

Claude:
- Analyzing project context...
- Creating 6 tasks...
- Creating work unit "Shopping Cart Feature"...
- Associating tasks with work unit...

Created:
✓ Work Unit: Shopping Cart Feature (6 tasks, ~3 hours)
  - Task 1: Implement add-to-cart API (nodejs-hono-api-developer)
  - Task 2: Implement remove-from-cart API (nodejs-hono-api-developer)
  - Task 3: Implement get-cart API (nodejs-hono-api-developer)
  - Task 4: Create cart UI component (spa-frontend-developer)
  - Task 5: Add checkout flow (spa-frontend-developer)
  - Task 6: Add cart tests (nodejs-hono-api-developer)
```

#### `/agiflow-task` - Implementing Tasks

Execute a single task from your backlog with automatic tracking.

```bash
/agiflow-task [task-id]
```

Claude will:
1. List available Todo tasks (or use provided task-id)
2. Move task to "In Progress"
3. Check design patterns with Architect MCP (MANDATORY)
4. Implement each acceptance criterion
5. Update devInfo with progress tracking
6. Validate code changes with Architect MCP (MANDATORY)
7. Move task to "Review" when complete

**Example:**
```
You: /agiflow-task

Claude:
Available Tasks:
1. Implement add-to-cart API (high priority)
2. Create cart UI component (medium priority)

Which task would you like to work on?

You: 1

Claude:
- Getting task details...
- Moving to "In Progress"...
- Checking design patterns for files to edit...
- Implementing: POST /cart/add endpoint...
- Running code validation...
- Updating devInfo with test results...
- Moving to "Review"
✓ Task complete and ready for review
```

#### `/agiflow-work` - Executing Work Units

Execute a complete work unit (feature/epic) with multiple tasks.

```bash
/agiflow-work [work-unit-slug-or-id]
```

Claude will:
1. Get work unit with all associated tasks
2. Set work unit status to "in_progress"
3. Create TODO list of tasks in execution order
4. Execute each task sequentially with full validation
5. Update work unit progress in devInfo
6. Run tests between tasks
7. Complete work unit when all tasks done

**Example:**
```
You: /agiflow-work shopping-cart-feature

Claude:
Work Unit: Shopping Cart Feature (6 tasks)
Scope: Add/remove/get cart + UI + tests

Execution Plan: Backend API → Frontend UI → Tests

Task 1/6: Implement add-to-cart API
- Checking design patterns...
- Implementing...
- Tests passing ✓
- Committed: "feat: add cart API endpoint"

Task 2/6: Implement remove-from-cart API
...

✓ Work Unit Complete (6/6 tasks, 3.2 hours)
```

#### `/agiflow-complete` - Completing Tasks

Mark a task as complete with final validation.

```bash
/agiflow-complete [task-id]
```

Claude will:
1. Verify all acceptance criteria are checked
2. Verify task status is "Review"
3. Run final validations (typecheck, test, lint)
4. Add completion summary comment
5. Move task to "Done"

**Example:**
```
You: /agiflow-complete task-123

Claude:
Reviewing task: Implement add-to-cart API

✓ All acceptance criteria checked (4/4)
✓ Task status is "Review"

Running validations:
✓ TypeScript compilation passed
✓ All tests passed (coverage: 87%)
✓ Code formatting clean

Adding completion comment...
Moving to "Done"...

✓ Task completed successfully
Files changed: backend/apis/cart/src/handlers/addToCart.ts:15
```

## Testing Locally

### 1. Set up development environment

```bash
# Navigate to this directory
cd agiflow-marketplace

# Start Claude Code from parent directory
cd ..
claude
```

### 2. Add and install local marketplace

```bash
# Add marketplace
/plugin marketplace add ./agiflow-marketplace

# Install plugin
/plugin install agiflow@agiflow-marketplace

# Restart Claude Code
```

### 3. Make changes and test

After modifying plugin files:

```bash
# Uninstall current version
/plugin uninstall agiflow@agiflow-marketplace

# Reinstall with changes
/plugin install agiflow@agiflow-marketplace

# Test your changes
/agiflow-plan
/agiflow-task
/agiflow-work
/agiflow-complete
```

## Plugin Structure

```
agiflow-marketplace/
├── project-management/                # Main plugin
│   ├── .claude-plugin/
│   │   └── plugin.json           # Plugin metadata
│   ├── commands/
│   │   ├── plan.md               # /agiflow-plan command
│   │   ├── task.md               # /agiflow-task command
│   │   └── work.md               # /agiflow-work command
│   ├── skills/
│   │   └── project-management/
│   │       ├── SKILL.md          # Skill definition
│   │       └── agiflow-agents.md # MCP tools reference (726 lines)
│   └── README.md                 # Plugin documentation
└── README.md                      # This file
```

### Key Components

**Commands** (`commands/`):
- Slash commands that provide guided workflows for planning, implementing, and completing work
- Each command is a markdown file with structured prompts

**Skills** (`skills/`):
- Proactive capabilities that trigger automatically based on user intent
- `project-management` skill activates on queries about tasks, planning, or project management
- Includes comprehensive MCP tools reference (25+ tools documented)

## Support

- **Documentation**: https://docs.agiflow.io
- **Plugin Issues**: https://github.com/agiflow/claude-code-marketplace/issues
- **Agiflow Platform**: https://agiflow.io

## Contributing

We welcome contributions! To add a new plugin:

1. Fork this repository
2. Create a new plugin directory in the marketplace
3. Add plugin metadata and components
4. Update `marketplace.json`
5. Test locally
6. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## License

Sustainable Use License - See [LICENSE.md](../LICENSE.md) for details

This project is licensed under a modified [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/):

- ✅ **Free for small businesses** - Companies with fewer than 20 employees
- ✅ **Free for personal use** - Individuals and non-profit organizations
- ✅ **Free for evaluation** - Testing the software for potential commercial use
- 💼 **Commercial license required** - Companies with 20+ employees

For commercial licensing inquiries, please visit: [https://agiflow.io](https://agiflow.io)
