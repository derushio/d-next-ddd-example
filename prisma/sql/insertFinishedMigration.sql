-- @param {String} $1:id uuidv4
-- @param {String} $2:checksum
-- @param {DateTime} $3:finished_at?
-- @param {String} $4:migration_name
-- @param {String} $5:logs?
-- @param {DateTime} $6:rolled_back_at?
-- @param {DateTime} $7:started_at
-- @param {Int} $8:applied_steps_count
INSERT INTO
  "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
  )
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8);
