---
to: src/di/containers/application.container.ts
inject: true
after: \[HYGEN:USECASE_IMPORTS\]
skip_if: <%= h.toPascalCase(name) %>UseCase
---
import { <%= h.toPascalCase(name) %>UseCase } from '@/layers/application/usecases/<%= domain %>/<%= h.toPascalCase(name) %>UseCase';
