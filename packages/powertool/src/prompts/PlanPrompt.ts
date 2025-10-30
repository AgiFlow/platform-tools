/**
 * PlanPrompt
 *
 * DESIGN PATTERNS:
 * - Prompt pattern with name, description, and optional arguments
 * - Message generation for AI assistant guidance
 * - Template-based rendering with LiquidJS
 *
 * CODING STANDARDS:
 * - Use snake_case for prompt name property
 * - Define arguments schema for customization
 * - Return messages array with role and content
 * - Keep prompts focused and well-structured
 * - Import markdown templates with ?raw suffix
 * - Use TemplateService for rendering
 *
 * AVOID:
 * - Overly complex argument structures
 * - Missing argument validation
 * - Unclear or ambiguous instructions
 */

import planTemplate from '../instructions/prompts/plan.md?raw';
import agiflowAgentsDoc from '../instructions/agents/agiflow-agents.md?raw';
import { TemplateService } from '../services/TemplateService';

export const PlanPrompt = {
  name: 'plan',
  description:
    'Plan project backlogs using MCP tools to convert requirements to tasks and work units',
};

export function generatePlanPrompt(): Array<{
  role: string;
  content: { type: string; text: string };
}> {
  const templateService = new TemplateService();
  const renderedText = templateService.renderString(planTemplate, {
    agiflowAgentsDoc,
  });

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: renderedText,
      },
    },
  ];
}
