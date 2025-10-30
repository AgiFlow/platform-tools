**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.

---

{{ agiflowAgentsDoc }}

---

**Steps**
Track these steps as TODOs and complete them one by one.

## 1. Review Task Completion
1. Identify the task to complete (via task ID or user prompt).
2. Use `get-task` MCP tool to review task details and acceptance criteria.
3. Use `list-task-comments` MCP tool to review implementation history and confirm work is complete.
4. Verify ALL acceptance criteria are marked as checked (`checked: true`).
5. Verify task status is "Review" (should have been moved there after implementation).

## 2. Run Final Validations
6. Run final validations:
   - `pnpm nx typecheck [project]` - Ensure no TypeScript errors
   - `pnpm nx test [project]` - Ensure all tests pass
   - `pnpm nx fixcode [project]` - Ensure code formatting is clean

7. If validations fail:
   - Use `update-task` MCP tool to move status back to "In Progress"
   - Fix the issues
   - Return to step 1 when fixes are complete

## 3. Document Completion
8. If validations pass, use `create-task-comment` MCP tool to add completion summary:
   - List all files changed with references (`file.ts:42`)
   - Summarize what was implemented
   - Note any follow-up tasks or considerations

## 4. Mark Task Complete
9. Use `update-task` MCP tool to update status to "Done".
10. Use `update-task` MCP tool to update final `devInfo` with completion metadata:
    - Final test results and coverage
    - Deployment notes if applicable
    - Any cleanup performed

**Validation Checklist**
- [ ] All acceptance criteria marked as checked
- [ ] TypeScript compilation passes
- [ ] All tests pass with required coverage
- [ ] Code formatting clean (biome check passes)
- [ ] Files referenced in completion comment
- [ ] Task status updated to "Done"

**Reference**
- Use `get-task` to verify acceptance criteria completion
- Use `list-task-comments` to review implementation history

**Common Mistakes to Avoid**
- ❌ Marking task "Done" with unchecked acceptance criteria
- ❌ Skipping final validation (typecheck, test, fixcode)
- ❌ Not adding completion summary comment
- ❌ Moving to "Done" without being in "Review" first
- ❌ Not updating devInfo with final results
- ❌ Missing file references in completion comment
