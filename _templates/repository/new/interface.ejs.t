---
to: src/layers/domain/repositories/I<%= h.toPascalCase(name) %>Repository.ts
---
import type { <%= h.toPascalCase(name) %> } from '@/layers/domain/entities/<%= h.toPascalCase(name) %>';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type { <%= h.toPascalCase(name) %>Id } from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id';

export interface I<%= h.toPascalCase(name) %>Repository {
  findById(
    id: <%= h.toPascalCase(name) %>Id,
    transaction?: ITransaction,
  ): Promise<<%= h.toPascalCase(name) %> | null>;
  findAll(transaction?: ITransaction): Promise<<%= h.toPascalCase(name) %>[]>;
  save(entity: <%= h.toPascalCase(name) %>, transaction?: ITransaction): Promise<void>;
  update(entity: <%= h.toPascalCase(name) %>, transaction?: ITransaction): Promise<void>;
  delete(id: <%= h.toPascalCase(name) %>Id, transaction?: ITransaction): Promise<void>;
  // TODO: 必要に応じてメソッドを追加
}
