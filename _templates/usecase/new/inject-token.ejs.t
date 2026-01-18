---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_TOKENS\]
skip_if: "<%= h.toPascalCase(name) %>UseCase: Symbol"
---
  <%= h.toPascalCase(name) %>UseCase: Symbol.for('<%= h.toPascalCase(name) %>UseCase'),
