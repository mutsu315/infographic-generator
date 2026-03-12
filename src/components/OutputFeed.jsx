import React, { useRef, useEffect } from 'react'
import { ImageIcon, Code, AlertCircle, Download } from 'lucide-react'

export default function OutputFeed({ results, statusMessage }) {
  const feedRef = useRef(null)

  // 新しい結果が追加されたら自動スクロール
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [results, statusMessage])

  if (results.length === 0 && !statusMessage) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20">
        <div className="text-center">
          <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">生成された画像がここに表示されます</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={feedRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
      {results.map((item, i) => (
        <div
          key={i}
          className="glass-dark p-4 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
              セクション {item.index + 1}
            </span>
            {item.error && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1">
                <AlertCircle size={10} />
                エラー
              </span>
            )}
          </div>

          {item.error ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">{item.error}</p>
            </div>
          ) : (
            <>
              {/* 生成画像 */}
              {item.imageUrl && (
                <div className="mb-3 relative group">
                  <img
                    src={item.imageUrl}
                    alt={`生成画像 ${item.index + 1}`}
                    className="w-full rounded-lg"
                    loading="lazy"
                  />
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`infographic-${item.index + 1}.png`}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
                    title="ダウンロード"
                  >
                    <Download size={14} />
                  </a>
                </div>
              )}

              {/* YAMLプロンプト */}
              {item.yamlPrompt && (
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs text-white/40 cursor-pointer hover:text-white/60 transition">
                    <Code size={12} />
                    YAMLプロンプトを表示
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-black/30 text-xs text-white/60 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                    {item.yamlPrompt}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      ))}

      {/* ステータスメッセージ */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 animate-fade-in-up">
          <div className="w-2 h-2 rounded-full bg-violet-400 pulse-dot" />
          <span className="text-sm text-violet-300">{statusMessage}</span>
        </div>
      )}
    </div>
  )
}
