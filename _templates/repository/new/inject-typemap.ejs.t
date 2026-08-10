---
to: src/di/tokens.ts
inject: true
after: \[HYGEN:REPO_TYPEMAP\]
skip_if: "  <%= h.toPascalCase(name) %>Repository: I<%= h.toPascalCase(name) %>Repository;"
---
  <%= h.toPascalCase(name) %>Repository: I<%= h.toPascalCase(name) %>Repository;
