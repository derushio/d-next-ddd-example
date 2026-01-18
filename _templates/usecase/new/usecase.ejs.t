---
to: src/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase.ts
---
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import {
  failure,
  type Result,
  success,
} from '@/layers/application/types/Result';
<% if (locals.repository) { -%>
import type { I<%= h.toPascalCase(repository) %>Repository } from '@/layers/domain/repositories/I<%= h.toPascalCase(repository) %>Repository';
<% } -%>
import { DomainError } from '@/layers/domain/errors/DomainError';

import { inject, injectable } from 'tsyringe';

export interface <%= h.toPascalCase(name) %>Request {
  // TODO: リクエストプロパティを定義
}

export interface <%= h.toPascalCase(name) %>Response {
  // TODO: レスポンスプロパティを定義
}

@injectable()
export class <%= h.toPascalCase(name) %>UseCase {
  constructor(
<% if (locals.repository) { -%>
    @inject(INJECTION_TOKENS.<%= h.toPascalCase(repository) %>Repository)
    private <%= h.toCamelCase(repository) %>Repository: I<%= h.toPascalCase(repository) %>Repository,
<% } -%>
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  async execute(
    request: <%= h.toPascalCase(name) %>Request,
  ): Promise<Result<<%= h.toPascalCase(name) %>Response>> {
    this.logger.info('<%= h.toPascalCase(name) %> 開始', { request });

    try {
      // TODO: ビジネスロジックを実装

      this.logger.info('<%= h.toPascalCase(name) %> 完了');

      return success({
        // TODO: レスポンスを返す
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('<%= h.toPascalCase(name) %> 失敗', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof DomainError) {
        return failure(error.message, error.code);
      }

      if (error instanceof Error) {
        return failure(error.message, '<%= h.toUpperSnake(name) %>_FAILED');
      }

      return failure('処理に失敗しました', '<%= h.toUpperSnake(name) %>_FAILED');
    }
  }
}
