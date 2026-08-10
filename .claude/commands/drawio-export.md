# draw.io ファイルを画像にエクスポート

## 説明

draw.io (.drawio) ファイルをPNG画像にエクスポートします。

## 使い方

引数として .drawio ファイルのパスを指定してください。

例: `/drawio-export docs/diagrams/page-flow.drawio`

PNG は入力ファイルと同じディレクトリに出力されます。`_DOCS/` は不可侵（読み取り専用）のため、
`.drawio` は `_DOCS/` の外に置いてください。

## 実行内容

以下のコマンドを実行してください:

```bash
# 引数で指定されたファイル: $ARGUMENTS
# 出力先: 同じディレクトリに .png として出力

INPUT_FILE="$ARGUMENTS"

if [ -z "$INPUT_FILE" ]; then
  echo "使い方: /drawio-export <.drawioファイルパス>"
  echo "例: /drawio-export docs/diagrams/page-flow.drawio"
  exit 1
fi

# PNG は入力と同じディレクトリに出力されるため、_DOCS/ 配下の入力は書き込みを引き起こす
case "$INPUT_FILE" in
  _DOCS/* | */_DOCS/*)
    echo "エラー: _DOCS/ は不可侵領域（読み取り専用）です。.drawio を _DOCS/ の外へ移してから実行してください"
    exit 1
    ;;
esac

if [ ! -f "$INPUT_FILE" ]; then
  echo "エラー: ファイルが見つかりません: $INPUT_FILE"
  exit 1
fi

# 出力ファイル名を生成（.drawio → .png）
OUTPUT_FILE="${INPUT_FILE%.drawio}.png"

# drawioコマンドでエクスポート
drawio --export --format png --scale 2 --border 10 --output "$OUTPUT_FILE" "$INPUT_FILE"

if [ $? -eq 0 ]; then
  echo "エクスポート完了: $OUTPUT_FILE"
else
  echo "エクスポートに失敗しました"
  exit 1
fi
```

## オプション

- `--scale 2`: 高解像度出力（2倍）
- `--border 10`: 余白10px
- `--format png`: PNG形式で出力

## 補足

- 複数ページがある場合は最初のページがエクスポートされます
- 全ページをエクスポートする場合は `--all-pages` オプションを使用してください（PDF形式のみ）
