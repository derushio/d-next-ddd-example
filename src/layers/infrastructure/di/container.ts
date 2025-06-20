import 'reflect-metadata';

import { applicationContainer } from '@/layers/infrastructure/di/containers/application.container';

/**
 * 分離されたDIコンテナアーキテクチャ
 *
 * Clean Architectureの層に基づいてコンテナを分離：
 * Core → Infrastructure → Domain → Application
 */

// レイヤー別コンテナを順次初期化（依存関係の順序に従って）
import '@/layers/infrastructure/di/containers/core.container';
import '@/layers/infrastructure/di/containers/domain.container';
import '@/layers/infrastructure/di/containers/infrastructure.container';

/**
 * 最上位のアプリケーションコンテナをデフォルトコンテナとしてエクスポート
 * 全てのサービスにアクセス可能
 */
export const container = applicationContainer;

// resolve関数は resolver.ts で定義されています
export { resolve } from '@/layers/infrastructure/di/resolver';
