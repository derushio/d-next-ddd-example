import { INJECTION_TOKENS } from '@/di/tokens';
import type {
  AppConfig,
  IConfigService,
} from '@/layers/application/interfaces/IConfigService';
import type { IHashService } from '@/layers/domain/interfaces/IHashService';

import * as bcrypt from 'bcryptjs';
import { inject, injectable } from 'tsyringe';

// Re-export for backward compatibility
export type { IHashService } from '@/layers/domain/interfaces/IHashService';

/**
 * タイミング攻撃対策用ダミーハッシュ
 *
 * ユーザーが存在しない場合でもbcrypt.compareを実行し、
 * レスポンス時間を均一化するために使用します。
 *
 * 背景:
 * - ユーザー存在時: DB検索 + bcrypt比較（〜100ms）
 * - ユーザー不在時: DB検索のみ（〜5ms）
 * この時間差から攻撃者がメールアドレスの存在有無を推測できる
 * （タイミング攻撃 / ユーザー列挙攻撃）
 *
 * 対策:
 * ユーザーが存在しない場合でもこのダミーハッシュに対して
 * bcrypt.compareを実行することで、レスポンス時間を均一化
 *
 * NOTE: このハッシュは実際の照合には使用されない無効なハッシュです
 * "dummy_password_for_timing_safe" をbcryptでハッシュ化したもの
 */
const TIMING_SAFE_DUMMY_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@injectable()
export class HashService implements IHashService {
  constructor(
    @inject(INJECTION_TOKENS.ConfigService) private config: IConfigService,
  ) {}

  async generateHash(text: string): Promise<string> {
    const cfg: AppConfig = this.config.getConfig();
    const saltRounds = cfg.token.saltRounds;
    return await bcrypt.hash(text, saltRounds);
  }

  async compareHash(text: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(text, hash);
  }

  getTimingSafeDummyHash(): string {
    return TIMING_SAFE_DUMMY_HASH;
  }
}
