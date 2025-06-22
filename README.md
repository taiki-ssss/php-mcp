--dangerously-skip-permissions

```
php-parser/
  ├── core/
  │   ├── ast.ts          # AST ノード定義
  │   ├── token.ts        # トークン定義
  │   └── location.ts     # 位置情報
  ├── lexer/
  │   ├── scanner.ts      # 文字列スキャナー
  │   ├── tokenizer.ts    # トークン化
  │   └── state.ts        # レクサー状態管理
  ├── parser/
  │   ├── expression.ts   # 式パーサー
  │   ├── statement.ts    # 文パーサー
  │   └── declaration.ts  # 宣言パーサー
  ├── analyzer/
  │   ├── walker.ts       # AST ウォーカー
  │   ├── visitor.ts      # Visitor パターン
  │   └── transformer.ts  # AST 変換
  └── index.ts           # 公開 API
```


```
npx tsc 2>&1 | grep "src/lib/php-parser" | head -30
```