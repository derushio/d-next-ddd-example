-- Prisma Database Comments Generator v1.0.2
-- User comments
COMMENT ON TABLE "User" IS 'ユーザーテーブル';

COMMENT ON COLUMN "User"."passwordHash" IS 'salt hash';

-- UserSession comments
COMMENT ON TABLE "UserSession" IS 'ユーザーのサインインセッション';
