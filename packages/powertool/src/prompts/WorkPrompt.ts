/**
 * WorkPrompt
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

import workTemplate from '../instructions/prompts/work.md?raw';
import agiflowAgentsDoc from '../instructions/agents/agiflow-agents.md?raw';
import { TemplateService } from '../services/TemplateService';

export const WorkPrompt = {
  name: 'work',
  description:
    'Execute a work unit (feature/epic) by implementing all its tasks sequentially using MCP tools',
  arguments: [
    {
      name: 'workUnitId',
      description:
        'Work unit slug or ID to execute (e.g., "DXX-WU-1" or "01K8FABMNEJG1XTA9JGHSNFV40"). If not provided, will list available work units for selection.',
      required: false,
    },
  ],
};

export function generateWorkPrompt(args?: {
  workUnitId?: string;
}): Array<{ role: string; content: { type: string; text: string } }> {
  const templateService = new TemplateService();
  const renderedText = templateService.renderString(workTemplate, {
    workUnitId: args?.workUnitId,
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
