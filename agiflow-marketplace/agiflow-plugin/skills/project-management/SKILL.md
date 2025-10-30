---
name: project-management
description: Managing tasks and planning work in projects using Agiflow. Use this when users request creating tasks, planning work, tracking implementation progress, managing project work, or breaking down features into actionable items. Provides task workflow management with MCP tools.
---

These instructions are for AI assistants managing tasks in this project.

## When to Use This Skill

Always open `@./agiflow-agents.md` when the request:
- Mentions creating tasks or planning work (words like task, plan, work, implement)
- Involves tracking implementation progress or managing project work
- Requires breaking down features into actionable items

## What You'll Learn

Use `@./agiflow-agents.md` to learn:
- How to create and manage tasks using MCP tools
- Agent assignment strategy and best practices
- Task workflow and devInfo tracking
- Available slash commands and their purposes

## Available Slash Commands

- **`/agiflow-plan`** - Create project plan with tasks (checks duplicates, assigns agents)
- **`/agiflow-task`** - Implement task sequentially (validates patterns, tracks devInfo)
- **`/agiflow-work`** - Implement tasks in work unit (coordinates feature, tracks progress)
- **`/agiflow-complete`** - Mark task complete (validates criteria, runs tests)

## Workflow

1. Use `/agiflow-plan` to break down features into tasks
2. Use `/agiflow-task` or `/agiflow-work` to implement tasks
3. Use `/agiflow-complete` to mark tasks as done and validate completion

For detailed instructions, always refer to `@./agiflow-agents.md`.
