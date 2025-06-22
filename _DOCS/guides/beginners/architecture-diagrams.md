# 🎨 アーキテクチャ図解：ビジュアルで理解するモダンアーキテクチャ

**図解でスッキリ理解！** Clean Architecture + DDD の構造と流れを視覚的に解説します。

---

## 🏗️ 全体アーキテクチャ：4層構造の理解

### 従来のReact開発 vs モダンアーキテクチャ

```mermaid
graph TB
    subgraph "🔴 従来のReact開発"
        A1[Component A]
        A2[Component B] 
        A3[Component C]
        DB1[(Database)]
        API1[External API]
        
        A1 --> DB1
        A1 --> API1
        A2 --> DB1
        A2 --> API1
        A3 --> DB1
        A3 --> API1
    end
    
    subgraph "🟢 モダンアーキテクチャ（Clean Architecture）"
        subgraph "📱 Presentation Layer"
            P1[Server Component]
            P2[Client Component]
            P3[Server Action]
        end
        
        subgraph "📋 Application Layer"
            U1[UseCase A]
            U2[UseCase B]
            U3[UseCase C]
        end
        
        subgraph "🧠 Domain Layer"
            E1[Entity]
            E2[Value Object]
            E3[Domain Service]
        end
        
        subgraph "🗄️ Infrastructure Layer"
            R1[Repository]
            R2[External Service]
            DB2[(Database)]
            API2[External API]
        end
        
        P1 --> U1
        P2 --> U2
        P3 --> U3
        U1 --> E1
        U2 --> E2
        U3 --> E3
        U1 --> R1
        U2 --> R1
        U3 --> R2
        R1 --> DB2
        R2 --> API2
    end
```

**比較ポイント：**

- **従来**: 各コンポーネントが直接データベースやAPIにアクセス → 複雑化・重複・テスト困難
- **モダン**: 責務が明確に分離 → 保守性・テスタビリティ・再利用性の向上

---

## 🔄 データフロー：リクエストから表示まで

### ユーザー登録機能の例

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant Page as 📱 Server Component
    participant Action as 🔄 Server Action
    participant UseCase as 📋 UseCase
    participant Entity as 🧠 Entity
    participant Repo as 🗄️ Repository
    participant DB as 💾 Database

    User->>Page: 1. ページアクセス
    Page->>User: 2. フォーム表示

    User->>Action: 3. フォーム送信
    Action->>UseCase: 4. ユーザー登録要求
    UseCase->>Entity: 5. Userエンティティ作成
    Entity->>Entity: 6. バリデーション実行
    UseCase->>Repo: 7. ユーザー保存要求
    Repo->>DB: 8. データベース保存
    DB->>Repo: 9. 保存完了
    Repo->>UseCase: 10. 保存結果返却
    UseCase->>Action: 11. Result型で結果返却
    Action->>Page: 12. ページリダイレクト
    Page->>User: 13. 成功画面表示
```

**各ステップの責務：**

1. **Server Component**: 画面表示
2. **Server Action**: フォーム処理・バリデーション
3. **UseCase**: ビジネスフロー制御
4. **Entity**: ビジネスルール適用
5. **Repository**: データ永続化

---

## 📁 ディレクトリ構造とファイル配置

### ファイル配置の全体像

```mermaid
graph TD
    subgraph "src/"
        subgraph "🌐 app/ (Next.js App Router)"
            App1["products/page.tsx"]
            App2["products/[id]/page.tsx"]
            App3["api/products/route.ts"]
        end
        
        subgraph "🎨 components/ (UI Components)"
            Comp1[ProductCard.tsx]
            Comp2[ProductForm.tsx]
            Comp3[ui/Button.tsx]
        end
        
        subgraph "🔄 actions/ (Server Actions)"
            Act1[product-actions.ts]
            Act2[user-actions.ts]
        end
        
        subgraph "🏗️ layers/ (Clean Architecture)"
            subgraph "📋 application/"
                AppUC[usecases/CreateProductUseCase.ts]
                AppDTO[dtos/CreateProductRequest.ts]
            end
            
            subgraph "🧠 domain/"
                DomEntity[entities/Product.ts]
                DomRepo[repositories/IProductRepository.ts]
            end
            
            subgraph "🗄️ infrastructure/"
                InfraRepo[repositories/ProductRepository.ts]
                InfraDI[di/container.ts]
            end
        end
    end
```

### 新機能追加時の作業フロー

```mermaid
flowchart TD
    Start([新機能「商品検索」を追加]) --> Step1
    
    Step1[🧠 1. Domain Layer<br>Product.ts<br>IProductRepository.ts] --> Step2
    Step2[🗄️ 2. Infrastructure Layer<br>ProductRepository.ts] --> Step3
    Step3[📋 3. Application Layer<br>SearchProductsUseCase.ts] --> Step4
    Step4[🔄 4. Server Action<br>search-products-action.ts] --> Step5
    Step5[🎨 5. UI Components<br>SearchForm.tsx] --> Step6
    Step6[📱 6. Page Component<br>products/search/page.tsx] --> Step7
    Step7[🧪 7. Tests<br>各層のテスト作成] --> End([完成！])
    
    style Step1 fill:#ff9999
    style Step2 fill:#99ccff
    style Step3 fill:#99ff99
    style Step4 fill:#ffcc99
    style Step5 fill:#cc99ff
    style Step6 fill:#ffff99
    style Step7 fill:#99ffcc
```

---

## 💉 依存性注入（DI）：サービスの取得と管理

### DIコンテナの仕組み

```mermaid
graph TB
    subgraph "🏭 DI Container（サービス工場）"
        Container{DIコンテナ}
        Reg1[UserService登録]
        Reg2[ProductService登録]
        Reg3[Logger登録]
        
        Container --> Reg1
        Container --> Reg2
        Container --> Reg3
    end
    
    subgraph "🎯 Service Resolution（サービス取得）"
        Resolve1["resolve UserService"]
        Resolve2["resolve ProductService"]
        Resolve3["resolve Logger"]
    end
    
    subgraph "📋 UseCase での使用"
        UC1[CreateUserUseCase]
        UC2[SearchProductsUseCase]
        UC3[LoggingService]
    end
    
    Resolve1 --> UC1
    Resolve2 --> UC2
    Resolve3 --> UC3
    
    Container -.-> Resolve1
    Container -.-> Resolve2
    Container -.-> Resolve3
```

### プロジェクト構造での DI 設定

```mermaid
graph LR
    subgraph "DI設定ファイル"
        C1[application/di/container.ts]
        C2[infrastructure/di/container.ts]
        C3[diContainer.ts]
    end
    
    subgraph "使用場所"
        U1[Server Actions]
        U2[Server Components]
        U3[UseCase Classes]
    end
    
    C1 --> U1
    C2 --> U2
    C3 --> U3
    
    C1 -.->|Application Services| C3
    C2 -.->|Infrastructure Services| C3
```

**設定例：**

```typescript
// infrastructure/di/container.ts
container.register('UserRepository', UserRepository);
container.register('Logger', ConsoleLogger);

// application/di/container.ts  
container.register('CreateUserUseCase', CreateUserUseCase);

// 使用時
const userRepository = resolve('UserRepository');
const createUserUseCase = resolve('CreateUserUseCase');
```

---

## 🎯 Result型パターン：エラーハンドリングの流れ

### Success/Failure の分岐処理

```mermaid
graph TD
    Start[UseCase実行] --> Try{処理実行}
    
    Try -->|成功| Success[success(data)]
    Try -->|バリデーションエラー| ValidationError[failure(message, 'VALIDATION_ERROR')]
    Try -->|ビジネスルールエラー| BusinessError[failure(message, 'BUSINESS_ERROR')]
    Try -->|インフラエラー| InfraError[failure(message, 'INFRASTRUCTURE_ERROR')]
    
    Success --> Return[Result型を返却]
    ValidationError --> Return
    BusinessError --> Return
    InfraError --> Return
    
    Return --> Check{isSuccess(result)?}
    Check -->|true| SuccessPath[result.dataで値取得<br>成功処理実行]
    Check -->|false| ErrorPath[result.errorでエラー取得<br>エラー処理実行]
    
    style Success fill:#90EE90
    style ValidationError fill:#FFB6C1
    style BusinessError fill:#FFB6C1
    style InfraError fill:#FFB6C1
    style SuccessPath fill:#90EE90
    style ErrorPath fill:#FFB6C1
```

### 実装例での比較

```mermaid
graph LR
    subgraph "🔴 従来のtry-catch"
        T1[try実行] --> T2{エラー?}
        T2 -->|Yes| T3[catch実行]
        T2 -->|No| T4[成功処理]
        T3 --> T5[throw Error]
        T5 --> T6[呼び出し元でまたtry-catch...]
    end
    
    subgraph "🟢 Result型パターン"
        R1[UseCase実行] --> R2{エラー?}
        R2 -->|Yes| R3[failure()返却]
        R2 -->|No| R4[success()返却]
        R3 --> R5[Result型]
        R4 --> R5
        R5 --> R6[isSuccess/isFailureで分岐]
    end
```

---

## 🧪 テスト戦略：レイヤー別のテスト範囲

### テストピラミッド

```mermaid
graph TD
    subgraph "🏔️ テストピラミッド"
        subgraph "🌐 E2E Tests（少数・重要フロー）"
            E2E1[ユーザー登録フロー]
            E2E2[商品購入フロー]
        end
        
        subgraph "🔗 Integration Tests（中程度・レイヤー間）"
            INT1[UseCase + Repository]
            INT2[Server Action + UseCase]
            INT3[API Route + Database]
        end
        
        subgraph "🧪 Unit Tests（多数・各層）"
            UNIT1[Entity Tests]
            UNIT2[Value Object Tests]
            UNIT3[UseCase Tests]
            UNIT4[Repository Tests]
        end
    end
```

### 各層でのテスト内容

```mermaid
graph TB
    subgraph "📱 Presentation Layer"
        P_Test[E2Eテスト<br>- UI表示<br>- ユーザー操作<br>- フォーム送信]
    end
    
    subgraph "📋 Application Layer"
        A_Test[Unit/Integrationテスト<br>- UseCase実行<br>- ビジネスフロー<br>- エラーハンドリング]
    end
    
    subgraph "🧠 Domain Layer"
        D_Test[Unit テスト<br>- エンティティ不変条件<br>- ビジネスルール<br>- バリデーション]
    end
    
    subgraph "🗄️ Infrastructure Layer"
        I_Test[Unit/Integrationテスト<br>- データアクセス<br>- 外部API連携<br>- モック/実データ]
    end
```

### モック戦略

```mermaid
graph LR
    subgraph "🎭 Mock Strategy"
        M1[vitest-mock-extended] --> M2[自動型生成]
        M2 --> M3[MockProxy型]
        M3 --> M4[型安全なモック設定]
    end
    
    subgraph "📋 UseCase Test"
        UC[CreateUserUseCase] --> Mock1[MockUserRepository]
        UC --> Mock2[MockLogger]
        UC --> Mock3[MockHashService]
    end
    
    M4 --> Mock1
    M4 --> Mock2
    M4 --> Mock3
```

---

## 🚀 Server Components vs Client Components

### 使い分けフローチャート

```mermaid
flowchart TD
    Start[コンポーネントを作成したい] --> Question1{データ取得が必要?}
    
    Question1 -->|Yes| Question2{ユーザーインタラクションも必要?}
    Question1 -->|No| Question3{useState/useEffectが必要?}
    
    Question2 -->|Yes| Hybrid[🔄 ハイブリッドパターン<br>Server Component（データ取得）<br>+ Client Component（インタラクション）]
    Question2 -->|No| Server[📡 Server Component<br>async/await でデータ取得]
    
    Question3 -->|Yes| Client[💻 Client Component<br>'use client' 必須]
    Question3 -->|No| Server
    
    style Server fill:#90EE90
    style Client fill:#87CEEB
    style Hybrid fill:#DDA0DD
```

### 実際の使用例

```mermaid
graph TB
    subgraph "📡 Server Component 例"
        SC1["🏠 商品一覧ページ<br>- データ取得メイン<br>- SEO重要<br>- 初期表示最優先"]
        SC2["👤 ユーザープロフィール表示<br>- 静的な情報表示<br>- インタラクション不要"]
    end
    
    subgraph "💻 Client Component 例"
        CC1["🔍 検索フォーム<br>- リアルタイム入力<br>- useState必須"]
        CC2["📝 編集フォーム<br>- 動的バリデーション<br>- ユーザー操作重要"]
    end
    
    subgraph "🔄 ハイブリッド例"
        HC1["📱 商品詳細ページ<br>Server: 商品データ取得<br>Client: カート追加ボタン"]
        HC2["📊 ダッシュボード<br>Server: 統計データ取得<br>Client: グラフ表示・操作"]
    end
```

---

## 🎓 学習パス：段階的な理解

### 推奨学習順序

```mermaid
graph TD
    Week1[Week 1: 基礎理解] --> Week2[Week 2: 実装体験]
    Week2 --> Week3[Week 3: テスト実装]
    Week3 --> Week4[Week 4: 実践応用]
    
    subgraph "Week 1: 基礎理解"
        W1_1[📚 アーキテクチャ概念]
        W1_2[🔄 Server/Client Components]
        W1_3[💉 DI の理解]
        W1_4[🎯 Result型パターン]
    end
    
    subgraph "Week 2: 実装体験"
        W2_1[👀 既存コード読解]
        W2_2[🛠️ 簡単な機能実装]
        W2_3[🔧 UseCase作成体験]
        W2_4[📝 Entity/Value Object作成]
    end
    
    subgraph "Week 3: テスト実装"
        W3_1[🧪 Unit Test作成]
        W3_2[🎭 Mock活用]
        W3_3[🔗 Integration Test]
        W3_4[🌐 E2E Test]
    end
    
    subgraph "Week 4: 実践応用"
        W4_1[🚀 新機能フル実装]
        W4_2[♻️ リファクタリング]
        W4_3[📈 パフォーマンス最適化]
        W4_4[🎯 ベストプラクティス適用]
    end
```

---

## 📊 パフォーマンス比較：従来 vs モダン

### 開発効率の改善

```mermaid
gantt
    title 開発効率比較（機能追加時）
    dateFormat X
    axisFormat %s

    section 従来のReact開発
    要件理解           :0, 1
    設計・アーキテクチャ検討 :1, 3
    実装               :3, 8
    テスト作成         :8, 12
    バグ修正           :12, 16
    
    section モダンアーキテクチャ
    要件理解           :0, 1
    設計（パターン適用） :1, 2
    実装（レイヤー分離） :2, 6
    テスト作成（自動モック） :6, 8
    バグ修正（影響範囲明確） :8, 9
```

### 保守性の向上

```mermaid
graph LR
    subgraph "🔴 従来の問題"
        Legacy1[機能追加時の影響不明] --> Legacy2[テスト困難]
        Legacy2 --> Legacy3[バグ発生リスク高]
        Legacy3 --> Legacy4[保守コスト増大]
    end
    
    subgraph "🟢 モダンアーキテクチャ"
        Modern1[責務分離で影響範囲明確] --> Modern2[レイヤー別テスト]
        Modern2 --> Modern3[バグ早期発見]
        Modern3 --> Modern4[保守コスト削減]
    end
```

---

## 🎯 まとめ：アーキテクチャの価値

### 短期 vs 長期の比較

```mermaid
graph TB
    subgraph "📊 開発コスト比較"
        Timeline[時間軸] --> Short[短期（1-3ヶ月）]
        Timeline --> Medium[中期（6ヶ月-1年）]
        Timeline --> Long[長期（1年以上）]
        
        Short --> ShortLegacy[従来: 低コスト]
        Short --> ShortModern[モダン: 高コスト]
        
        Medium --> MediumLegacy[従来: 増加傾向]
        Medium --> MediumModern[モダン: 安定]
        
        Long --> LongLegacy[従来: 急増]
        Long --> LongModern[モダン: 低コスト]
    end
    
    style ShortLegacy fill:#90EE90
    style ShortModern fill:#FFB6C1
    style MediumLegacy fill:#FFFF99
    style MediumModern fill:#90EE90
    style LongLegacy fill:#FFB6C1
    style LongModern fill:#90EE90
```

**結論：**

- **初期コスト**: 学習コストがかかるが...
- **中長期**: 圧倒的な開発効率・品質向上
- **チーム開発**: スケールする開発体制
- **保守性**: 持続可能な成長

---

**🌟 図解で理解できましたか？次は実際に手を動かしてみましょう！**

**→ [簡単なチュートリアル](./simple-tutorial.md)** で実践体験 🚀
