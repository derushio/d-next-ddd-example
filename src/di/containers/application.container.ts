import 'reflect-metadata';

import { domainContainer } from '@/di/containers/domain.container';
import { batchRegister } from '@/di/containers/safeRegister';
import { INJECTION_TOKENS } from '@/di/tokens';
import { ChangePasswordUseCase } from '@/layers/application/usecases/auth/ChangePasswordUseCase';
import { GetCurrentUserUseCase } from '@/layers/application/usecases/auth/GetCurrentUserUseCase';
import { RefreshTokenUseCase } from '@/layers/application/usecases/auth/RefreshTokenUseCase';
import { ResetPasswordUseCase } from '@/layers/application/usecases/auth/ResetPasswordUseCase';
import { SignInUseCase } from '@/layers/application/usecases/auth/SignInUseCase';
import { SignOutUseCase } from '@/layers/application/usecases/auth/SignOutUseCase';
import { CreateUserUseCase } from '@/layers/application/usecases/user/CreateUserUseCase';
import { DeleteUserUseCase } from '@/layers/application/usecases/user/DeleteUserUseCase';
import { GetUserByIdUseCase } from '@/layers/application/usecases/user/GetUserByIdUseCase';
import { GetUsersUseCase } from '@/layers/application/usecases/user/GetUsersUseCase';
import { UpdateUserUseCase } from '@/layers/application/usecases/user/UpdateUserUseCase';
// [HYGEN:USECASE_IMPORTS]

/**
 * Application Container - アプリケーション層（最上位）
 *
 * Domain層の上に構築され、アプリケーション固有の処理を管理：
 * - Use Cases: アプリケーションのユースケース
 */
export const applicationContainer = domainContainer.createChildContainer();

// Use Case registrations
// Group 1: 認証系UseCase（他のUseCaseから依存されるため先に登録）
batchRegister(applicationContainer, [
  {
    token: INJECTION_TOKENS.GetCurrentUserUseCase,
    impl: GetCurrentUserUseCase,
  },
  { token: INJECTION_TOKENS.SignInUseCase, impl: SignInUseCase },
  { token: INJECTION_TOKENS.SignOutUseCase, impl: SignOutUseCase },
  { token: INJECTION_TOKENS.RefreshTokenUseCase, impl: RefreshTokenUseCase },
  { token: INJECTION_TOKENS.ResetPasswordUseCase, impl: ResetPasswordUseCase },
  {
    token: INJECTION_TOKENS.ChangePasswordUseCase,
    impl: ChangePasswordUseCase,
  },
]);

// Group 2: ユーザー系UseCase（GetCurrentUserUseCaseに依存）
batchRegister(applicationContainer, [
  { token: INJECTION_TOKENS.CreateUserUseCase, impl: CreateUserUseCase },
  { token: INJECTION_TOKENS.GetUsersUseCase, impl: GetUsersUseCase },
  { token: INJECTION_TOKENS.GetUserByIdUseCase, impl: GetUserByIdUseCase },
  { token: INJECTION_TOKENS.DeleteUserUseCase, impl: DeleteUserUseCase },
  { token: INJECTION_TOKENS.UpdateUserUseCase, impl: UpdateUserUseCase },
]);
// [HYGEN:USECASE_REGISTER]

// NOTE: DIコンテナ初期化ログは console.log を使用する。
// Logger は infrastructureContainer で登録されており、applicationContainer から
// resolve() 経由でアクセス可能だが、コンテナ初期化コード全体の一貫性のため
// 全コンテナで統一的に console.log を使用する。
// （core/infrastructure コンテナ初期化時点では Logger 未登録のため console.log が必須であり、
//   全コンテナを同一パターンで統一することで可読性と保守性を確保する）
console.log('✅ Application Container初期化完了');
