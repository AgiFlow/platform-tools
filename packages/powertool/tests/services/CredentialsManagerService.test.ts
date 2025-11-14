/**
 * CredentialsManagerService Tests
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CredentialsManagerService,
  type McpCredentials,
} from '../../src/services/CredentialsManagerService';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('CredentialsManagerService', () => {
  let service: CredentialsManagerService;
  const testProjectPath = '/test/project/path';
  const testCredentials: McpCredentials = {
    endpoint: 'https://test.example.com',
    apiKey: 'test-api-key-12345',
  };

  beforeEach(() => {
    service = new CredentialsManagerService();
  });

  afterEach(async () => {
    // Clean up test credentials
    const credentialsPath = service.getCredentialsPath();
    if (existsSync(credentialsPath)) {
      try {
        await unlink(credentialsPath);
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
  });

  it('should create service successfully', () => {
    expect(service).toBeDefined();
    expect(service.getCredentialsPath()).toBeDefined();
  });

  it('should return null for non-existent credentials', async () => {
    const credentials = await service.getCredentials(testProjectPath);
    expect(credentials).toBeNull();
  });

  it('should save and retrieve credentials', async () => {
    await service.saveCredentials(testProjectPath, testCredentials);

    const retrieved = await service.getCredentials(testProjectPath);

    expect(retrieved).toEqual(testCredentials);
  });

  it('should check if credentials exist', async () => {
    const existsBefore = await service.hasCredentials(testProjectPath);
    expect(existsBefore).toBe(false);

    await service.saveCredentials(testProjectPath, testCredentials);

    const existsAfter = await service.hasCredentials(testProjectPath);
    expect(existsAfter).toBe(true);
  });

  it('should delete credentials', async () => {
    await service.saveCredentials(testProjectPath, testCredentials);

    const existsBefore = await service.hasCredentials(testProjectPath);
    expect(existsBefore).toBe(true);

    await service.deleteCredentials(testProjectPath);

    const existsAfter = await service.hasCredentials(testProjectPath);
    expect(existsAfter).toBe(false);
  });
});
