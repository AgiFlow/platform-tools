---
name: agiflow-plan
description: Plan project backlogs using MCP tools to convert requirements to tasks and work units.
category: Project Management
tags: [agiflow, task, planning]
---

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep task scope tightly focused on delivering user-visible progress.
- Refer to `@../skills/project-management/agiflow-agents.md` for MCP tool conventions and agent assignment guidelines.
- Identify any vague or ambiguous details and ask the necessary follow-up questions before creating tasks.
- **Use work units** when related tasks form a cohesive feature (2-3 story points / can be completed in one session).

**Steps**

## 1. Understand Context
1. Use `get-project` MCP tool to understand current project context and existing work.
2. Use `list-members` MCP tool to get available agent members and their capabilities.
3. Use `list-tasks` MCP tool with relevant filters (status, assignee, search) to check for similar or duplicate tasks.
4. Use `list-work-units` MCP tool to check for existing work units and understand feature organization.

## 2. Break Down Into Tasks FIRST

Break down the requested work into small, focused tasks that deliver incremental value (prefer 5-15 tasks max per plan).

**Guidelines:**
- Tasks should be completable in 15min - 2 hours each
- Clear, action-oriented titles (verb-led: "Implement", "Fix", "Refactor", "Update")
- Detailed descriptions with context and requirements
- Concrete acceptance criteria (2-5 criteria per task)
- Order tasks by dependencies

## 3. Assign Agents to Tasks (Optional)

If agent members are available in your project, you can assign tasks to specific agents:

1. Use `list-members` MCP tool to get available agent members and their capabilities.
2. For each task, determine the most appropriate agent member based on:
   - The member's role and expertise (from `list-members` response)
   - The task's work type and requirements
   - The member's availability and current workload

If no agent members are configured, tasks can be created without assignees and assigned later.

## 4. Create Tasks

Use `create-task` MCP tool for each task with:
- **title**: Clear, action-oriented title
- **description**: Detailed description with context and requirements
- **assignee**: Appropriate agent member (optional - can be null if no agents available)
- **status**: "Todo" (tasks start in backlog)
- **priority**: "low" | "medium" | "high" based on impact
- **acceptanceCriteria**: Array of concrete, verifiable completion conditions (2-5 criteria per task)
- **dueDate**: ISO 8601 format if time-sensitive (optional)

**DO NOT set workUnitId yet** - tasks are created standalone first.
**Create each task with the right order** - Create task which is the dependency and prerequisite for other tasks first.

## 5. Identify Related Task Groups

After creating all tasks, analyze which tasks are related and could be grouped:

### ✅ GROUP INTO WORK UNIT when:
- 3-8 related tasks that deliver a single cohesive feature
- Tasks can be completed in ONE agent session run (2-4 hours max)
- Tasks have clear dependencies and should be executed together
- Feature has a clear deliverable outcome

**Examples of good work units:**
- "Shopping Cart Feature" (add to cart API + UI + tests = 5 tasks, ~3 hours)
- "Password Reset Flow" (reset API + email template + UI + tests = 4 tasks, ~2.5 hours)
- "Stripe Payment Integration" (setup + checkout API + webhooks + UI = 6 tasks, ~4 hours)

### ❌ DO NOT CREATE WORK UNIT when:
- Only 1-2 tasks (too small, leave as standalone)
- Unrelated tasks (bugs across different areas)
- Maintenance work (dependency updates, config changes)
- Too many tasks (>8 tasks = too complex for one session, split into multiple work units)

**Examples of what NOT to group:**
- "Fix typo in header" (1 task - too small)
- "Update dependencies" (maintenance - not a feature)
- "Fix 3 unrelated bugs" (not cohesive)
- "Complete user authentication system" (15 tasks - too large, split into multiple work units)

## 6. Create Work Units for Task Groups

For each identified task group:

1. Use `create-work-unit` MCP tool with:
   - **title**: Clear feature name (e.g., "Shopping Cart Feature")
   - **type**: "feature" (for most work), "epic" (for organizing multiple features), "initiative" (for business goals)
   - **description**: What this work unit delivers and why it matters
   - **status**: "planning" (work units start in planning)
   - **priority**: "low" | "medium" | "high" based on business impact
   - **estimatedEffort**: Estimated hours for one session (2-4 hours typical)
   - **targetDate**: ISO 8601 format if time-sensitive (optional)
   - **devInfo**: Optional execution plan (e.g., `{ executionPlan: "Backend API → Frontend UI → Tests" }`)
   - **taskIds**: List of task's id belong to work unit.

2. Note the work unit ID

** Note **: Leave unrelated or standalone tasks without a workUnitId (they remain as standalone tasks).

## 7. Verify Plan

1. Use `list-work-units` to verify work units were created correctly
2. Use `list-tasks` with `workUnitId` filter to verify tasks are properly associated
3. Review task assignments - assign agents if available (optional)
4. Check for completeness - all requested work is captured
5. Verify work units are not too complex (3-8 tasks each, completable in one session)

**Validation**
- Acceptance criteria MUST be concrete and verifiable
- Task titles MUST be action-oriented
- Task descriptions MUST provide sufficient context
- Dependencies MUST be clearly understood (document in description if needed)
- Tasks are created FIRST, then grouped into work units
- Work units MUST only group 3-8 related tasks
- Work units MUST be completable in ONE agent session run (2-4 hours max)
- Leave standalone tasks (1-2 tasks) without work units
- Split large features (>8 tasks) into multiple work units
- Agent assignment is optional (can be assigned later if agents become available)

**Reference**
- Use `list-members` to get available agent members and their capabilities for task assignment
- Use `list-work-units` with filters to check existing work units: `status: "planning"`, `type: "feature"`
- Use `list-tasks` with filters to check existing work: `status: "Todo"`, `assignee: "<agent-id>"`, `workUnitId: "wu_123"`
- Search existing tasks: `search: "authentication"` to avoid duplicates
- Verify project info: `get-project` to understand organization and project metadata
- Review agent capabilities in `@../skills/project-management/agiflow-agents.md` for correct assignment
- Review work unit patterns in `@../skills/project-management/agiflow-agents.md` for organization strategies

**Common Mistakes to Avoid**
- ❌ Vague acceptance criteria ("Make it work", "Fix bugs")
- ❌ Tasks too large (break into smaller, focused tasks)
- ❌ Missing context in descriptions
- ❌ Wrong agent assignment (review agent capabilities first if assigning)
- ❌ Not checking for duplicate tasks or work units
- ❌ Creating too many tasks at once (overwhelming backlog)
- ❌ Creating work units BEFORE tasks (always create tasks first)
- ❌ Setting workUnitId when creating tasks (associate AFTER work unit is created)
- ❌ Creating work units for 1-2 tasks (too small, leave as standalone)
- ❌ Creating work units with >8 tasks (too complex for one session, split it)
- ❌ Grouping unrelated tasks into work units (must be cohesive feature)
- ❌ Work units too large to complete in one agent session run (>4 hours)

**Examples**

> **Note**: The examples below use sample agent names for illustration. Agent assignment is optional - if you have agents configured, use `list-members` MCP tool to get the actual available agents and their capabilities. If no agents are available, tasks can be created without assignees.

### Example 1: Feature with Work Unit (Task-First Workflow)

**User Request**: "Add shopping cart functionality"

**Analysis**: This is a cohesive feature with multiple related tasks (~5 tasks, ~3 hours total).

**Workflow**:

**Step 1: Create tasks FIRST (no workUnitId)**
1. Create task: "Implement add-to-cart API endpoint" (nodejs-hono-api-developer)
2. Create task: "Implement remove-from-cart API endpoint" (nodejs-hono-api-developer)
3. Create task: "Implement get-cart API endpoint" (nodejs-hono-api-developer)
4. Create task: "Create cart UI component with item list" (spa-frontend-developer)
5. Create task: "Add cart integration tests" (nodejs-hono-api-developer)

**Step 2: Identify related task group**
- These 5 tasks are related and deliver "Shopping Cart Feature"
- Can be completed in one agent session (~3 hours)
- 3-8 tasks ✅ Good size for work unit

**Step 3: Create work unit**
- Create work unit: "Shopping Cart Feature"
  - type: "feature"
  - status: "planning"
  - priority: "high"
  - estimatedEffort: 3 (hours)
  - devInfo: `{ executionPlan: "Backend API → Frontend UI → Tests" }`

**Step 4: Associate tasks with work unit**
- Update each task (task IDs from step 1) to set workUnitId = work unit ID

### Example 2: Standalone Tasks (No Work Unit)

**User Request**: "Fix typo in header and update README"

**Analysis**: Two unrelated, simple tasks. Too small for work unit.

**Workflow**:

**Step 1: Create tasks FIRST**
1. Create task: "Fix typo in header component" (spa-frontend-developer)
2. Create task: "Update README with new setup instructions" (senior-architect-overseer)

**Step 2: Identify related task group**
- Only 2 tasks, unrelated
- 1-2 tasks ❌ Too small for work unit

**Step 3: Leave as standalone tasks**
- No work unit created
- Tasks remain with workUnitId = null

### Example 3: Large Feature Split into Multiple Work Units

**User Request**: "Build complete user authentication system with social login"

**Analysis**: Large request (15+ tasks). Split into multiple work units that can each be done in one session.

**Workflow**:

**Step 1: Create ALL tasks FIRST (no workUnitId)**
1. Create task: "Create user database schema" (nodejs-hono-api-developer)
2. Create task: "Implement signup API endpoint" (nodejs-hono-api-developer)
3. Create task: "Implement login API endpoint" (nodejs-hono-api-developer)
4. Create task: "Create signup UI form" (spa-frontend-developer)
5. Create task: "Create login UI form" (spa-frontend-developer)
6. Create task: "Integrate Google OAuth" (nodejs-hono-api-developer)
7. Create task: "Integrate GitHub OAuth" (nodejs-hono-api-developer)
8. Create task: "Create social login UI buttons" (spa-frontend-developer)
9. Create task: "Implement password reset API" (nodejs-hono-api-developer)
10. Create task: "Create password reset UI flow" (spa-frontend-developer)
11. Create task: "Add authentication tests" (nodejs-hono-api-developer)

**Step 2: Identify related task groups**
- Group 1: Tasks 1-5 = "Email/Password Authentication" (~2.5 hours)
- Group 2: Tasks 6-8 = "Social Login Integration" (~2 hours)
- Group 3: Tasks 9-10 = "Password Reset Flow" (~1.5 hours)
- Task 11 = Standalone test task

**Step 3: Create work units for each group**
1. Create work unit: "Email/Password Authentication" (estimatedEffort: 2.5)
2. Create work unit: "Social Login Integration" (estimatedEffort: 2)
3. Create work unit: "Password Reset Flow" (estimatedEffort: 1.5)

**Step 4: Associate tasks with work units**
- Update tasks 1-5 with workUnitId = "Email/Password Authentication" ID
- Update tasks 6-8 with workUnitId = "Social Login Integration" ID
- Update tasks 9-10 with workUnitId = "Password Reset Flow" ID
- Leave task 11 as standalone (no workUnitId)

### Example 4: Mixed Plan (Some Work Units, Some Standalone)

**User Request**: "Add payment integration and fix 2 urgent bugs"

**Analysis**: Payment is a cohesive feature. Bugs are standalone tasks.

**Workflow**:

**Step 1: Create ALL tasks FIRST**
1. Create task: "Setup Stripe SDK and config" (nodejs-hono-api-developer)
2. Create task: "Create checkout API endpoint" (nodejs-hono-api-developer)
3. Create task: "Add payment webhook handler" (nodejs-hono-api-developer)
4. Create task: "Create payment UI component" (spa-frontend-developer)
5. Create task: "Add payment integration tests" (nodejs-hono-api-developer)
6. Create task: "Fix login redirect bug" (spa-frontend-developer)
7. Create task: "Fix cart total calculation error" (nodejs-hono-api-developer)

**Step 2: Identify related task groups**
- Group 1: Tasks 1-5 = "Stripe Payment Integration" (~3 hours)
- Tasks 6-7 = Unrelated bug fixes (standalone)

**Step 3: Create work unit for payment feature**
- Create work unit: "Stripe Payment Integration" (estimatedEffort: 3)

**Step 4: Associate payment tasks with work unit**
- Update tasks 1-5 with workUnitId = "Stripe Payment Integration" ID
- Leave tasks 6-7 as standalone (no workUnitId)
