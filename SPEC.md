# イラスト生成システム — 仕様書

## 概要
スクリプトテキスト内の `[---IMAGE---]` タグ位置に、前後の文脈に合ったイラスト画像をAIで自動生成するWebアプリケーション。

## システム構成

### 技術スタック
- **フロントエンド**: React 19 + Vite 6
- **スタイリング**: Tailwind CSS v4（グラスモーフィズムUI）
- **永続化**: IndexedDB（キャラクター画像）、localStorage（設定）
- **デプロイ**: GitHub Pages（GitHub Actions CI/CD）

### 対応AIプロバイダー
| プロバイダー | LLMモデル | 画像生成モデル |
|---|---|---|
| Google | Gemini 2.5 Flash / Pro | Nano Banana Pro, Nano Banana 2, Nano Banana, Imagen 3, Imagen 3 Fast |
| OpenAI | GPT-4o, GPT-4o mini, GPT-4.1 | DALL-E 3, DALL-E 2, gpt-image-1 |

## 処理フロー

```
スクリプト入力 → [---IMAGE---]タグで分割 → 各セクションについて:
  1. 前後テキストの文脈を抽出
  2. LLMでYAML形式の画像プロンプトを生成（キャラ画像＋役割情報付き）
  3. YAMLをフラットなプロンプト文字列に変換
  4. 画像生成APIでイラストを生成
  5. 生成画像を表示
```

## YAMLプロンプト構造
```yaml
image_prompt_template:
  scene_description: "シーンの詳細な説明"
  visual_style: "ビジュアルスタイル"
  color_palette: ["#hex1", "#hex2", "#hex3"]
  text_overlay: "画像に含めるテキスト"
  character_appearance: "キャラクターの外見的特徴の詳細"
  character_pose_expression: "文脈に合ったポーズと表情"
  character_placement: "画面内でのキャラクターの位置とサイズ"
  layout: "レイアウト構成の説明"
  mood: "全体の雰囲気"
  aspect_ratio: "16:9"
```

## キャラクター機能
- 複数キャラクター画像をIndexedDBに永続保存
- 複数同時選択可能（クリックでトグル、最低1体は維持）
- 各キャラクターに個別の役割・指示を設定可能
- 役割情報はLLMプロンプトと画像生成プロンプトの両方に反映
- キャラクターシート（複数アングル）にも対応

## ダウンロード
- 各画像の個別ダウンロード（PNG）
- 全画像一括ダウンロード

## ファイル構成
```
infographic-generator/
├── index.html
├── package.json
├── vite.config.js          # base: '/infographic-generator/'
├── src/
│   ├── main.jsx
│   ├── index.css           # Tailwind + グラスモーフィズムCSS
│   ├── App.jsx             # メインコンポーネント・パイプライン制御
│   ├── components/
│   │   ├── Sidebar.jsx     # 設定パネル（API・モデル・アスペクト比・キャラ）
│   │   ├── ScriptInput.jsx # スクリプト入力（タグ挿入・枚数表示）
│   │   └── OutputFeed.jsx  # 結果表示（DL・一括DL）
│   └── lib/
│       ├── engine.js       # AI API連携（LLM + 画像生成）
│       └── storage.js      # IndexedDB操作
└── .github/workflows/
    └── deploy.yml          # GitHub Pages自動デプロイ
```

## API仕様

### runPipeline(options)
| パラメータ | 型 | 説明 |
|---|---|---|
| apiKey | string | APIキー |
| script | string | スクリプトテキスト |
| aspectRatio | string | アスペクト比 |
| model | string | 画像生成モデルID |
| llmModel | string | LLMモデルID |
| provider | string | 'google' or 'openai' |
| characterDescription | string | キャラクター指示テキスト |
| characterImageDataUrls | string[] | キャラクター画像のdata URL配列 |
| abortController | AbortController | 中断制御 |
| onProgress | function | 進捗コールバック |

### 進捗イベント
| type | 説明 |
|---|---|
| start | 生成開始（total: セクション数） |
| section-start | セクション処理開始（step: yaml/image） |
| yaml-complete | YAMLプロンプト生成完了 |
| section-complete | 画像生成完了 |
| error | エラー発生 |
| stopped | ユーザーによる中断 |
| done | 全セクション完了 |
