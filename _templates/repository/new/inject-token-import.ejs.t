---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_IMPORTS\]
skip_if: I<%= h.toPascalCase(name) %>Repository
---
import type { I<%= h.toPascalCase(name) %>Repository } from '@/layers/domain/repositories/I<%= h.toPascalCase(name) %>Repository';
