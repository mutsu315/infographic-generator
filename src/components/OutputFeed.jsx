import React, { useRef, useEffect, useState } from 'react'
import { ImageIcon, Code, AlertCircle, Download, DownloadCloud } from 'lucide-react'
import JSZip from 'jszip'

/** 画像URLまたはdata URLからblobを取得してダウンロード */
async function downloadImage(url, filename) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

async function downloadAllAsZip(results) {
  const images = results.filter(r => r.imageUrl && !r.error)
  const zip = new JSZip()

  for (let i = 0; i < images.length; i++) {
    const res = await fetch(images[i].imageUrl)
    const blob = await res.blob()
    zip.file(`illustration-${String(i + 1).padStart(2, '0')}.png`, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const blobUrl = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = 'illustrations.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

function ZipDownloadButton({ results }) {
  const [zipping, setZipping] = useState(false)

  const handleClick = async () => {
    setZipping(true)
    try {
      await downloadAllAsZip(results)
    } finally {
      setZipping(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={zipping}
      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
    >
      <DownloadCloud size={14} />
      {zipping ? 'ZIP作成中...' : 'ZIPでダウンロード'}
    </button>
  )
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
          <ZipDownloadButton results={results} />
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
                      onClick={() => downloadImage(item.imageUrl, `illustration-${item.index + 1}.png`)}
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
