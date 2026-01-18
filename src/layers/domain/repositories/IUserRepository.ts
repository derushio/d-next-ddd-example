import type { User } from '@/layers/domain/entities/User';
import type { ITransaction } from '@/layers/domain/repositories/ITransaction';
import type { Email } from '@/layers/domain/value-objects/Email';
import type { UserId } from '@/layers/domain/value-objects/UserId';

export interface UserSearchCriteria {
  searchQuery?: string;
  minLevel?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'level';
  sortOrder?: 'asc' | 'desc';
}

export interface IUserRepository {
  findById(id: UserId, transaction?: ITransaction): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByCriteria(criteria: UserSearchCriteria): Promise<User[]>;
  save(user: User, transaction?: ITransaction): Promise<void>;
  update(user: User, transaction?: ITransaction): Promise<void>;
  delete(id: UserId): Promise<void>;
  count(searchQuery?: string): Promise<number>;
}
