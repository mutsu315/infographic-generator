import React, { useState, useRef, useCallback } from 'react'
import { Play, Square, Sparkles } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ScriptInput from './components/ScriptInput'
import OutputFeed from './components/OutputFeed'
import { runPipeline } from './lib/engine'
import { getAllCharacterImages } from './lib/storage'

export default function App() {
  const [config, setConfig] = useState({
    googleApiKey: '',
    openaiApiKey: '',
    provider: 'google',
    llmModel: 'gemini-2.5-flash',
    model: 'gemini-3-pro-image-preview',
    aspectRatio: '16:9',
    customAspect: '',
    selectedCharacterId: null,
  })

  const [script, setScript] = useState('')
  const [results, setResults] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const abortControllerRef = useRef(null)

  const handleConfigChange = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  // 選択中プロバイダーのAPIキーを取得
  const activeApiKey = config.provider === 'google' ? config.googleApiKey : config.openaiApiKey

  const handleGenerate = async () => {
    if (!activeApiKey) {
      setStatusMessage(`${config.provider === 'google' ? 'Google' : 'OpenAI'} APIキーを入力してください`)
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }
    if (!script.trim()) {
      setStatusMessage('スクリプトを入力してください')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    // キャラクター情報を取得（画像データ含む）
    let characterDescription = ''
    let characterImageDataUrl = null
    const chars = await getAllCharacterImages()
    if (chars.length > 0) {
      // 選択中のキャラを探す。未選択なら最初のキャラをフォールバック使用
      const selected = chars.find((c) => c.id === config.selectedCharacterId) || chars[0]
      characterDescription = `添付のキャラクター画像（キャラクターシートの場合あり）を参照し、このキャラクターの外見的特徴を正確に読み取ってください。生成する各画像では、キャラクターの外見を維持したまま、スクリプトの文脈に合った自然な表情・ポーズで登場させてください。`
      characterImageDataUrl = selected.dataUrl
      console.log('[infographic] キャラクター画像使用:', selected.name, 'dataUrl length:', selected.dataUrl?.length)
    }

    const aspectRatio = config.aspectRatio === 'custom'
      ? (config.customAspect || '16:9')
      : config.aspectRatio

    setIsGenerating(true)
    setResults([])
    setStatusMessage(characterImageDataUrl
      ? '生成を開始しています...（キャラクター画像あり）'
      : '生成を開始しています...（キャラクター画像なし）'
    )

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await runPipeline({
        apiKey: activeApiKey,
        script,
        aspectRatio,
        model: config.model,
        llmModel: config.llmModel,
        provider: config.provider,
        characterDescription,
        characterImageDataUrl,
        abortController: controller,
        onProgress: (event) => {
          switch (event.type) {
            case 'start':
              setStatusMessage(`全 ${event.total} セクションの生成を開始...`)
              break
            case 'section-start':
              setStatusMessage(event.message)
              break
            case 'yaml-complete':
              // YAML完成、次の画像生成ステップに進む
              break
            case 'section-complete':
              setResults((prev) => [...prev, event.result])
              setStatusMessage(`セクション ${event.index + 1}/${event.total} 完了`)
              break
            case 'error':
              setResults((prev) => [...prev, { index: event.index, error: event.message }])
              break
            case 'stopped':
              setStatusMessage(`生成を停止しました（${event.completedCount} 枚生成済み）`)
              break
            case 'done':
              setStatusMessage(`全 ${event.results.length} 枚の生成が完了しました`)
              break
          }
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatusMessage(`エラー: ${err.message}`)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStatusMessage('停止中...')
    }
  }

  return (
    <div className="h-screen flex">
      {/* サイドバー */}
      <Sidebar config={config} onConfigChange={handleConfigChange} />

      {/* メインエリア */}
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
        {/* タイトル */}
        <header className="flex items-center gap-3">
          <Sparkles size={24} className="text-violet-400" />
          <h1 className="text-xl font-bold tracking-tight">
            イラスト生成システム
          </h1>
        </header>

        {/* コンテンツ: 上下分割 */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* スクリプト入力 */}
          <div className="glass p-4 flex-shrink-0" style={{ maxHeight: '35vh' }}>
            <ScriptInput script={script} onScriptChange={setScript} />
          </div>

          {/* 操作ボタン */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition btn-glow ${
                isGenerating
                  ? 'bg-violet-500/30 text-white/40 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              <Play size={16} />
              生成開始
            </button>

            {isGenerating && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-red-600 hover:bg-red-500 text-white transition btn-stop"
              >
                <Square size={16} />
                停止
              </button>
            )}

            {statusMessage && !isGenerating && (
              <span className="text-sm text-white/50">{statusMessage}</span>
            )}
          </div>

          {/* 出力フィード */}
          <div className="glass p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <OutputFeed
              results={results}
              statusMessage={isGenerating ? statusMessage : ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
