---
to: src/di/containers/infrastructure.container.ts
inject: true
after: \[HYGEN:REPO_REGISTER\]
skip_if: "INJECTION_TOKENS.<%= h.toPascalCase(name) %>Repository"
---
safeRegister(INJECTION_TOKENS.<%= h.toPascalCase(name) %>Repository, Prisma<%= h.toPascalCase(name) %>Repository);
