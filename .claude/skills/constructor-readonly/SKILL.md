---
name: constructor-readonly
description: |
  TSyringe @injectable クラスのコンストラクタパラメータに
  必ず private readonly を付けることを強制するスキル。
  readonly なしの private は設計上の誤りとして検出・修正する。

  トリガー例:
  - 「@injectable」「@inject」「コンストラクタ」「DI」「TSyringe」
  - @injectable() クラスを書こうとしたとき
  - constructor に @inject() デコレータを書くとき
  - src/layers/ 配下の Service, UseCase, Repository 実装時
globs:
  - "src/layers/**/*.ts"
---

# Constructor Readonly Skill

TSyringe でDI注入されるコンストラクタパラメータは必ず `private readonly` にすることを強制します。
`private` のみ（`readonly` なし）での定義は設計上の誤りとして禁止します。

---

## 1. 基本ルール

### なぜ readonly が必要か

- DI注入されたサービスは **不変** であるべき（インスタンス生成後に再代入する理由がない）
- `readonly` なしでは誤って再代入できてしまい、バグの温床になる
- TypeScript の型システムを活用して「変更してはいけない」という意図を明示する
- コードレビューで「なぜ readonly がないのか」という疑問を生じさせない

### ✅ 正しいパターン

```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,  // ✅ private readonly

    @inject(INJECTION_TOKENS.HashService)
    private readonly hashService: IHashService,  // ✅ private readonly

    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,  // ✅ private readonly
  ) {}
}
```

### ❌ 禁止パターン

```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private userRepository: IUserRepository,  // ❌ readonly がない

    @inject(INJECTION_TOKENS.HashService)
    private hashService: IHashService,  // ❌ readonly がない

    @inject(INJECTION_TOKENS.Logger)
    private logger: ILogger,  // ❌ readonly がない
  ) {}
}
```

---

## 2. 適用対象のクラス

`@injectable()` が付くすべてのクラスに適用される：

- **UseCase**: `src/layers/application/usecases/`
- **Service（Infrastructure）**: `src/layers/infrastructure/services/`
- **Repository実装**: `src/layers/infrastructure/repositories/implementations/`

### UseCase の例

```typescript
@injectable()
export class SignInUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,

    @inject(INJECTION_TOKENS.SessionRepository)
    private readonly sessionRepository: ISessionRepository,

    @inject(INJECTION_TOKENS.HashService)
    private readonly hashService: IHashService,

    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,
  ) {}

  async execute(request: SignInRequest): Promise<Result<SignInResponse, AppError>> {
    // this.userRepository は readonly なので再代入不可（型安全）
    const user = await this.userRepository.findByEmail(request.email);
    // ...
  }
}
```

### Repository実装の例

```typescript
@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient)
    private readonly prisma: PrismaClient,  // ✅ readonly

    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,  // ✅ readonly
  ) {}
}
```

### Infrastructure Service の例

```typescript
@injectable()
export class ArgonHashService implements IHashService {
  constructor(
    @inject(INJECTION_TOKENS.Logger)
    private readonly logger: ILogger,  // ✅ readonly
  ) {}
}
```

---

## 3. コード生成時の注意

`pnpm gen:usecase` / `pnpm gen:repo` 等のコード生成ツールを使った場合も、
生成されたコードに `readonly` が付いているか必ず確認すること。

### 生成後の確認コマンド

```bash
# @inject されているパラメータに readonly がないものを検索
grep -rn "@inject" src/layers/ --include="*.ts" -A 1 | grep -v "readonly"
```

---

## 4. public / protected は対象外

`private readonly` ルールは `@inject` されるコンストラクタパラメータに限定される。
`public` / `protected` は通常のクラス設計に従う（DIパラメータでこれらを使うことは稀）。

```typescript
@injectable()
export class SomeUseCase {
  constructor(
    @inject(INJECTION_TOKENS.UserRepository)
    private readonly userRepository: IUserRepository,  // ✅ DI → private readonly 必須

    // DIでない通常のパラメータがある場合（稀なケース）
    private readonly config: SomeConfig,  // readonly は付けるのが望ましい
  ) {}
}
```

---

## 5. 検出・修正の手順

既存コードで `readonly` が抜けているものを検出・修正する場合：

```bash
# @inject の次の行が "private " で始まり "readonly" がないものを探す
grep -rn "private [a-zA-Z]" src/layers/ --include="*.ts" | grep -v "readonly" | grep -v "constructor\|class\|interface"
```

修正は単純に `private` → `private readonly` に変更するだけ。
動作への影響はない（readonly は TypeScript コンパイル時のチェックのみ）。

---

## チェックリスト

- [ ] すべての `@inject()` パラメータに `private readonly` が付いている
- [ ] `private` のみ（`readonly` なし）のパラメータが存在しない
- [ ] コード生成後に `readonly` の有無を確認した
- [ ] テストモックも同様に `readonly` が付いている（テストクラスの場合）

---

## 関連スキル

- **best-practices**: Clean Architecture + DDD 全体のパターン
- **application-impl**: UseCase の実装パターン
- **infrastructure-impl**: Repository・Service の実装パターン
- **di-hygiene**: DI コンテナの衛生管理（未使用 @inject 検出等）
- **typescript-patterns**: TypeScript 6 の型安全な実装パターン
