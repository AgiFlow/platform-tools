---
name: agiflow-work
description: Execute a work unit (feature/epic) by implementing all its tasks sequentially using MCP tools.
category: Project Management
tags: [agiflow, work-unit, feature, epic, coordination]
---

**Usage**:
- `/agiflow-work <work-unit-slug-or-id>` - Execute specific work unit
- `/agiflow-work` - List and select from available work units

**Examples**:
- `/agiflow-work DXX-WU-1` (using slug)
- `/agiflow-work 01K8FABMNEJG1XTA9JGHSNFV40` (using ID)
- `/agiflow-work` (interactive selection)

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome within the work unit scope.
- Refer to `@../skills/project-management/agiflow-agents.md` for MCP tool conventions and tracking guidelines.
- A work unit represents a cohesive feature/epic that can be completed in one Claude Code session.

**Steps**
Track these steps as TODOs and complete them one by one.

## 1. Work Unit Selection & Loading

**If work unit slug/id NOT provided:**
1. Use `list-work-units` MCP tool to show available work units:
   - Filter by `status: "planning"` or `status: "in_progress"` for active work
   - Display: slug, title, type, priority, task count, status
2. Ask user to select which work unit to work on.
3. Once user selects, proceed with the selected work unit slug/id.

**If work unit slug/id IS provided:**
4. Use `get-work-unit` MCP tool with the provided slug/id to retrieve:
   - Work unit: title, description, goals, type, priority, status, dates, devInfo
   - Tasks: All tasks associated with this work unit (already included in response)
   - Note: `get-work-unit` returns tasks automatically - no separate `list-tasks` call needed

5. Review the work unit and all its tasks to understand:
   - Complete feature scope and deliverables
   - Task dependencies and execution order
   - Acceptance criteria across all tasks

## 2. Start Work Unit Execution
6. If work unit status is "planning", use `update-work-unit` MCP tool to set status to "in_progress".
7. Create a TODO list of all tasks in execution order (use TodoWrite tool).
8. Document execution plan in work unit via `update-work-unit` devInfo:
   ```typescript
   devInfo: {
     executionPlan: "Backend API → Frontend UI → Tests → Documentation",
     sessionId: "<current-session-id>",
     startedAt: "<timestamp>"
   }
   ```

## 3. Execute Tasks Sequentially
9. For each task in the work unit (in dependency order from the tasks array):
   - Review task details: title, description, acceptance criteria, assignee
   - Use `update-task` MCP tool to set status to "In Progress"
   - **BEFORE editing any code**: Use `architect` MCP `get-file-design-pattern` (MANDATORY)
   - Implement the task following acceptance criteria
   - **AFTER editing code**: Use `architect` MCP `review-code-change` (MANDATORY)
   - Update task `devInfo` with implementation notes:
     ```typescript
     devInfo: {
       filesChanged: ["path/to/file.ts:42"],
       testResults: { passed: true, coverage: "85%" },
       notes: "Implementation notes here"
     }
     ```
   - Mark acceptance criteria as checked via `update-task`
   - Use `update-task` to set status to "Done" when complete
   - Update your TODO list (mark task as completed)

10. Between tasks:
    - Commit changes with meaningful commit messages
    - Run tests to ensure no regressions
    - Update work unit progress in devInfo

## 4. Work Unit Progress Tracking
11. The work unit tasks array automatically updates as tasks are completed.
    - Use `get-work-unit` to check current state and task statuses
    - Track: How many tasks completed vs. total?
    - Monitor: Are we on track for target date?

12. Update work unit `devInfo` as you progress via `update-work-unit`:
    ```typescript
    devInfo: {
      executionPlan: "...",
      sessionId: "<session-id>",
      startedAt: "<timestamp>",
      progress: {
        completedTasks: 3,
        totalTasks: 8,
        lastTaskCompleted: "Implement cart API",
        currentTask: "Add cart UI component"
      },
      testResults: {
        unitTests: "passing",
        integrationTests: "passing",
        coverage: "85%"
      },
      blockers: [] // or list any blockers encountered
    }
    ```

## 5. Work Unit Completion
13. When ALL tasks in work unit are done:
    - Verify all tasks have status "Done" or "Review"
    - Verify all acceptance criteria across all tasks are met
    - Run full test suite for the feature
    - Review all files changed (use git diff)

14. Use `update-work-unit` to set status to "completed":
    ```typescript
    {
      status: "completed",
      completedAt: new Date(),
      devInfo: {
        ...existing,
        finalNotes: "All tasks completed. Files changed: [...]. Tests passing.",
        completedBy: "<member-id>",
        totalDuration: "3.5 hours"
      }
    }
    ```

15. Create final summary comment documenting:
    - Work unit scope and goals achieved
    - All files created/modified (use `file.ts:42` format)
    - Test coverage and results
    - Any follow-up work needed
    - Performance or architectural notes

## 6. Handle Blockers or Scope Changes
16. If blocked on a task:
    - Use `update-work-unit` to set status to "blocked"
    - Document blocker in work unit devInfo
    - Use `create-task-comment` on blocked task with details
    - Consider creating follow-up tasks for blockers

17. If scope changes during execution:
    - Use `create-task` to add new tasks to work unit
    - Update work unit description/goals if needed
    - Communicate scope change in work unit comments

**Reference**
- Use `get-work-unit <slug-or-id>` to get work unit with all tasks (single call)
- Use `update-work-unit` to track devInfo and status changes
- Use `update-task` to mark tasks as in progress or done
- Check `@../skills/project-management/agiflow-agents.md` for work unit tracking patterns

**Integration with Other Tools**
- **Architect MCP**: MANDATORY for every file edit (before/after)
- **Scaffolding MCP**: Use for generating boilerplate; document in work unit devInfo
- **OpenSpec**: Reference OpenSpec change-id in work unit description if implementing specs
- **Task MCP**: Use individual task commands for granular tracking

**Work Unit Types & Patterns**

### Epic (Large Initiative)
- Multiple features grouped together
- May span multiple Claude Code sessions
- Consider creating child work units for each major feature
- Example: "User Authentication System" (contains login, signup, password reset features)

### Feature (Single Cohesive Capability)
- Can be completed in one session
- 3-10 related tasks
- Clear deliverable at the end
- Example: "Shopping Cart" (add to cart, update quantity, checkout UI)

### Initiative (Business Goal)
- Organizational objective
- Contains multiple epics or features
- May not be code-centric
- Example: "Q1 Performance Improvements"

**Common Patterns**

### Pattern 1: Backend-First Feature
```
1. Database schema & migrations
2. Repository layer
3. Service layer
4. API routes
5. Tests
6. Documentation
```

### Pattern 2: Full-Stack Feature
```
1. API endpoints (backend)
2. Data fetching hooks (frontend)
3. UI components (frontend)
4. Integration tests
5. E2E tests
```

### Pattern 3: Refactoring Initiative
```
1. Identify code smells
2. Write characterization tests
3. Refactor module by module
4. Update documentation
5. Remove deprecated code
```

**Progress Tracking Example**

```typescript
// Work Unit devInfo structure
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

**Common Mistakes to Avoid**
- ❌ Starting without reviewing all tasks in work unit (lack of context)
- ❌ Working on tasks in wrong order (missing dependencies)
- ❌ Skipping architect MCP validation (MANDATORY for every file)
- ❌ Not tracking work unit-level progress in devInfo
- ❌ Completing tasks in isolation without considering work unit goals
- ❌ Not running integration tests between tasks
- ❌ Marking work unit complete with failing tests
- ❌ Not documenting scope changes or blockers
- ❌ Forgetting to commit between tasks (losing incremental progress)
- ❌ Not updating work unit status when blocked

**Tips for Success**
- ✅ Read ALL task descriptions before starting (understand dependencies)
- ✅ Create a clear execution plan (document in devInfo)
- ✅ Commit after each task completion (incremental safety)
- ✅ Run tests frequently (catch regressions early)
- ✅ Update devInfo regularly (track progress transparently)
- ✅ Take breaks between complex tasks (maintain quality)
- ✅ Document design decisions (help future maintainers)
- ✅ Keep work unit scope focused (one cohesive feature per session)
