---
name: file-placement-rules
description: |
  UseCase/Entity/Repository/VO のディレクトリ配置ルールを強制するスキル。
  ドメイン種別ごとのサブディレクトリ必須。直下への配置を禁止する。

  トリガー例:
  - src/layers/application/usecases/ 配下のファイル作成時
  - src/layers/domain/entities/ 配下のファイル作成時
  - src/layers/domain/value-objects/ 配下のファイル作成時
  - src/layers/infrastructure/repositories/ 配下のファイル作成時
  - 「どこに配置する」「ファイル配置」「ディレクトリ構造」
globs:
  - "src/layers/**/*.ts"
---

# ファイル配置ルール

## このスキルの目的

- UseCase/Entity/Repository 等のファイルを正しいディレクトリに配置する
- ドメイン種別ごとのサブディレクトリ分類を強制する
- 「直下に置いて後から移動」の事故を防止する

## UseCase 配置ルール

### 構造

```
src/layers/application/usecases/
├── auth/                    # 認証関連 UseCase
│   ├── SignInUseCase.ts
│   ├── SignOutUseCase.ts
│   ├── ChangePasswordUseCase.ts
│   └── ...
├── user/                    # ユーザー管理 UseCase
│   ├── CreateUserUseCase.ts
│   ├── GetUsersUseCase.ts
│   ├── UpdateUserUseCase.ts
│   ├── DeleteUserUseCase.ts
│   └── ...
└── <domain>/                # 新規ドメインのサブディレクトリ
    └── XxxUseCase.ts
```

### ルール

- ❌ `usecases/MyUseCase.ts`（直下配置は禁止）
- ✅ `usecases/<domain>/MyUseCase.ts`（サブディレクトリ必須）
- サブディレクトリ名はドメイン種別（`auth`, `user`, `order`, `payment` 等）
- 新しいドメインの場合は新しいサブディレクトリを作成する

## Entity / Value Object 配置ルール

```
src/layers/domain/
├── entities/
│   ├── User.ts              # Entity（直下OK: ドメインオブジェクトは種別が明確）
│   └── UserSession.ts
├── value-objects/
│   ├── Email.ts
│   ├── UserId.ts
│   └── SessionId.ts
└── repositories/
    ├── IUserRepository.ts   # Interface
    └── ISessionRepository.ts
```

Entity と Value Object は直下配置OK（数が増えてきたらサブディレクトリ化を検討）。

## Infrastructure Repository 配置ルール

```
src/layers/infrastructure/repositories/
├── implementations/         # 実装クラス
│   ├── PrismaUserRepository.ts
│   └── PrismaSessionRepository.ts
└── utils/                   # Repository共通ユーティリティ
    ├── repositoryOperation.ts
    ├── mapPrismaError.ts
    └── entityMappers.ts
```

## DI 登録時の注意

ファイルを移動した場合、`src/di/containers/` 内のインポートパスも必ず修正すること。

## チェックリスト

- [ ] UseCase は `usecases/<domain>/` サブディレクトリに配置
- [ ] `usecases/` 直下にファイルがない
- [ ] DI コンテナのインポートパスが正しい
- [ ] 関連する Server Action のインポートパスも正しい

## 関連スキル

- `skill-navigator` — レイヤー判定
- `best-practices` — Clean Architecture 全般
