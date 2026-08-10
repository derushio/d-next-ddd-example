import 'reflect-metadata';

import type { DependencyContainer } from 'tsyringe';

/**
 * コンテナに既に同じトークンが登録されている場合は登録をスキップする安全なヘルパー。
 * テスト時のモック登録との競合を防ぐ。
 *
 * 内部で registerSingleton(creator) + register(token, { useToken: creator }) の
 * 2段階登録を行う。
 */
// biome-ignore lint/suspicious/noExplicitAny: tsyringe の constructor<T> 型は new (...args: any[]) => T を要求するため any[] が必要
type InjectableClass<T = unknown> = new (...args: any[]) => T;

export function safeRegister<T>(
  childContainer: DependencyContainer,
  token: symbol,
  creator: InjectableClass<T>,
): void {
  // bubble: true で親コンテナまで遡って登録済みチェックを行う
  if (!childContainer.isRegistered(token, true)) {
    childContainer.registerSingleton(creator);
    childContainer.register(token, { useToken: creator });
  }
}

/**
 * 複数の UseCase を一括登録するヘルパー
 *
 * safeRegister を配列で呼び出すことでボイラープレートを削減する。
 * 配列の順序が登録順序となるため、依存関係がある場合は順序に注意。
 *
 * @example
 * batchRegister(container, [
 *   { token: INJECTION_TOKENS.SignInUseCase, impl: SignInUseCase },
 *   { token: INJECTION_TOKENS.SignOutUseCase, impl: SignOutUseCase },
 * ]);
 */
export function batchRegister(
  container: DependencyContainer,
  registrations: Array<{
    token: symbol;
    impl: InjectableClass;
  }>,
): void {
  for (const { token, impl } of registrations) {
    safeRegister(container, token, impl);
  }
}
