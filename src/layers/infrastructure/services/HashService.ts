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
}
