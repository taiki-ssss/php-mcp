# ディレクトリ構造 FAQ

## よくある質問

### Q: なぜentitiesとfeatures/typesを分けるの？

**A**: 責務を明確に分離するためです。

- **entities** = PHPの普遍的な概念（どのツールでも使う）
- **features/types** = 各ツール固有のI/O（そのツールだけ）

例えば、`PhpSymbol`はどのツールでも「PHPのシンボル」として扱いますが、`RenameSymbolRequest`は「rename-symbolツールへの入力」としてのみ意味を持ちます。

### Q: features/typesに共通の型があったら？

**A**: 本当に共通なら、entitiesに移動を検討します。

ただし、以下の場合は各featureに重複して定義してOK：
- 微妙に違う（フィールドが異なる）
- 将来的に分岐する可能性がある
- 2-3個のfeatureでしか使わない

「早すぎる抽象化」より「適切な重複」を選びます。

### Q: なぜfeature内にさらにディレクトリを作らないの？

**A**: YAGNIの原則です。

```
❌ 過度に複雑
features/rename-symbol/
├── api/
│   └── tool.ts
├── lib/
│   └── rename.ts
└── model/
    └── types.ts

✅ シンプル
features/rename-symbol/
├── tool.ts
├── rename-symbol.ts
└── types.ts
```

4ファイルなら、フラットで十分管理できます。

### Q: shared/lib/php-analyzerは何をする？

**A**: 複数のfeatureで使う共通のPHP解析機能です。

- `symbol-table.ts` - シンボルの管理
- `scope-analyzer.ts` - スコープ解析
- `project-scanner.ts` - プロジェクト全体のスキャン

これらは「どのツールでも必要」なので、sharedに配置します。

### Q: 新しいentityはいつ追加する？

**A**: PHPの新しい概念を扱う必要が出たときです。

現在の想定：
- `symbol` - 変数、関数、クラスなど
- `project` - プロジェクト全体の情報

将来追加される可能性：
- `namespace` - 名前空間の詳細管理が必要になったら
- `trait` - トレイトの特殊な扱いが必要になったら

### Q: featureが大きくなったらどうする？

**A**: その時に分割を検討します。

目安：
- 1ファイルが300行を超えたら → ヘルパー関数を別ファイルに
- ロジックが複雑になったら → サブモジュールに分割
- 複数のfeatureで使うなら → shared/libに移動

### Q: テストファイルはどこに置く？

**A**: 2つの選択肢があります。

1. **別ディレクトリ** （推奨）
```
tests/
├── features/
│   ├── rename-symbol/
│   └── find-references/
└── integration/
```

2. **同じディレクトリ**
```
features/rename-symbol/
├── rename-symbol.ts
├── rename-symbol.test.ts  // 同じ場所
└── ...
```

プロジェクトの慣習に従ってください。

### Q: import文の順序は？

**A**: 以下の順序を推奨：

```typescript
// 1. 外部ライブラリ
import { z } from 'zod';

// 2. 内部モジュール（遠い順）
import { PhpSymbol } from '@entities/symbol';
import { parsePhp } from '@lib/php-parser';

// 3. 同一feature内
import { RenameSymbolRequest } from './types';
```

### Q: なぜこんなにシンプルなの？

**A**: 複雑さは必要になってから追加すべきだからです。

- 最初からシンプル = 理解しやすい、始めやすい
- 必要に応じて成長 = 無駄な複雑さを避ける
- 一貫性を保つ = どのfeatureも同じ構造

Kent C. Doddsの言葉：
> "AHA Programming: Avoid Hasty Abstractions"
> 「性急な抽象化を避けよ」