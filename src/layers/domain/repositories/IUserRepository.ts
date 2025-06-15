import { User } from '@/layers/domain/entities/User';
import { Email } from '@/layers/domain/value-objects/Email';
import { UserId } from '@/layers/domain/value-objects/UserId';

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
  findById(id: UserId, transaction?: unknown): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByCriteria(criteria: UserSearchCriteria): Promise<User[]>;
  save(user: User, transaction?: unknown): Promise<void>;
  update(user: User, transaction?: unknown): Promise<void>;
  delete(id: UserId): Promise<void>;
  count(searchQuery?: string): Promise<number>;
}
