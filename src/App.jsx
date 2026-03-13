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
    selectedCharacterIds: [],
    characterRoles: {},
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
    let characterImageDataUrls = []
    const chars = await getAllCharacterImages()
    const selectedIds = config.selectedCharacterIds || []
    if (chars.length > 0 && selectedIds.length > 0) {
      const selectedChars = selectedIds.map(id => chars.find(c => c.id === id)).filter(Boolean)
      if (selectedChars.length > 0) {
        characterImageDataUrls = selectedChars.map(c => c.dataUrl)
        const roles = config.characterRoles || {}
        const roleDescriptions = selectedChars
          .map((c, i) => {
            const role = roles[c.id]?.trim()
            return role ? `- キャラクター${i + 1}（${c.name}）: ${role}` : `- キャラクター${i + 1}（${c.name}）`
          })
          .join('\n')
        const baseDesc = selectedChars.length === 1
          ? `添付のキャラクター画像を参照し、このキャラクターの外見的特徴を正確に読み取ってください。生成する各画像では、キャラクターの外見を維持したまま、スクリプトの文脈に合った自然な表情・ポーズで登場させてください。`
          : `添付の${selectedChars.length}枚のキャラクター画像をそれぞれ参照し、各キャラクターの外見的特徴を正確に読み取ってください。生成する各画像では、全キャラクターを登場させ、それぞれの外見を維持したまま描いてください。`
        const hasRoles = selectedChars.some(c => roles[c.id]?.trim())
        characterDescription = hasRoles
          ? `${baseDesc}\n\n【キャラクター役割】\n${roleDescriptions}\n\n各キャラクターを指定された役割に合ったポーズ・表情・配置で描いてください。`
          : baseDesc
      }
    }

    const aspectRatio = config.aspectRatio === 'custom'
      ? (config.customAspect || '16:9')
      : config.aspectRatio

    setIsGenerating(true)
    setResults([])
    setStatusMessage(characterImageDataUrls.length > 0
      ? `生成を開始しています...（キャラクター${characterImageDataUrls.length}体）`
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
        characterImageDataUrls,
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
