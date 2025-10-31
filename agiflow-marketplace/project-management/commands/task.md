---
name: agiflow-task
description: Implement tasks sequentially and track progress using MCP tools.
category: Project Management
tags: [agiflow, task, implementation]
---

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `@../skills/project-management/agiflow-agents.md` for MCP tool conventions and tracking guidelines.

**Steps**
Track these steps as TODOs and complete them one by one.

1. Use `list-tasks` MCP tool with `status: "Todo"` to see available work.
2. Select a task to work on (or ask user which task to prioritize).
3. Use `get-task` MCP tool to review full task details, acceptance criteria, and requirements.
4. Use `move-task` MCP tool to update status to "In Progress" before starting work.
5. **BEFORE editing any code**: Use `architect` MCP `get-file-design-pattern` to understand applicable patterns.
6. Work through each acceptance criterion sequentially, keeping edits minimal and focused.
7. Update `devInfo` using `update-task` MCP tool as you progress:
   - Track git worktrees created for this task
   - Record Docker containers if running
   - Store test results and coverage metrics
   - Add development notes about progress or blockers
   - Update `currentSession` with agent session ID
8. **AFTER editing code**: Use `architect` MCP `review-code-change` to validate compliance.
9. Use `create-task-comment` MCP tool to document progress, blockers, or significant decisions.
10. Mark acceptance criteria as checked using `update-task` MCP tool as each criterion is completed.
11. Confirm ALL acceptance criteria are met before proceeding.
12. Use `move-task` MCP tool to update status to "Review" when implementation is complete.
13. Add final comment summarizing work done and files changed (use `file.ts:42` format for references).

**Reference**
- Use `get-task` to review task details before starting
- Use `list-task-comments` to see previous progress updates
- Use `update-task` to track devInfo and acceptance criteria progress
- Check `@../skills/project-management/agiflow-agents.md` for devInfo structure and tracking patterns

**Integration with Other Tools**
- **Architect MCP**: ALWAYS use before/after editing files for pattern compliance
- **Scaffolding MCP**: Document scaffolded code in task comments
- **OpenSpec**: Reference OpenSpec change-id in task description if implementing specs

**Common Mistakes to Avoid**
- ❌ Starting work without moving task to "In Progress"
- ❌ Skipping architect MCP validation (MANDATORY)
- ❌ Not tracking devInfo (worktrees, tests, sessions)
- ❌ Marking acceptance criteria checked before actually completing them
- ❌ Moving to "Review" with incomplete acceptance criteria
- ❌ Not documenting progress in comments
- ❌ Forgetting to add file references in final comment
