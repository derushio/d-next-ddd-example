SELECT
  "migration_name"
FROM
  "_prisma_migrations"
WHERE
  "finished_at" IS NOT NULL
ORDER BY
  "migration_name" ASC;
