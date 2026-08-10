---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_IMPORTS\]
skip_if: <%= h.toPascalCase(name) %>UseCase
---
import type { <%= h.toPascalCase(name) %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase';
