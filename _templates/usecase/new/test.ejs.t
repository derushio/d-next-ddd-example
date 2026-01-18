---
to: tests/unit/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase.test.ts
---
import { container } from '@/di/container';
import { resolve } from '@/di/resolver';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { isFailure, isSuccess } from '@/layers/application/types/Result';
import type { <%= h.toPascalCase(name) %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase';
<% if (locals.repository) { -%>
import type { I<%= h.toPascalCase(repository) %>Repository } from '@/layers/domain/repositories/I<%= h.toPascalCase(repository) %>Repository';
<% } -%>

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

describe('<%= h.toPascalCase(name) %>UseCase', () => {
  let useCase: <%= h.toPascalCase(name) %>UseCase;
<% if (locals.repository) { -%>
  let mock<%= h.toPascalCase(repository) %>Repository: MockProxy<I<%= h.toPascalCase(repository) %>Repository>;
<% } -%>
  let mockLogger: MockProxy<ILogger>;

  setupTestEnvironment();

  beforeEach(() => {
<% if (locals.repository) { -%>
    mock<%= h.toPascalCase(repository) %>Repository = mock<I<%= h.toPascalCase(repository) %>Repository>();
<% } -%>
    mockLogger = createAutoMockLogger();

<% if (locals.repository) { -%>
    container.registerInstance(
      INJECTION_TOKENS.<%= h.toPascalCase(repository) %>Repository,
      mock<%= h.toPascalCase(repository) %>Repository,
    );
<% } -%>
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);

    useCase = resolve('<%= h.toPascalCase(name) %>UseCase');
  });

  describe('execute', () => {
    const validInput = {
      // TODO: テスト入力を定義
    };

    it('should succeed with valid input', async () => {
      // Arrange
      // TODO: モックの設定

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // TODO: 成功時のアサーション
      }
    });

    it('should return failure on error', async () => {
      // Arrange
      // TODO: エラーケースのモック設定

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('<%= h.toUpperSnake(name) %>_FAILED');
      }
    });
  });
});
