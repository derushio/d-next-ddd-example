import 'reflect-metadata';

import { AuthService } from '@/layers/application/services/AuthService';
import { TokenService } from '@/layers/application/services/TokenService';
import { UserService } from '@/layers/application/services/UserService';
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
import { domainContainer } from '@/layers/infrastructure/di/containers/domain.container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

/**
 * Application Container - アプリケーション層（最上位）
 *
 * Domain層の上に構築され、アプリケーション固有の処理を管理：
 * - Use Cases: アプリケーションのユースケース
 * - Legacy Services: レガシーアプリケーションサービス（段階的廃止予定）
 */
export const applicationContainer = domainContainer.createChildContainer();

// Prevent duplicate registration
function safeRegister<T>(token: symbol, creator: new (...args: any[]) => T) {
  if (!applicationContainer.isRegistered(token)) {
    applicationContainer.registerSingleton(creator);
    applicationContainer.register(token, { useToken: creator });
  }
}

// Use Case registrations
safeRegister(INJECTION_TOKENS.CreateUserUseCase, CreateUserUseCase);
safeRegister(INJECTION_TOKENS.GetUsersUseCase, GetUsersUseCase);
safeRegister(INJECTION_TOKENS.GetUserByIdUseCase, GetUserByIdUseCase);
safeRegister(INJECTION_TOKENS.DeleteUserUseCase, DeleteUserUseCase);
safeRegister(INJECTION_TOKENS.SignInUseCase, SignInUseCase);
safeRegister(INJECTION_TOKENS.SignOutUseCase, SignOutUseCase);
safeRegister(INJECTION_TOKENS.GetCurrentUserUseCase, GetCurrentUserUseCase);
safeRegister(INJECTION_TOKENS.RefreshTokenUseCase, RefreshTokenUseCase);
safeRegister(INJECTION_TOKENS.ResetPasswordUseCase, ResetPasswordUseCase);
safeRegister(INJECTION_TOKENS.ChangePasswordUseCase, ChangePasswordUseCase);

// Legacy Service registrations (will be phased out)
safeRegister(INJECTION_TOKENS.UserService, UserService);
safeRegister(INJECTION_TOKENS.AuthService, AuthService);
safeRegister(INJECTION_TOKENS.TokenService, TokenService);

console.log('✅ Application Container初期化完了');
