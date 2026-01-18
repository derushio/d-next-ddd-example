---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:USECASE_TYPEMAP\]
skip_if: "  <%= h.toPascalCase(name) %>UseCase: <%= h.toPascalCase(name) %>UseCase;"
---
  <%= h.toPascalCase(name) %>UseCase: <%= h.toPascalCase(name) %>UseCase;
