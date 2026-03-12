/**
 * インフォグラフィック生成エンジン
 *
 * [---IMAGE---] タグでスクリプトを分割し、
 * 各セクションに対して構造化YAMLプロンプトを生成 → 画像生成APIに送信する。
 *
 * 対応プロバイダー: OpenAI / Google (Gemini + Imagen)
 */

// ── パーサー ──────────────────────────────────────────────

export function parseScript(text) {
  const TAG = /\[---?IMAGE---?\]/gi
  const parts = text.split(TAG)
  const sections = []

  for (let i = 0; i < parts.length - 1; i++) {
    const before = parts[i].trim()
    const after = (parts[i + 1] || '').trim()
    if (before || after) {
      sections.push({
        index: i,
        contextBefore: before.slice(-500),
        contextAfter: after.slice(0, 500),
      })
    }
  }

  return sections
}

// ── YAMLプロンプト生成 ───────────────────────────────────

function buildYamlPromptRequest(section, characterDescription, aspectRatio) {
  const characterBlock = characterDescription
    ? `
重要 - キャラクター指示:
- 添付されたキャラクター画像（キャラクターシートの場合あり）からキャラクターの外見的特徴（髪型、髪色、目の色、服装、体型、特徴的なアクセサリー等）を正確に読み取ってください。
- character_appearance にキャラクターの外見を詳細に記述してください（画像生成モデルが参照画像なしでも再現できるレベルで）。
- character_pose_expression には、スクリプトの文脈に合った表情とポーズを指定してください。同じポーズの使い回しは避けてください。
  例: 驚いている場面→目を見開いて口を開けた表情、解説場面→人差し指を立てて説明するポーズ、困っている場面→腕を組んで困り顔
- キャラクターの画風（アニメ調、リアル調等）もcharacter_appearanceに含めてください。`
    : ''

  const systemPrompt = `あなたはインフォグラフィック画像のプロンプト設計の専門家です。
与えられたスクリプトのコンテキストから、視覚的に魅力的なインフォグラフィック画像を生成するためのプロンプトをYAML形式で出力してください。

出力フォーマット（YAML）:
\`\`\`yaml
image_prompt_template:
  scene_description: "シーンの詳細な説明"
  visual_style: "ビジュアルスタイル（例: フラットデザイン、3Dイラスト等）"
  color_palette: ["#hex1", "#hex2", "#hex3"]
  text_overlay: "画像に含めるテキスト（あれば）"
  character_appearance: "キャラクターの外見的特徴の詳細（髪型、髪色、服装、画風など）"
  character_pose_expression: "文脈に合ったポーズと表情の具体的な指示"
  character_placement: "画面内でのキャラクターの位置とサイズ"
  layout: "レイアウト構成の説明"
  mood: "全体の雰囲気"
  aspect_ratio: "${aspectRatio}"
\`\`\`

注意事項:
- インフォグラフィックとして情報が伝わるデザインを心がけてください
- アスペクト比 ${aspectRatio} に最適化されたレイアウトにしてください${characterBlock}`

  const userMessage = `以下のスクリプトコンテキストに基づいて、インフォグラフィック画像のYAMLプロンプトを生成してください。

【直前のテキスト】
${section.contextBefore || '（なし）'}

【直後のテキスト】
${section.contextAfter || '（なし）'}

${characterDescription ? `【キャラクター情報】\n${characterDescription}\n※添付画像がキャラクターの参照画像です。外見的特徴を読み取ってYAMLに反映してください。` : ''}

YAMLプロンプトのみを出力してください。`

  return { systemPrompt, userMessage }
}

function yamlToImagePrompt(yamlText) {
  const lines = yamlText.split('\n')
  const fields = {}
  let currentKey = null

  for (const line of lines) {
    const match = line.match(/^\s*(\w+):\s*"?(.+?)"?\s*$/)
    if (match) {
      currentKey = match[1]
      fields[currentKey] = match[2]
    } else if (line.match(/^\s*-\s*"?(.+?)"?\s*$/)) {
      if (!fields[currentKey + '_list']) fields[currentKey + '_list'] = []
      fields[currentKey + '_list'].push(line.match(/^\s*-\s*"?(.+?)"?\s*$/)[1])
    }
  }

  const parts = []
  if (fields.scene_description) parts.push(fields.scene_description)
  if (fields.visual_style) parts.push(`Style: ${fields.visual_style}`)
  if (fields.character_appearance) parts.push(`Character appearance: ${fields.character_appearance}`)
  if (fields.character_pose_expression) parts.push(`Pose and expression: ${fields.character_pose_expression}`)
  if (fields.character_placement) parts.push(`Character placement: ${fields.character_placement}`)
  if (fields.layout) parts.push(`Layout: ${fields.layout}`)
  if (fields.mood) parts.push(`Mood: ${fields.mood}`)
  if (fields.text_overlay) parts.push(`Text: ${fields.text_overlay}`)

  return parts.join('. ') || yamlText
}

// ── プロバイダー自動検出 ─────────────────────────────────

// ── ユーティリティ ───────────────────────────────────────

/** data:image/png;base64,xxxx → { mimeType, base64 } に分解 */
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return { mimeType: 'image/png', base64: dataUrl }
  return { mimeType: match[1], base64: match[2] }
}

export function detectProvider(apiKey) {
  if (!apiKey) return 'openai'
  if (apiKey.startsWith('AIza')) return 'google'
  if (apiKey.startsWith('sk-')) return 'openai'
  return 'openai'
}

// ── OpenAI API ───────────────────────────────────────────

async function openaiGenerateYaml(apiKey, section, characterDescription, aspectRatio, llmModel, signal) {
  const { systemPrompt, userMessage } = buildYamlPromptRequest(section, characterDescription, aspectRatio)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: llmModel || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI LLM エラー: ${res.status} - ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

async function openaiGenerateImage(apiKey, prompt, aspectRatio, model, signal) {
  const sizeMap = {
    '16:9': '1792x1024',
    '1:1': '1024x1024',
    '4:3': '1792x1024',
    '9:16': '1024x1792',
  }
  const size = sizeMap[aspectRatio] || '1792x1024'

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size,
      quality: 'hd',
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI 画像生成エラー: ${res.status} - ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return {
    url: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
  }
}

// ── Google Gemini + Imagen API ───────────────────────────

async function geminiGenerateYaml(apiKey, section, characterDescription, aspectRatio, llmModel, characterImageDataUrl, signal) {
  const { systemPrompt, userMessage } = buildYamlPromptRequest(section, characterDescription, aspectRatio)

  const geminiModel = llmModel || 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`

  // ユーザーメッセージのパーツ（テキスト＋オプションでキャラクター画像）
  const userParts = [{ text: userMessage }]
  if (characterImageDataUrl) {
    const { mimeType, base64 } = parseDataUrl(characterImageDataUrl)
    userParts.push({ inlineData: { mimeType, data: base64 } })
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: userParts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini LLM エラー: ${res.status} - ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * モデル名からAPIルーティングを判定
 * - gemini-* → generateContent (responseModalities: IMAGE)
 * - それ以外 (imagen-*, nanobanana-* 等) → predict エンドポイント
 */
function isGeminiGenerateContentModel(model) {
  return model.startsWith('gemini-')
}

async function googleGenerateImage(apiKey, prompt, aspectRatio, model, characterImageDataUrl, signal) {
  const targetModel = model || 'imagen-3.0-generate-002'

  if (isGeminiGenerateContentModel(targetModel)) {
    return geminiGenerateContentImage(apiKey, prompt, aspectRatio, targetModel, characterImageDataUrl, signal)
  }

  // predict エンドポイント（Imagen 3, Imagen 3 Fast, Nano Banana Pro 2 等）
  return predictApiImage(apiKey, prompt, aspectRatio, targetModel, signal)
}

/**
 * predict エンドポイント（Imagen系・Nano Banana系など）
 */
async function predictApiImage(apiKey, prompt, aspectRatio, model, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`

  const ratio = aspectRatio || '16:9'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: prompt.slice(0, 4000) }],
      parameters: {
        sampleCount: 1,
        aspectRatio: ratio,
      },
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || res.statusText
    throw new Error(`Google 画像生成エラー (${model}): ${res.status} - ${msg}`)
  }

  const data = await res.json()
  const prediction = data.predictions?.[0]
  if (prediction?.bytesBase64Encoded) {
    const dataUrl = `data:image/png;base64,${prediction.bytesBase64Encoded}`
    return { url: dataUrl, revisedPrompt: '' }
  }

  throw new Error(`${model} から画像データを取得できませんでした。`)
}

/**
 * Gemini generateContent (responseModalities=IMAGE) による画像生成
 */
async function geminiGenerateContentImage(apiKey, prompt, aspectRatio, model, characterImageDataUrl, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const parts = [
    { text: `Generate an infographic image based on the following description. Aspect ratio: ${aspectRatio}.\n\n${prompt.slice(0, 3000)}` }
  ]

  // キャラクター画像があれば参照画像として添付
  if (characterImageDataUrl) {
    const { mimeType, base64 } = parseDataUrl(characterImageDataUrl)
    parts.unshift({ text: `Below is a character reference image (may be a character sheet with multiple views). Study this character's visual design carefully — hairstyle, hair color, eye color, outfit, accessories, art style, and body proportions. Then generate the infographic image featuring this SAME character but in the pose and expression described in the prompt below. Do NOT simply copy the reference image — adapt the character naturally into the scene.` })
    parts.splice(1, 0, { inlineData: { mimeType, data: base64 } })
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Google 画像生成エラー (${model}): ${res.status} - ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []

  // inlineData(画像)を探す
  for (const part of parts) {
    if (part.inlineData) {
      const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      return { url: dataUrl, revisedPrompt: '' }
    }
  }

  throw new Error('Google APIから画像データを取得できませんでした。Imagen APIのアクセス権限を確認してください。')
}

// ── メインパイプライン ─────────────────────────────────

export async function runPipeline({
  apiKey,
  script,
  aspectRatio = '16:9',
  model = '',
  llmModel = '',
  provider = '',
  characterDescription = '',
  characterImageDataUrl = null,
  abortController,
  onProgress,
}) {
  const signal = abortController.signal
  const sections = parseScript(script)
  const detectedProvider = provider || detectProvider(apiKey)

  if (sections.length === 0) {
    throw new Error('スクリプトに [---IMAGE---] タグが見つかりませんでした。')
  }

  onProgress?.({ type: 'start', total: sections.length, provider: detectedProvider })

  const results = []

  for (let i = 0; i < sections.length; i++) {
    if (signal.aborted) break

    const section = sections[i]

    // ステップ1: YAMLプロンプト生成
    onProgress?.({
      type: 'section-start',
      index: i,
      total: sections.length,
      step: 'yaml',
      message: `セクション ${i + 1}/${sections.length}: YAMLプロンプト生成中...（${detectedProvider}）`,
    })

    let yamlPrompt
    try {
      if (detectedProvider === 'google') {
        yamlPrompt = await geminiGenerateYaml(apiKey, section, characterDescription, aspectRatio, llmModel, characterImageDataUrl, signal)
      } else {
        yamlPrompt = await openaiGenerateYaml(apiKey, section, characterDescription, aspectRatio, llmModel, signal)
      }
    } catch (err) {
      if (err.name === 'AbortError') break
      onProgress?.({ type: 'error', index: i, message: err.message })
      results.push({ index: i, error: err.message })
      continue
    }

    if (signal.aborted) break

    onProgress?.({ type: 'yaml-complete', index: i, yaml: yamlPrompt })

    // ステップ2: 画像生成
    const imagePrompt = yamlToImagePrompt(yamlPrompt)

    onProgress?.({
      type: 'section-start',
      index: i,
      total: sections.length,
      step: 'image',
      message: `セクション ${i + 1}/${sections.length}: 画像生成中...`,
    })

    try {
      let result
      if (detectedProvider === 'google') {
        result = await googleGenerateImage(apiKey, imagePrompt, aspectRatio, model, characterImageDataUrl, signal)
      } else {
        result = await openaiGenerateImage(apiKey, imagePrompt, aspectRatio, model, signal)
      }

      results.push({
        index: i,
        yamlPrompt,
        imagePrompt,
        imageUrl: result.url,
        revisedPrompt: result.revisedPrompt,
      })

      onProgress?.({
        type: 'section-complete',
        index: i,
        total: sections.length,
        result: results[results.length - 1],
      })
    } catch (err) {
      if (err.name === 'AbortError') break
      onProgress?.({ type: 'error', index: i, message: err.message })
      results.push({ index: i, yamlPrompt, error: err.message })
    }
  }

  if (signal.aborted) {
    onProgress?.({ type: 'stopped', completedCount: results.length })
  } else {
    onProgress?.({ type: 'done', results })
  }

  return results
}
