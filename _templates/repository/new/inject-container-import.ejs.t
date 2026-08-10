---
to: src/di/containers/infrastructure.container.ts
inject: true
after: \[HYGEN:REPO_IMPORTS\]
skip_if: Prisma<%= h.toPascalCase(name) %>Repository
---
import { Prisma<%= h.toPascalCase(name) %>Repository } from '@/layers/infrastructure/repositories/implementations/Prisma<%= h.toPascalCase(name) %>Repository';
