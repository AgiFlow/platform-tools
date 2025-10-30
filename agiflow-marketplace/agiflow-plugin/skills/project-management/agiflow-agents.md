# AgiSpec Instructions

Instructions for AI coding assistants using AgiSpec for task-driven development with project management integration.

## Slash Commands (Recommended Workflow)

Use these slash commands for guided workflows:

- **`/agiflow-plan`** - Create a project plan with tasks (checks duplicates, assigns agents, validates criteria)
- **`/agiflow-task`** - Implement task sequentially (tracks progress, validates patterns, updates devInfo)
- **`/agiflow-work`** - Implement tasks sequentially using work unit (tracks progress, validates patterns, updates devInfo)
- **`/agiflow-complete`** - Mark task complete (validates criteria, runs tests, updates status)

These commands follow the same structured approach as OpenSpec (`/openspec-proposal`, `/openspec-apply`, `/openspec-archive`).

## TL;DR Quick Checklist

- **Planning**: Use `/agiflow-plan` or `create-task` MCP tool - **MUST assign to an agent member**
- **Working**: Use `/agiflow-work` or manually `get-task` → `move-task` → implement → `update-task`
- **Completing**: Use `/agiflow-complete` or manually verify criteria → validate → `move-task` to "Done"
- **Tracking**: Use `devInfo` field for worktrees, containers, test results, session IDs
- **Commenting**: Use `create-task-comment` MCP tool for progress updates and discussions

## Three-Stage Workflow

### Stage 1: Planning & Task Creation

Create tasks when you need to:
- Implement features or functionality
- Fix bugs or issues
- Refactor code or architecture
- Update dependencies or configurations
- Write tests or documentation

Triggers (examples):
- "Create a task for..."
- "I need to add..."
- "Help me plan..."
- "Let's track this work..."

**Workflow**
1. Review current project with `get-project` to understand context
2. List existing tasks with `list-tasks` to avoid duplicates
3. Create task with `create-task` - **CRITICAL: Assign to appropriate agent member**
4. Add acceptance criteria for clear completion definition
5. Set priority (low/medium/high) and due date if applicable

### Stage 2: Implementation & Tracking

Track these steps throughout implementation:
1. **Get task details** - Use `get-task` to understand requirements
2. **Update status to "In Progress"** - Use `update-task` or `move-task`
3. **Track development info** - Update `devInfo` with:
   - Worktrees created for the task
   - Docker containers running
   - Test results and metadata
   - Current agent session ID
4. **Add comments** - Use `create-task-comment` for progress updates
5. **Check acceptance criteria** - Mark items as checked when completed
6. **Update to "Review"** - Move task when ready for review
7. **Complete task** - Move to "Done" when all criteria met

### Stage 3: Review & Completion

After implementation:
- Mark all acceptance criteria as checked
- Add final comment with summary
- Update task status to "Done"
- Archive or reference in related documentation

## Slash Command Workflows

### Using `/agiflow-plan`

**When to use:** Creating a new project plan or breaking down a feature into tasks.

**Workflow:**
1. Invoke `/agiflow-plan` with description of work to be done
2. AI will:
   - Check current project context with `get-project`
   - Search for duplicate tasks with `list-tasks`
   - Break work into 5-15 focused tasks
   - Assign appropriate agent to each task
   - Create tasks with acceptance criteria
   - Validate all tasks created successfully

**Example:**
```
User: /agiflow-plan Implement user authentication with JWT
AI: Creates tasks:
  - Task 1: "Implement JWT service" → nodejs-hono-api-developer
  - Task 2: "Create authentication endpoints" → nodejs-hono-api-developer
  - Task 3: "Add auth middleware" → nodejs-hono-api-developer
  - Task 4: "Write unit tests" → nodejs-hono-api-developer
  - Task 5: "Update API documentation" → senior-architect-overseer
```

### Using `/agiflow-task`

**When to use:** Implementing a specific task from the backlog.

**Workflow:**
1. Invoke `/agiflow-task` (optionally with task ID)
2. AI will:
   - List available Todo tasks
   - Get full task details with `get-task`
   - Move task to "In Progress" with `move-task`
   - **MANDATORY**: Run `architect` MCP `get-file-design-pattern` before editing
   - Implement each acceptance criterion
   - **MANDATORY**: Run `architect` MCP `review-code-change` after editing
   - Update `devInfo` with progress tracking
   - Add comments documenting progress
   - Mark acceptance criteria as checked
   - Move task to "Review" when complete

**Example:**
```
User: /agiflow-task
AI:
  1. Lists tasks with status "Todo"
  2. User selects task or AI picks highest priority
  3. Gets task details
  4. Moves to "In Progress"
  5. Reads design patterns for files to be edited
  6. Implements functionality
  7. Validates code changes
  8. Updates devInfo with worktrees, tests, etc.
  9. Moves to "Review"
```

### Using `/agiflow-work`

**When to use:** Executing a complete work unit (feature/epic) with multiple tasks.

**Workflow:**
1. Invoke `/agiflow-work` with work unit slug/ID (or interactively select)
2. AI will:
   - Get work unit with all associated tasks
   - Review feature scope and task dependencies
   - Set work unit status to "in_progress"
   - Create TODO list of tasks in execution order
   - For each task:
     - Move to "In Progress"
     - **MANDATORY**: Run `architect` MCP before/after editing
     - Implement following acceptance criteria
     - Update devInfo with progress
     - Mark acceptance criteria as checked
     - Move to "Done"
   - Update work unit progress in devInfo
   - Run tests between tasks
   - Handle blockers and scope changes
   - Complete work unit when all tasks done

**Example:**
```
User: /agiflow-work shopping-cart-feature
AI:
  1. Gets work unit "Shopping Cart Feature" (6 tasks)
  2. Reviews scope: add/remove/get cart + UI + tests
  3. Sets status to "in_progress"
  4. Creates TODO list:
     - Implement add-to-cart API
     - Implement remove-from-cart API
     - Implement get-cart API
     - Create cart UI component
     - Add checkout flow
     - Add cart tests
  5. Executes each task sequentially
  6. Updates work unit devInfo with progress
  7. Completes work unit with final summary
```

### Using `/agiflow-complete`

**When to use:** Marking a task as complete after review/validation.

**Workflow:**
1. Invoke `/agiflow-complete` with task ID
2. AI will:
   - Get task details with `get-task`
   - Verify all acceptance criteria checked
   - Verify task status is "Review"
   - Run validations: typecheck, test, fixcode
   - Add completion summary comment
   - Move task to "Done" with `move-task`
   - Update final `devInfo` with completion metadata

**Example:**
```
User: /agiflow-complete task-123
AI:
  1. Gets task details
  2. Verifies all criteria checked ✅
  3. Runs pnpm nx typecheck project ✅
  4. Runs pnpm nx test project ✅
  5. Runs pnpm nx fixcode project ✅
  6. Adds comment: "Completed JWT service implementation. Files changed: backend/apis/auth/src/services/JwtService.ts:15..."
  7. Moves task to "Done"
```

## Available MCP Tools

### Project Management

#### Get Project Information
```bash
Tool: get-project
Description: Retrieve current project details including name, description, organization, and metadata
Returns: Project object with id, name, description, color, icon, isArchived, organizationId
```

#### Update Project
```bash
Tool: update-project
Description: Update project metadata
Parameters:
  - name: Project name
  - description: Project description (optional)
  - color: Project color (optional)
  - icon: Project icon (optional)
  - isArchived: Archive status (optional)
  - organizationId: Organization ID (optional)
```

### Task Management

#### Create Task (CRITICAL: Agent Assignment Required)
```bash
Tool: create-task
Description: Create a new task inside the project

**CRITICAL**: You MUST select an agent member as the assignee for this task.

Available agent members (REQUIRED - choose one):
- nodejs-hono-api-developer (agent) - For Hono.js API development
- nodejs-library-architect (agent) - For Node.js library development
- senior-architect-overseer (agent) - For architectural guidance
- spa-frontend-developer (agent) - For SPA frontend development
- frontend-design-system-architect (agent) - For design system work

Parameters:
  - title: Task title (REQUIRED)
  - status: Status name - "Todo", "In Progress", "Review", or "Done" (REQUIRED)
  - assignee: Agent member name from the list above (REQUIRED)
  - description: Task description (optional)
  - priority: Priority level - "low", "medium", or "high" (default: "medium")
  - tags: Comma-separated list of tags (optional)
  - dueDate: Due date in ISO 8601 format (optional)
  - position: Ordering position within status column (default: 0)
  - acceptanceCriteria: Array of objects with { checked: boolean, text: string }
  - workUnitId: Work unit ID to associate this task with (optional)

Example:
{
  "title": "Implement user authentication API",
  "status": "Todo",
  "assignee": "nodejs-hono-api-developer",
  "description": "Create authentication endpoints with JWT",
  "priority": "high",
  "acceptanceCriteria": [
    { "checked": false, "text": "POST /auth/login endpoint" },
    { "checked": false, "text": "POST /auth/register endpoint" },
    { "checked": false, "text": "JWT token generation" },
    { "checked": false, "text": "Unit tests with 80% coverage" }
  ]
}
```

#### List Tasks
```bash
Tool: list-tasks
Description: List tasks with filtering and pagination

Available statuses for filtering: Todo, In Progress, Review, Done
Available agent members for filtering:
- nodejs-hono-api-developer
- nodejs-library-architect
- senior-architect-overseer
- spa-frontend-developer
- frontend-design-system-architect

Parameters:
  - status: Filter by status name (optional)
  - assignee: Filter by agent member name (optional)
  - priority: Filter by priority - "low", "medium", or "high" (optional)
  - workUnitId: Filter by work unit ID (optional)
  - search: Full-text search over title/description (optional)
  - sort: Sort field - "createdAt", "updatedAt", "position", "dueDate", "priority" (default: "createdAt")
  - order: Sort order - "asc" or "desc" (default: "desc")
  - limit: Number of items to return (default: 10)
  - offset: Number of items to skip (default: 0)
```

#### Get Task
```bash
Tool: get-task
Description: Retrieve a task by ID
Parameters:
  - id: Task ID (REQUIRED)
```

#### Update Task
```bash
Tool: update-task
Description: Update an existing task

Available statuses: Todo, In Progress, Review, Done
Available agent members (optional for updates):
- nodejs-hono-api-developer
- nodejs-library-architect
- senior-architect-overseer
- spa-frontend-developer
- frontend-design-system-architect

Parameters:
  - id: Task ID (REQUIRED)
  - title: Task title (optional)
  - status: Status name (optional)
  - assignee: Agent member name (optional)
  - description: Task description (optional)
  - priority: Priority level (optional)
  - tags: Comma-separated list of tags (optional)
  - dueDate: Due date in ISO 8601 format (optional)
  - position: Ordering position (optional)
  - workUnitId: Work unit ID to associate with (optional)
  - acceptanceCriteria: Array of objects with { checked: boolean, text: string } (optional)
  - devInfo: Development information object (optional)
    - worktrees: Array of worktree objects { name, branch, path, createdAt }
    - dockerContainer: Docker container ID
    - currentSession: Currently active agent session ID
    - agentSessions: List of agent session IDs
    - lastAgentType: Last agent type that worked on this task
    - developmentNotes: Notes about development progress
    - testResults: Test results or other metadata
```

#### Move Task
```bash
Tool: move-task
Description: Move task to a different status/position
Parameters:
  - id: Task ID (REQUIRED)
  - column: Status name - "Todo", "In Progress", "Review", or "Done" (REQUIRED)
  - position: Position within the column (REQUIRED)
```

#### Delete Task
```bash
Tool: delete-task
Description: Delete a task
Parameters:
  - id: Task ID (REQUIRED)
```

#### Reorder Tasks
```bash
Tool: reorder-tasks
Description: Reorder tasks inside a status column
Parameters:
  - status: Status/column name - "Todo", "In Progress", "Review", or "Done" (REQUIRED)
  - taskIds: Array of task IDs in new order (REQUIRED, min 1 item)
```

### Task Comments

#### Create Task Comment
```bash
Tool: create-task-comment
Description: Create a new comment on a task
Parameters:
  - taskId: Task ID this comment belongs to (REQUIRED)
  - content: Comment content (REQUIRED)
```

#### List Task Comments
```bash
Tool: list-task-comments
Description: List comments for a specific task
Parameters:
  - taskId: Task ID (REQUIRED)
  - sort: Sort field - "createdAt" or "updatedAt" (default: "createdAt")
  - order: Sort order - "asc" or "desc" (default: "desc")
  - limit: Number of comments to return (default: 10)
  - offset: Number of comments to skip (default: 0)
```

#### Get Task Comment
```bash
Tool: get-task-comment
Description: Retrieve a task comment by ID
Parameters:
  - id: Task comment ID (REQUIRED)
```

#### Update Task Comment
```bash
Tool: update-task-comment
Description: Update an existing task comment (only by original author)
Parameters:
  - id: Task comment ID (REQUIRED)
  - content: Updated comment content (REQUIRED)
```

#### Delete Task Comment
```bash
Tool: delete-task-comment
Description: Delete a task comment (only by original author)
Parameters:
  - id: Task comment ID (REQUIRED)
```

## Work Unit Management

Work Units provide a coordination layer between Projects and Tasks, allowing you to organize related tasks into features, epics, or initiatives. Work units are optional and support hierarchical organization.

### Available Statuses
- **planning**: Work unit is being planned
- **in_progress**: Work unit is actively being worked on
- **blocked**: Work unit is blocked
- **completed**: Work unit is finished
- **cancelled**: Work unit was cancelled

### Create Work Unit
```bash
Tool: create-work-unit
Description: Create a new work unit to group related tasks
Parameters:
  - title: Work unit title (REQUIRED)
  - type: Work unit type - "epic", "feature", or "initiative" (default: "feature")
  - description: Work unit description (optional)
  - status: Status - "planning", "in_progress", "blocked", "completed", or "cancelled" (default: "planning")
  - priority: Priority - "low", "medium", or "high" (default: "medium")
  - parentWorkUnitId: Parent work unit ID for nested organization (optional)
  - ownerId: Owner member ID (optional)
  - estimatedEffort: Estimated effort in hours (optional)
  - startDate: Start date (ISO 8601) (optional)
  - targetDate: Target completion date (ISO 8601) (optional)
  - devInfo: Development metadata (optional)
```

### List Work Units
```bash
Tool: list-work-units
Description: List work units within a project
Parameters:
  - status: Filter by status (optional)
  - type: Filter by type - "epic", "feature", or "initiative" (optional)
  - priority: Filter by priority - "low", "medium", or "high" (optional)
  - ownerId: Filter by owner member ID (optional)
  - parentWorkUnitId: Filter by parent work unit ID (optional)
  - search: Full-text search over title/description (optional)
  - sort: Sort field - "createdAt", "updatedAt", "startDate", "targetDate", "priority" (default: "createdAt")
  - order: Sort order - "asc" or "desc" (default: "desc")
  - limit: Number of items to return (default: 10)
  - offset: Number of items to skip (default: 0)
```

### Get Work Unit
```bash
Tool: get-work-unit
Description: Retrieve a work unit by ID or slug (includes all associated tasks)
Parameters:
  - id: Work unit ID or slug (REQUIRED)

Returns: Work unit object with embedded tasks array
```

### Update Work Unit
```bash
Tool: update-work-unit
Description: Update an existing work unit
Parameters:
  - id: Work unit ID (REQUIRED)
  - title: Work unit title (optional)
  - type: Work unit type - "epic", "feature", or "initiative" (optional)
  - description: Work unit description (optional)
  - status: Status (optional)
  - priority: Priority (optional)
  - parentWorkUnitId: Parent work unit ID (optional)
  - ownerId: Owner member ID (optional)
  - estimatedEffort: Estimated effort in hours (optional)
  - startDate: Start date (ISO 8601) (optional)
  - targetDate: Target completion date (ISO 8601) (optional)
  - completedAt: Completion timestamp (ISO 8601) (optional)
  - devInfo: Development metadata (optional)
```

### Delete Work Unit
```bash
Tool: delete-work-unit
Description: Delete a work unit
Parameters:
  - id: Work unit ID (REQUIRED)
```

### Associate Tasks with Work Unit

When creating or updating tasks, you can associate them with a work unit:

```bash
# When creating a task
Tool: create-task
Parameters:
  - workUnitId: Work unit ID (optional)
  # ... other task parameters

# When updating a task
Tool: update-task
Parameters:
  - id: Task ID (REQUIRED)
  - workUnitId: Work unit ID (optional)
  # ... other task parameters
```

### Work Unit devInfo Tracking

The `devInfo` field on work units supports comprehensive progress tracking:

```typescript
{
  executionPlan: "Backend → Frontend → Tests → Docs",
  sessionId: "session_abc123",
  startedAt: "2025-01-15T10:00:00Z",

  progress: {
    completedTasks: 5,
    totalTasks: 8,
    percentage: 62,
    lastTaskCompleted: "Add cart API routes",
    currentTask: "Implement cart UI component",
    estimatedTimeRemaining: "45 minutes"
  },

  testResults: {
    unitTests: { passed: 42, failed: 0, coverage: "87%" },
    integrationTests: { passed: 8, failed: 0 },
    e2eTests: { passed: 3, failed: 0 }
  },

  filesChanged: [
    "backend/apis/agiflow-api/src/routes/cart/handlers.ts",
    "backend/apis/agiflow-api/src/repos/CartRepo.ts",
    "apps/agiflow-app/src/routes/dashboard/cart/index.tsx"
  ],

  commits: [
    "abc123: Add cart database schema",
    "def456: Implement cart repository",
    "ghi789: Add cart API endpoints"
  ],

  blockers: [],

  notes: "Cart discount logic needs product owner clarification"
}
```

### Work Unit Best Practices

1. **Feature Type for Most Work**: Use "feature" type for most work units (single cohesive capability)
2. **Epic for Large Initiatives**: Use "epic" type for large initiatives with multiple child features
3. **Limit Nesting**: Keep work unit nesting to 2 levels maximum (epic → feature)
4. **Clear Scope**: Each work unit should have a clear, deliverable outcome
5. **Track Progress**: Update devInfo regularly with progress, test results, and blockers
6. **Organize Tasks**: Group related tasks under work units instead of using loose tags
7. **Session Completion**: Design work units that can be completed in one Claude Code session
8. **Task-First Workflow**: Always create tasks FIRST, then associate with work units

## Agent Assignment Strategy

### When Creating Tasks

**CRITICAL**: Every task MUST be assigned to an appropriate agent member based on the work required.

#### Agent Selection Guide

| Agent Member | Use For | Examples |
|-------------|---------|----------|
| **nodejs-hono-api-developer** | Hono.js API development, endpoint creation, OpenAPI specs | Create REST API, Add authentication endpoints, Implement middleware |
| **nodejs-library-architect** | Node.js library development, shared packages, utilities | Build utility library, Create shared package, Design module architecture |
| **senior-architect-overseer** | Architectural decisions, design patterns, code reviews | Review architecture, Design system structure, Establish coding standards |
| **spa-frontend-developer** | React SPA development, frontend features, UI implementation | Build dashboard page, Create form components, Implement routing |
| **frontend-design-system-architect** | Design system work, component library, theming | Build UI component, Create theme, Design component API |

#### Decision Tree for Agent Assignment

```
What type of work is this task?
├─ Backend API with Hono.js? → nodejs-hono-api-developer
├─ Shared Node.js library/package? → nodejs-library-architect
├─ Architecture/design decisions? → senior-architect-overseer
├─ React SPA feature/page? → spa-frontend-developer
├─ Design system/components? → frontend-design-system-architect
└─ Unclear? → Ask for clarification or use senior-architect-overseer
```

## Task Status Workflow

### Status Columns

1. **Todo** - Task is planned but not started
2. **In Progress** - Actively being worked on
3. **Review** - Implementation complete, needs review
4. **Done** - Completed and verified

### Status Transitions

```
Todo → In Progress: Start working on task
In Progress → Review: Implementation complete, ready for review
Review → Done: Review passed, task complete
Review → In Progress: Changes requested, back to development
In Progress → Todo: Work paused or blocked
```

## Development Info Tracking

The `devInfo` field tracks technical details about implementation:

### Worktrees
Track git worktrees created for the task:
```json
{
  "worktrees": [
    {
      "name": "feature-auth",
      "branch": "feature/auth-implementation",
      "path": "/Users/dev/agiflow-worktrees/feature-auth",
      "createdAt": "2025-10-22T14:30:00Z"
    }
  ]
}
```

### Docker Containers
Track containers used for development:
```json
{
  "dockerContainer": "agiflow-dev-postgres-12345"
}
```

### Agent Sessions
Track which agents worked on the task:
```json
{
  "currentSession": "session-abc123",
  "agentSessions": ["session-abc123", "session-def456"],
  "lastAgentType": "nodejs-hono-api-developer"
}
```

### Test Results
Store test outcomes and metadata:
```json
{
  "testResults": {
    "coverage": 85,
    "passed": 42,
    "failed": 0,
    "lastRun": "2025-10-22T15:45:00Z"
  }
}
```

### Development Notes
Free-form notes about progress:
```json
{
  "developmentNotes": "Implemented JWT authentication. Need to add refresh token logic."
}
```

## Best Practices

### Task Creation
- **Always assign to an agent** - No task should be created without an assignee
- **Write clear titles** - Use action verbs (Implement, Fix, Update, Refactor)
- **Add acceptance criteria** - Define what "done" means
- **Set appropriate priority** - Use high/medium/low based on impact
- **Include descriptions** - Provide context and requirements
- **Tag appropriately** - Use tags for categorization (bug, feature, refactor)

### Task Updates
- **Update status regularly** - Move tasks through the workflow
- **Track devInfo** - Record worktrees, containers, and test results
- **Mark acceptance criteria** - Check off items as completed
- **Add comments** - Document progress and blockers
- **Keep current** - Update descriptions if requirements change

### Task Assignment
- **Choose the right agent** - Match work to agent expertise
- **Reassign if needed** - Update assignee if work scope changes
- **Document handoffs** - Add comment when reassigning

### Comments
- **Be descriptive** - Explain what was done and why
- **Link to code** - Reference files with `file.ts:42` format
- **Note blockers** - Document issues and dependencies
- **Celebrate progress** - Acknowledge milestones

## Quick Reference

### Task Lifecycle
- Create → Todo → In Progress → Review → Done

### Agent Members
- nodejs-hono-api-developer (API development)
- nodejs-library-architect (Library development)
- senior-architect-overseer (Architecture)
- spa-frontend-developer (Frontend SPAs)
- frontend-design-system-architect (Design system)

### Priority Levels
- high: Urgent, blocking work
- medium: Normal priority
- low: Nice to have, future work

### MCP Tool Categories
- **Project**: get-project, update-project
- **Tasks**: create-task, list-tasks, get-task, update-task, delete-task, move-task, reorder-tasks
- **Work Units**: create-work-unit, list-work-units, get-work-unit, update-work-unit, delete-work-unit
- **Comments**: create-task-comment, list-task-comments, get-task-comment, update-task-comment, delete-task-comment

Remember: Tasks are work items. Comments are progress updates. DevInfo is technical tracking. Work Units are feature coordinators. Use all four for complete project management.
