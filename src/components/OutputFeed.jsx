import React, { useRef, useEffect } from 'react'
import { ImageIcon, Code, AlertCircle, Download, DownloadCloud } from 'lucide-react'

/** 画像URLまたはdata URLからblobを取得してダウンロード */
async function downloadImage(url, filename) {
  try {
    let blob
    if (url.startsWith('data:')) {
      const res = await fetch(url)
      blob = await res.blob()
    } else {
      const res = await fetch(url)
      blob = await res.blob()
    }
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    // フォールバック: 新しいタブで開く
    window.open(url, '_blank')
  }
}

/** 一括ダウンロード（1枚ずつ少し間隔を空けて） */
async function downloadAll(results) {
  const images = results.filter(r => r.imageUrl && !r.error)
  for (let i = 0; i < images.length; i++) {
    await downloadImage(images[i].imageUrl, `infographic-${images[i].index + 1}.png`)
    if (i < images.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

export default function OutputFeed({ results, statusMessage }) {
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [results, statusMessage])

  const successResults = results.filter(r => r.imageUrl && !r.error)

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
    <div className="flex-1 flex flex-col min-h-0">
      {/* 一括ダウンロードバー */}
      {successResults.length > 0 && !statusMessage && (
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <span className="text-xs text-white/40">{successResults.length} 枚の画像を生成済み</span>
          <button
            onClick={() => downloadAll(results)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            <DownloadCloud size={14} />
            すべてダウンロード
          </button>
        </div>
      )}

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
                    <button
                      onClick={() => downloadImage(item.imageUrl, `infographic-${item.index + 1}.png`)}
                      className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
                      title="ダウンロード"
                    >
                      <Download size={13} />
                      保存
                    </button>
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
    </div>
  )
}
