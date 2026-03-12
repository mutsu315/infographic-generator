import React, { useState, useEffect, useRef } from 'react'
import { Settings, Key, Image, Ratio, Cpu, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { saveCharacterImage, getAllCharacterImages, deleteCharacterImage } from '../lib/storage'

const ASPECT_RATIOS = [
  { label: '16:9（横長）', value: '16:9' },
  { label: '1:1（正方形）', value: '1:1' },
  { label: '4:3（標準）', value: '4:3' },
  { label: '9:16（縦長）', value: '9:16' },
  { label: 'カスタム', value: 'custom' },
]

const PROVIDERS = [
  { label: 'Google (Gemini + Imagen)', value: 'google' },
  { label: 'OpenAI (GPT + DALL-E)', value: 'openai' },
]

const LLM_MODELS_BY_PROVIDER = {
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
  ],
  google: [
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
  ],
}

const IMAGE_MODELS_BY_PROVIDER = {
  openai: [
    { label: 'DALL-E 3', value: 'dall-e-3' },
    { label: 'DALL-E 2', value: 'dall-e-2' },
    { label: 'gpt-image-1', value: 'gpt-image-1' },
    { label: 'その他（カスタム）', value: '__custom__' },
  ],
  google: [
    { label: 'Nano Banana Pro（Gemini 3 Pro）', value: 'gemini-3-pro-image-preview' },
    { label: 'Nano Banana 2（Gemini 3.1 Flash）', value: 'gemini-3.1-flash-image-preview' },
    { label: 'Nano Banana（Gemini 2.5 Flash）', value: 'gemini-2.5-flash-image' },
    { label: 'Imagen 3', value: 'imagen-3.0-generate-002' },
    { label: 'Imagen 3 Fast', value: 'imagen-3.0-fast-generate-001' },
    { label: 'その他（カスタム）', value: '__custom__' },
  ],
}

export default function Sidebar({ config, onConfigChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const [characters, setCharacters] = useState([])
  const [customWidth, setCustomWidth] = useState('1920')
  const [customHeight, setCustomHeight] = useState('1080')
  const [customModelName, setCustomModelName] = useState('')
  const [modelSelectValue, setModelSelectValue] = useState(config.model || '')
  const fileInputRef = useRef(null)

  // キャラクター画像をIndexedDBから読み込み
  useEffect(() => {
    getAllCharacterImages().then(setCharacters).catch(console.error)
  }, [])

  // APIキーをそれぞれlocalStorageに保存
  useEffect(() => {
    if (config.googleApiKey) localStorage.setItem('ig-api-key-google', config.googleApiKey)
  }, [config.googleApiKey])
  useEffect(() => {
    if (config.openaiApiKey) localStorage.setItem('ig-api-key-openai', config.openaiApiKey)
  }, [config.openaiApiKey])

  // モデル・プロバイダー選択をlocalStorageに保存
  useEffect(() => {
    if (config.model) localStorage.setItem('ig-model', config.model)
  }, [config.model])
  useEffect(() => {
    if (config.llmModel) localStorage.setItem('ig-llm-model', config.llmModel)
  }, [config.llmModel])
  useEffect(() => {
    if (config.provider) localStorage.setItem('ig-provider', config.provider)
  }, [config.provider])

  // 初回ロード時にlocalStorageから設定を復元
  useEffect(() => {
    const savedProvider = localStorage.getItem('ig-provider') || config.provider
    const savedGoogleKey = localStorage.getItem('ig-api-key-google') || ''
    const savedOpenaiKey = localStorage.getItem('ig-api-key-openai') || ''
    const savedModel = localStorage.getItem('ig-model')
    const savedLlmModel = localStorage.getItem('ig-llm-model')
    onConfigChange({
      googleApiKey: savedGoogleKey,
      openaiApiKey: savedOpenaiKey,
      model: savedModel || config.model,
      llmModel: savedLlmModel || config.llmModel,
      provider: savedProvider,
    })
  }, [])

  // プロバイダー変更時にモデルをリセット
  const handleProviderChange = (newProvider) => {
    const firstImageModel = IMAGE_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || ''
    const firstLlmModel = LLM_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || ''
    setModelSelectValue(firstImageModel)
    setCustomModelName('')
    onConfigChange({ provider: newProvider, model: firstImageModel, llmModel: firstLlmModel })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const id = `char-${Date.now()}`
      const dataUrl = ev.target.result
      await saveCharacterImage(id, file.name, dataUrl)
      const updated = await getAllCharacterImages()
      setCharacters(updated)
      // アップロード直後に自動選択
      onConfigChange({ selectedCharacterId: id })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // キャラクターが1つだけあって未選択なら自動選択
  useEffect(() => {
    if (characters.length > 0 && !config.selectedCharacterId) {
      onConfigChange({ selectedCharacterId: characters[0].id })
    }
  }, [characters])

  const handleDeleteCharacter = async (id) => {
    await deleteCharacterImage(id)
    const updated = await getAllCharacterImages()
    setCharacters(updated)
  }

  const update = (key, value) => onConfigChange({ [key]: value })

  if (collapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-center pt-4 glass">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="設定を開く"
        >
          <ChevronRight size={18} />
        </button>
        <div className="mt-4">
          <Settings size={18} className="opacity-50" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 h-full flex flex-col glass overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-violet-400" />
          <span className="font-medium text-sm">設定</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Google APIキー */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Key size={14} />
            Google APIキー
            {config.provider === 'google' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">使用中</span>
            )}
          </label>
          <input
            type="password"
            value={config.googleApiKey}
            onChange={(e) => update('googleApiKey', e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
          />
        </section>

        {/* OpenAI APIキー */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Key size={14} />
            OpenAI APIキー
            {config.provider === 'openai' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">使用中</span>
            )}
          </label>
          <input
            type="password"
            value={config.openaiApiKey}
            onChange={(e) => update('openaiApiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
          />
          <p className="text-[10px] text-white/30 mt-1">両方のキーをブラウザに安全に保存できます</p>
        </section>

        {/* プロバイダー選択 */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Cpu size={14} />
            AIプロバイダー
          </label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition appearance-none cursor-pointer"
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value} className="bg-gray-900">{p.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-white/30 mt-1">
            上で入力済みの対応キーが自動で使われます
          </p>
        </section>

        {/* LLMモデル選択（プロンプト生成用） */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Cpu size={14} />
            LLMモデル（プロンプト生成）
          </label>
          <select
            value={config.llmModel}
            onChange={(e) => update('llmModel', e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition appearance-none cursor-pointer"
          >
            {(LLM_MODELS_BY_PROVIDER[config.provider] || []).map(m => (
              <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>
            ))}
          </select>
        </section>

        {/* 画像生成モデル選択 */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Cpu size={14} />
            画像生成モデル
          </label>
          <select
            value={modelSelectValue === '__custom__' ? '__custom__' : config.model}
            onChange={(e) => {
              const v = e.target.value
              setModelSelectValue(v)
              if (v !== '__custom__') {
                update('model', v)
                setCustomModelName('')
              }
            }}
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition appearance-none cursor-pointer"
          >
            {(IMAGE_MODELS_BY_PROVIDER[config.provider] || []).map(m => (
              <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>
            ))}
          </select>
          {modelSelectValue === '__custom__' && (
            <input
              type="text"
              value={customModelName}
              onChange={(e) => {
                setCustomModelName(e.target.value)
                update('model', e.target.value)
              }}
              placeholder="モデルIDを入力（例: nanobanana-pro-2）"
              className="w-full mt-2 px-3 py-2 rounded-lg glass-dark text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
            />
          )}
        </section>

        {/* アスペクト比 */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Ratio size={14} />
            アスペクト比
          </label>
          <select
            value={config.aspectRatio}
            onChange={(e) => update('aspectRatio', e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass-dark text-sm text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition appearance-none cursor-pointer"
          >
            {ASPECT_RATIOS.map(r => (
              <option key={r.value} value={r.value} className="bg-gray-900">{r.label}</option>
            ))}
          </select>

          {config.aspectRatio === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={customWidth}
                onChange={(e) => {
                  setCustomWidth(e.target.value)
                  update('customAspect', `${e.target.value}:${customHeight}`)
                }}
                className="w-20 px-2 py-1 rounded glass-dark text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                placeholder="幅"
              />
              <span className="text-white/40 text-sm">:</span>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => {
                  setCustomHeight(e.target.value)
                  update('customAspect', `${customWidth}:${e.target.value}`)
                }}
                className="w-20 px-2 py-1 rounded glass-dark text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                placeholder="高さ"
              />
            </div>
          )}
        </section>

        {/* キャラクター画像 */}
        <section>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-300 mb-2">
            <Image size={14} />
            キャラクター画像
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-violet-400/50 hover:bg-white/5 transition text-sm text-white/60 hover:text-violet-300"
          >
            <Upload size={14} />
            画像をアップロード
          </button>
          <p className="text-[10px] text-white/30 mt-1">IndexedDBに永続保存されます</p>

          {/* 保存済みキャラクター一覧 */}
          {characters.length > 0 && (
            <div className="mt-3 space-y-2">
              {characters.map((char) => {
                const isSelected = config.selectedCharacterId === char.id
                return (
                <div
                  key={char.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? 'ring-2 ring-green-400 bg-green-500/15'
                      : 'glass-dark hover:bg-white/5'
                  }`}
                  onClick={() => update('selectedCharacterId', isSelected ? null : char.id)}
                >
                  <img
                    src={char.dataUrl}
                    alt={char.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white/70 block truncate">{char.name}</span>
                    {isSelected && (
                      <span className="text-[10px] text-green-300">生成に使用中</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCharacter(char.id)
                    }}
                    className="p-1 rounded hover:bg-red-500/20 transition"
                    title="削除"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
