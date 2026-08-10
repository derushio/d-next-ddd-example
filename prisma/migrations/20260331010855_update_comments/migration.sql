-- Prisma Database Comments Generator v1.7.0

-- users comments
COMMENT ON TABLE "users" IS 'ユーザーテーブル';
COMMENT ON COLUMN "users"."passwordHash" IS 'salt hash';

-- user_sessions comments
COMMENT ON TABLE "user_sessions" IS 'ユーザーのサインインセッション';

-- login_attempts comments
COMMENT ON TABLE "login_attempts" IS E'ログイン試行履歴（セキュリティ監査・アカウントロックアウト用）\nブルートフォース攻撃対策として、失敗回数に基づいてアカウントをロックする';
COMMENT ON COLUMN "login_attempts"."email" IS '対象メールアドレス（ユーザー存在有無に関わらず記録）';
COMMENT ON COLUMN "login_attempts"."ipAddress" IS '試行元IPアドレス（プライバシー配慮で任意）';
COMMENT ON COLUMN "login_attempts"."success" IS '成功/失敗';
COMMENT ON COLUMN "login_attempts"."failureReason" IS '失敗理由コード（INVALID_CREDENTIALS, ACCOUNT_LOCKED等）';
