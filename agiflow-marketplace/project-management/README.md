# Agiflow Project Management Plugin for Claude Code

Official Agiflow plugin for Claude Code that enables intelligent project planning, task management, and work unit organization through the Agiflow MCP integration.

## Features

### Commands

#### `/agiflow-plan` - Intelligent Project Planning

Convert requirements into structured tasks and work units using the Agiflow MCP tools.

**What it does:**
- Analyzes project requirements and breaks them into actionable tasks
- Automatically assigns tasks to appropriate agent members
- Groups related tasks into cohesive work units
- Validates task completeness and prevents duplicates
- Follows best practices for task sizing and organization

**Key Capabilities:**
- 🎯 **Smart Task Breakdown**: Creates focused, completable tasks (15min - 2 hours each)
- 👥 **Agent Assignment**: Assigns tasks to specialized agents based on work type
- 📦 **Work Unit Organization**: Groups related tasks into features (3-8 tasks, 2-4 hours)
- ✅ **Quality Validation**: Ensures concrete acceptance criteria and clear requirements
- 🔍 **Duplicate Prevention**: Checks existing tasks and work units before creating new ones

#### `/agiflow-task` - Task Implementation Workflow

Implement individual tasks with proper tracking and validation.

**What it does:**
- Lists available tasks and helps select the right one
- Manages task status transitions (Todo → In Progress → Review → Done)
- Enforces architect MCP validation before/after code changes
- Tracks progress through devInfo updates
- Documents implementation with comments and file references

**Key Capabilities:**
- 📋 **Task Selection**: Browse and select tasks from your backlog
- 🔄 **Status Management**: Automatic status transitions through workflow
- 🏗️ **Architecture Compliance**: Mandatory pattern validation (architect MCP)
- 📊 **Progress Tracking**: devInfo updates with worktrees, tests, sessions
- 💬 **Documentation**: Task comments with file references and progress notes

#### `/agiflow-work` - Work Unit Execution

Execute complete features/epics by implementing all tasks in a work unit sequentially.

**What it does:**
- Coordinates multiple related tasks as a cohesive feature
- Manages work unit lifecycle (planning → in_progress → completed)
- Tracks overall feature progress and test results
- Handles task dependencies and execution order
- Creates comprehensive feature documentation

**Key Capabilities:**
- 🎯 **Feature Coordination**: Execute 3-10 related tasks as one feature
- 📈 **Progress Dashboard**: Track completed vs. total tasks in real-time
- 🧪 **Integrated Testing**: Run tests between tasks to catch regressions
- 📝 **Session Management**: Track execution plan, commits, and timing
- 🚧 **Blocker Handling**: Document and manage blockers at feature level

#### `/agiflow-complete` - Task Completion Validation

Mark tasks as complete with automated validation and quality checks.

**What it does:**
- Verifies all acceptance criteria are met
- Runs automated quality checks (typecheck, tests, formatting)
- Creates completion summary with file references
- Updates task status and metadata
- Ensures proper task workflow (Review → Done)

**Key Capabilities:**
- ✓ **Acceptance Criteria Verification**: Ensures all criteria are checked before completion
- 🧪 **Automated Validation**: Runs typecheck, tests, and code formatting checks
- 📝 **Completion Documentation**: Creates detailed summary with file references
- 🔄 **Workflow Enforcement**: Validates proper status transitions
- 📊 **Metadata Tracking**: Records test results, coverage, and deployment notes

## Installation

### Prerequisites

- Claude Code installed and running
- Agiflow MCP server configured in your project's `.mcp.json`

### Install from Marketplace

1. Add the Agiflow marketplace:
```bash
/plugin marketplace add https://github.com/agiflow/claude-code-marketplace
```

2. Install the plugin:
```bash
/plugin install agiflow@agiflow-marketplace
```

3. Restart Claude Code to activate the plugin

### Install from Local Directory (Development)

1. Clone or download this repository

2. Add the marketplace:
```bash
/plugin marketplace add ./path/to/agiflow-marketplace
```

3. Install the plugin:
```bash
/plugin install agiflow@agiflow-marketplace
```

4. Restart Claude Code

## Usage

### Planning a New Feature

```bash
/agiflow-plan

# Claude will ask: "What would you like to plan?"
# Example response: "Add shopping cart functionality with checkout"
```

**What happens:**
1. Claude analyzes your project using MCP tools
2. Breaks down the request into focused tasks
3. Assigns each task to the appropriate agent
4. Groups related tasks into work units
5. Creates all tasks and work units in Agiflow
6. Provides a summary of the plan

### Example Workflows

#### Simple Feature (Work Unit)
```
Request: "Add user profile editing"

Result:
- Work Unit: "User Profile Editing Feature"
  - Task 1: Implement update-profile API endpoint (nodejs-hono-api-developer)
  - Task 2: Create profile form UI component (spa-frontend-developer)
  - Task 3: Add profile validation logic (nodejs-hono-api-developer)
  - Task 4: Add profile update tests (nodejs-hono-api-developer)
```

#### Large Feature (Multiple Work Units)
```
Request: "Build authentication system"

Result:
- Work Unit 1: "Email/Password Authentication"
  - 5 tasks for signup, login, database schema
- Work Unit 2: "Social Login Integration"
  - 3 tasks for OAuth providers
- Work Unit 3: "Password Reset Flow"
  - 2 tasks for reset API and UI
- Standalone: Integration tests task
```

#### Bug Fixes (Standalone Tasks)
```
Request: "Fix header typo and cart calculation bug"

Result:
- Standalone Task 1: Fix typo in header (spa-frontend-developer)
- Standalone Task 2: Fix cart total calculation (nodejs-hono-api-developer)
```

## Agent Assignment

The plugin uses intelligent agent assignment when creating tasks. **Agents are dynamically fetched from your Agiflow project** via the MCP `list-members` tool.

### How It Works

1. When planning with `/agiflow-plan`, the plugin calls `list-members` to get your project's configured agents
2. For each task, it analyzes the work type and automatically assigns the most appropriate agent
3. Agent configuration is managed in your Agiflow project dashboard at [https://agiflow.io](https://agiflow.io)

### Example Agents

Your Agiflow project might include agents like:

| Agent Example | Typical Responsibilities |
|---------------|--------------------------|
| `nodejs-hono-api-developer` | Hono.js API development, endpoints, OpenAPI specs |
| `nodejs-library-architect` | Node.js library development, shared packages, utilities |
| `senior-architect-overseer` | Architectural decisions, design patterns, code reviews |
| `spa-frontend-developer` | React SPA development, frontend features, UI implementation |
| `frontend-design-system-architect` | Design system work, component library, theming |

**Note:** Agent names and roles are fully customizable in your Agiflow project settings. The plugin adapts to your configured team structure.

## Best Practices

### Task Sizing
- ✅ Small, focused tasks (15min - 2 hours)
- ✅ Clear, action-oriented titles ("Implement", "Fix", "Refactor")
- ✅ Concrete acceptance criteria (2-5 per task)
- ❌ Large, vague tasks ("Build authentication")

### Work Unit Organization
- ✅ Group 3-8 related tasks
- ✅ Completable in one session (2-4 hours)
- ✅ Cohesive feature delivery
- ❌ Too small (1-2 tasks)
- ❌ Too large (>8 tasks)
- ❌ Unrelated task groupings

### Quality Checks
- Every task must have an agent assignee
- Acceptance criteria must be concrete and verifiable
- Task descriptions must provide sufficient context
- Check for duplicate tasks before creating
- Split large features into multiple work units

## Configuration

### MCP Server Setup

Get your MCP configuration from Agiflow (recommended):

1. **Sign up at [https://agiflow.io](https://agiflow.io)**
2. **Create a new project** in the Agiflow dashboard
3. **Follow the setup wizard** to generate your MCP configuration
   - The wizard provides ready-to-use `.mcp.json` configuration
   - Includes project-specific endpoint and API key
   - Agiflow provides hosted HTTP MCP servers

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

**Alternative - Interactive Authentication:**

Run without configuration for guided setup:
```bash
npx @agiflowai/powertool mcp-serve
```

Then add to `.mcp.json`:
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

### Agent Configuration

Agents are configured in your Agiflow project:
1. Go to [https://agiflow.io](https://agiflow.io)
2. Navigate to **Settings → Team Members**
3. Add or edit agent members with their roles and expertise

The plugin automatically uses your configured agents via the `list-members` MCP tool.

### Reference Documentation

The plugin includes comprehensive documentation at `skills/project-management/agiflow-agents.md` (726 lines) covering:
- All 25+ available MCP tools
- Agent assignment strategies and decision trees
- Task workflow and status transitions
- devInfo tracking patterns
- Work unit management best practices

## Troubleshooting

### Plugin not showing in `/help`
- Restart Claude Code after installation
- Verify installation with `/plugin`
- Check that marketplace is properly added

### MCP tools not available
- Verify `.mcp.json` configuration with `@agiflowai/powertool`
- Run `npx @agiflowai/powertool mcp-serve` to authenticate
- Check Agiflow connection at [https://agiflow.io](https://agiflow.io)
- Ensure MCP server is running

### Tasks not being created
- Verify Agiflow project exists at [https://agiflow.io](https://agiflow.io)
- Check API endpoint and key are correct
- Ensure agents are configured in project settings
- Review Claude Code logs for errors

### Agents not available for assignment
- Go to [https://agiflow.io](https://agiflow.io) → Settings → Team Members
- Add agent members to your project
- Restart Claude Code to refresh agent list
- Verify `list-members` MCP tool is working

## Support

- **Documentation**: https://docs.agiflow.io
- **Issues**: https://github.com/agiflow/claude-code-plugin/issues
- **Agiflow Platform**: https://agiflow.io

## Version History

### 1.0.0 (2025-01-30)
- Initial release with 4 slash commands:
  - `/agiflow-plan` - Intelligent project planning
  - `/agiflow-task` - Single task implementation with tracking
  - `/agiflow-work` - Work unit (feature/epic) execution
  - `/agiflow-complete` - Task completion validation
- Dynamic agent assignment via `list-members` MCP tool
- Automatic work unit organization (3-8 tasks per unit)
- Integration with Architect MCP for design pattern compliance
- Proactive project management skill
- Comprehensive MCP tools reference (25+ tools, 726 lines)
- Support for Agiflow hosted HTTP MCP servers

## License

Sustainable Use License - See [LICENSE.md](../../../LICENSE.md) for details

This project is licensed under a modified [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/):

- ✅ **Free for small businesses** - Companies with fewer than 20 employees
- ✅ **Free for personal use** - Individuals and non-profit organizations
- ✅ **Free for evaluation** - Testing the software for potential commercial use
- 💼 **Commercial license required** - Companies with 20+ employees

For commercial licensing inquiries, please visit: [https://agiflow.io](https://agiflow.io)

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.
