import React from 'react'
import { FileText } from 'lucide-react'

const EXAMPLE_SCRIPT = `ここにスクリプトのテキストを入力してください。
画像を生成したい箇所に [---IMAGE---] タグを挿入します。

例:
今日のテーマは「AIの進化」についてです。
まずは歴史を振り返りましょう。

[---IMAGE---]

1950年代にアラン・チューリングが「機械は考えることができるか？」と問いかけました。
これがAI研究の出発点となりました。

[---IMAGE---]

2020年代に入り、大規模言語モデルが登場し、
AIは新たなフェーズに突入しました。

[---IMAGE---]`

export default function ScriptInput({ script, onScriptChange }) {
  // [---IMAGE---] タグの数をカウント
  const tagCount = (script.match(/\[---?IMAGE---?\]/gi) || []).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <FileText size={16} />
          スクリプト入力
        </label>
        {tagCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
            画像 {tagCount} 枚生成予定
          </span>
        )}
      </div>
      <textarea
        value={script}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder={EXAMPLE_SCRIPT}
        className="flex-1 w-full p-4 rounded-xl glass-dark text-sm text-white/90 leading-relaxed placeholder-white/20 min-h-[200px] font-mono"
        spellCheck={false}
      />
    </div>
  )
}
