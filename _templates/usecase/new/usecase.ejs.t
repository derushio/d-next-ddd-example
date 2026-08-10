---
to: src/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase.ts
---
import { z } from 'zod';
import { ResultAsync } from 'neverthrow';
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import type { ResultAsync as RA } from '@/layers/application/types/Result';
import type { AppError } from '@/layers/application/types/Result';
import { mapToAppError } from '@/layers/application/utils/useCaseErrorHandler';
import { validateInput } from '@/layers/application/utils/validateInput';
<% if (locals.repository) { -%>
import type { I<%= h.toPascalCase(repository) %>Repository } from '@/layers/domain/repositories/I<%= h.toPascalCase(repository) %>Repository';
<% } -%>

import { inject, injectable } from 'tsyringe';

// Zodスキーマ定義（ファイルスコープ）
const <%= h.toCamelCase(name) %>InputSchema = z.object({
	// TODO: 入力フィールドを定義
	// example: userId: z.string().trim().min(1, 'ユーザーIDが必要です'),
});

// リクエスト型はスキーマから導出（手書き interface 禁止）
export type <%= h.toPascalCase(name) %>Request = z.input<typeof <%= h.toCamelCase(name) %>InputSchema>;

export interface <%= h.toPascalCase(name) %>Response {
	// TODO: レスポンスプロパティを定義
}

@injectable()
export class <%= h.toPascalCase(name) %>UseCase {
	constructor(
<% if (locals.repository) { -%>
		@inject(INJECTION_TOKENS.<%= h.toPascalCase(repository) %>Repository)
		private readonly <%= h.toCamelCase(repository) %>Repository: I<%= h.toPascalCase(repository) %>Repository,
<% } -%>
		@inject(INJECTION_TOKENS.Logger) private readonly logger: ILogger,
	) {}

	execute(
		request: <%= h.toPascalCase(name) %>Request,
	): RA<<%= h.toPascalCase(name) %>Response, AppError> {
		this.logger.info('<%= h.toPascalCase(name) %> 開始', { request });

		return ResultAsync.fromPromise(
			this._execute(request),
			mapToAppError('<%= h.toUpperSnake(name) %>_FAILED'),
		);
	}

	private async _execute(
		request: <%= h.toPascalCase(name) %>Request,
	): Promise<<%= h.toPascalCase(name) %>Response> {
		const validatedData = validateInput(<%= h.toCamelCase(name) %>InputSchema, request);

		// TODO: ビジネスロジックを実装

		this.logger.info('<%= h.toPascalCase(name) %> 完了');

		return {
			// TODO: validatedData を使ってレスポンスを返す
		};
	}
}
