import React, { useRef } from 'react'
import { FileText, ImagePlus } from 'lucide-react'

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
  const textareaRef = useRef(null)
  const tagCount = (script.match(/\[---?IMAGE---?\]/gi) || []).length

  const insertImageTag = () => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const tag = '\n\n[---IMAGE---]\n\n'
    const newScript = script.slice(0, start) + tag + script.slice(end)
    onScriptChange(newScript)

    // カーソルをタグ直後に移動
    requestAnimationFrame(() => {
      const pos = start + tag.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <FileText size={16} />
          スクリプト入力
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={insertImageTag}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition"
            title="カーソル位置に [---IMAGE---] タグを挿入"
          >
            <ImagePlus size={13} />
            画像タグ挿入
          </button>
          {tagCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
              画像 {tagCount} 枚生成予定
            </span>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={script}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder={EXAMPLE_SCRIPT}
        className="flex-1 w-full p-4 rounded-xl glass-dark text-sm text-white/90 leading-relaxed placeholder-white/20 min-h-[200px] font-mono"
        spellCheck={false}
      />
    </div>
  )
}
