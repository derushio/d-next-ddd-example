---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:REPO_TOKENS\]
skip_if: "<%= h.toPascalCase(name) %>Repository: Symbol"
---
  <%= h.toPascalCase(name) %>Repository: Symbol.for('<%= h.toPascalCase(name) %>Repository'),
