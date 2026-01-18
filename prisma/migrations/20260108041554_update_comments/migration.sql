-- Prisma Database Comments Generator v1.4.0

-- User comments
COMMENT ON TABLE "User" IS 'ユーザーテーブル';
COMMENT ON COLUMN "User"."passwordHash" IS 'salt hash';

-- UserSession comments
COMMENT ON TABLE "UserSession" IS 'ユーザーのサインインセッション';

-- LoginAttempt comments
COMMENT ON TABLE "LoginAttempt" IS E'ログイン試行履歴（セキュリティ監査・アカウントロックアウト用）\nブルートフォース攻撃対策として、失敗回数に基づいてアカウントをロックする';
COMMENT ON COLUMN "LoginAttempt"."email" IS '対象メールアドレス（ユーザー存在有無に関わらず記録）';
COMMENT ON COLUMN "LoginAttempt"."ipAddress" IS '試行元IPアドレス（プライバシー配慮で任意）';
COMMENT ON COLUMN "LoginAttempt"."success" IS '成功/失敗';
COMMENT ON COLUMN "LoginAttempt"."failureReason" IS '失敗理由コード（INVALID_CREDENTIALS, ACCOUNT_LOCKED等）';
