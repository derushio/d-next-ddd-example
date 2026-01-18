---
to: tests/unit/server-actions/<%= domain %>/<%= name %>.test.ts
---
import { container } from '@/di/container';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { success } from '@/layers/application/types/Result';
import type { <%= h.toPascalCase(usecase) %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(usecase) %>UseCase';
import { <%= name %> } from '@/app/server-actions/<%= domain %>/<%= name %>';

import { setupTestEnvironment } from '@tests/utils/helpers/testHelpers';
import { createAutoMockLogger } from '@tests/utils/mocks/autoMocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('<%= name %> Server Action', () => {
  let mock<%= h.toPascalCase(usecase) %>UseCase: MockProxy<<%= h.toPascalCase(usecase) %>UseCase>;
  let mockLogger: MockProxy<ILogger>;

  setupTestEnvironment();

  beforeEach(() => {
    mock<%= h.toPascalCase(usecase) %>UseCase = mock<<%= h.toPascalCase(usecase) %>UseCase>();
    mockLogger = createAutoMockLogger();

    container.registerInstance(
      INJECTION_TOKENS.<%= h.toPascalCase(usecase) %>UseCase,
      mock<%= h.toPascalCase(usecase) %>UseCase,
    );
    container.registerInstance(INJECTION_TOKENS.Logger, mockLogger);
  });

  it('should succeed with valid input', async () => {
    // Arrange
    const formData = new FormData();
    // TODO: フォームデータを設定
    // formData.set('fieldName', 'value');

    mock<%= h.toPascalCase(usecase) %>UseCase.execute.mockResolvedValue(
      success({
        // TODO: 成功レスポンスを設定
      }),
    );

    // Act
    const result = await <%= name %>(formData);

    // Assert
    expect(result.success).toBe(true);
    expect(mock<%= h.toPascalCase(usecase) %>UseCase.execute).toHaveBeenCalled();
  });

  it('should return validation error for invalid input', async () => {
    // Arrange
    const formData = new FormData();
    // TODO: 無効なフォームデータを設定

    // Act
    const result = await <%= name %>(formData);

    // Assert
    expect(result.errors).toBeDefined();
  });
});
