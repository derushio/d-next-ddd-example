import { injectable, inject } from 'tsyringe';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';
import type { IConfigService, AppConfig } from '@/layers/infrastructure/services/ConfigService';
import * as bcrypt from 'bcryptjs';

/**
 * パスワードハッシュを担当するユーティリティサービス。
 * アルゴリズムを abstract することで、将来的に argon2 等へ切り替えが容易となる。
 */
export interface IHashService {
  /** テキストをハッシュ化する */
  generateHash(text: string): Promise<string>;
  /** ハッシュとプレーンテキストを比較する */
  compareHash(text: string, hash: string): Promise<boolean>;
}

@injectable()
export class HashService implements IHashService {
  constructor(
    @inject(INJECTION_TOKENS.ConfigService) private config: IConfigService
  ) {}

  async generateHash(text: string): Promise<string> {
    const cfg: AppConfig = this.config.getConfig();
    const saltRounds = cfg.token.saltRounds;
    return await bcrypt.hash(text, saltRounds);
  }

  async compareHash(text: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(text, hash);
  }
} 
