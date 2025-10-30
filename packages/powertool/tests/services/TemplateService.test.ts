/**
 * TemplateService Tests
 *
 * TESTING PATTERNS:
 * - Unit tests with mocked dependencies
 * - Test each method independently
 * - Cover success cases, edge cases, and error handling
 *
 * CODING STANDARDS:
 * - Use descriptive test names (should...)
 * - Arrange-Act-Assert pattern
 * - Mock external dependencies
 * - Test behavior, not implementation
 */

import { describe, it, expect } from 'vitest';
import { TemplateService } from '../../src/services/TemplateService';

describe('TemplateService', () => {
  const service = new TemplateService();

  it('should render template string with variables', () => {
    const template = 'Hello {{ name }}!';
    const variables = { name: 'World' };
    const result = service.renderString(template, variables);

    expect(result).toBe('Hello World!');
  });

  it('should detect template variables in content', () => {
    const contentWithVars = 'Hello {{ name }}!';
    const contentWithoutVars = 'Hello World!';

    expect(service.containsTemplateVariables(contentWithVars)).toBe(true);
    expect(service.containsTemplateVariables(contentWithoutVars)).toBe(false);
  });
});
