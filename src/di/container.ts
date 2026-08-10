import 'reflect-metadata';

import { applicationContainer } from '@/di/containers/application.container';

/**
 * 分離されたDIコンテナアーキテクチャ
 *
 * Clean Architectureの層に基づいてコンテナを分離：
 * Core → Infrastructure → Domain → Application
 */

// レイヤー別コンテナを順次初期化（依存関係の順序に従って）
import '@/di/containers/core.container';
import '@/di/containers/domain.container';
import '@/di/containers/infrastructure.container';

/**
 * 最上位のアプリケーションコンテナをデフォルトコンテナとしてエクスポート
 * 全てのサービスにアクセス可能
 */
export const container = applicationContainer;

// resolve関数は別途 resolver.ts からimportしてください、ここでexportすると循環参照になります。
