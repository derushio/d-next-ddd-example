---
to: src/layers/infrastructure/repositories/implementations/Prisma<%= h.toPascalCase(name) %>Repository.ts
---
import { INJECTION_TOKENS } from '@/di/tokens';
import type { ILogger } from '@/layers/application/interfaces/ILogger';
import { <%= h.toPascalCase(name) %> } from '@/layers/domain/entities/<%= h.toPascalCase(name) %>';
import { DomainError } from '@/layers/domain/errors/DomainError';
import type { I<%= h.toPascalCase(name) %>Repository } from '@/layers/domain/repositories/I<%= h.toPascalCase(name) %>Repository';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import { <%= h.toPascalCase(name) %>Id } from '@/layers/domain/value-objects/<%= h.toPascalCase(name) %>Id';
import type {
  PrismaClient,
  <%= h.toPascalCase(name) %> as Prisma<%= h.toPascalCase(name) %>,
} from '@/layers/infrastructure/persistence/prisma/generated';

import { inject, injectable } from 'tsyringe';

@injectable()
export class Prisma<%= h.toPascalCase(name) %>Repository implements I<%= h.toPascalCase(name) %>Repository {
  constructor(
    @inject(INJECTION_TOKENS.PrismaClient) private prisma: PrismaClient,
    @inject(INJECTION_TOKENS.Logger) private logger: ILogger,
  ) {}

  private getClient(transaction?: ITransaction): PrismaClient {
    return (transaction as unknown as PrismaClient) || this.prisma;
  }

  async findById(
    id: <%= h.toPascalCase(name) %>Id,
    transaction?: ITransaction,
  ): Promise<<%= h.toPascalCase(name) %> | null> {
    this.logger.info('<%= h.toPascalCase(name) %>ID検索開始', { id: id.value });

    try {
      const client = this.getClient(transaction);
      const data = await client.<%= h.toCamelCase(name) %>.findUnique({
        where: { id: id.value },
      });

      if (data) {
        this.logger.info('<%= h.toPascalCase(name) %>ID検索成功', { id: id.value });
        return this.toDomainObject(data);
      }
      this.logger.info('<%= h.toPascalCase(name) %>が見つかりません', { id: id.value });
      return null;
    } catch (error) {
      this.logger.error('<%= h.toPascalCase(name) %>ID検索失敗', {
        id: id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async findAll(transaction?: ITransaction): Promise<<%= h.toPascalCase(name) %>[]> {
    this.logger.info('<%= h.toPascalCase(name) %>一覧取得開始');

    try {
      const client = this.getClient(transaction);
      const dataList = await client.<%= h.toCamelCase(name) %>.findMany();

      this.logger.info('<%= h.toPascalCase(name) %>一覧取得成功', { count: dataList.length });
      return dataList.map((data) => this.toDomainObject(data));
    } catch (error) {
      this.logger.error('<%= h.toPascalCase(name) %>一覧取得失敗', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async save(entity: <%= h.toPascalCase(name) %>, transaction?: ITransaction): Promise<void> {
    this.logger.info('<%= h.toPascalCase(name) %>保存開始', { id: entity.id.value });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(entity);

      await client.<%= h.toCamelCase(name) %>.create({
        data,
      });

      this.logger.info('<%= h.toPascalCase(name) %>保存成功', { id: entity.id.value });
    } catch (error) {
      this.logger.error('<%= h.toPascalCase(name) %>保存失敗', {
        id: entity.id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DomainError(
        '<%= h.toPascalCase(name) %>の保存に失敗しました',
        '<%= h.toUpperSnake(name) %>_SAVE_FAILED',
      );
    }
  }

  async update(entity: <%= h.toPascalCase(name) %>, transaction?: ITransaction): Promise<void> {
    this.logger.info('<%= h.toPascalCase(name) %>更新開始', { id: entity.id.value });

    try {
      const client = this.getClient(transaction);
      const data = this.toPersistenceObject(entity);

      await client.<%= h.toCamelCase(name) %>.update({
        where: { id: data.id },
        data: {
          // TODO: 更新フィールドを指定
          updatedAt: data.updatedAt,
        },
      });

      this.logger.info('<%= h.toPascalCase(name) %>更新成功', { id: entity.id.value });
    } catch (error) {
      this.logger.error('<%= h.toPascalCase(name) %>更新失敗', {
        id: entity.id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DomainError(
        '<%= h.toPascalCase(name) %>の更新に失敗しました',
        '<%= h.toUpperSnake(name) %>_UPDATE_FAILED',
      );
    }
  }

  async delete(id: <%= h.toPascalCase(name) %>Id, transaction?: ITransaction): Promise<void> {
    this.logger.info('<%= h.toPascalCase(name) %>削除開始', { id: id.value });

    try {
      const client = this.getClient(transaction);
      await client.<%= h.toCamelCase(name) %>.delete({
        where: { id: id.value },
      });

      this.logger.info('<%= h.toPascalCase(name) %>削除成功', { id: id.value });
    } catch (error) {
      this.logger.error('<%= h.toPascalCase(name) %>削除失敗', {
        id: id.value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DomainError(
        '<%= h.toPascalCase(name) %>の削除に失敗しました',
        '<%= h.toUpperSnake(name) %>_DELETE_FAILED',
      );
    }
  }

  private toDomainObject(data: Prisma<%= h.toPascalCase(name) %>): <%= h.toPascalCase(name) %> {
    return <%= h.toPascalCase(name) %>.reconstruct(
      new <%= h.toPascalCase(name) %>Id(data.id),
      // TODO: フィールドをマッピング
      data.createdAt,
      data.updatedAt,
    );
  }

  private toPersistenceObject(entity: <%= h.toPascalCase(name) %>) {
    return {
      id: entity.id.value,
      // TODO: フィールドをマッピング
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
