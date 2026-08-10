---
to: src/di/containers/application.container.ts
inject: true
after: \[HYGEN:USECASE_REGISTER\]
skip_if: "INJECTION_TOKENS.<%= h.toPascalCase(name) %>UseCase"
---
safeRegister(INJECTION_TOKENS.<%= h.toPascalCase(name) %>UseCase, <%= h.toPascalCase(name) %>UseCase);
