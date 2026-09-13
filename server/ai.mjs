import { aiConfig } from './config.mjs'

function requireAiConfig() {
  if (!aiConfig.apiKey) {
    throw Object.assign(new Error('服务端缺少环境变量：OPENAI_NEXT_API_KEY'), {
      code: 'SERVER_CONFIG_MISSING',
      status: 503,
    })
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text
  const chunks = []
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text)
    }
  }
  return chunks.join('\n')
}

function parseJsonText(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

function validateMoments(data, paragraphIds) {
  if (!Array.isArray(data?.moments) || data.moments.length < 3 || data.moments.length > 6) {
    throw Object.assign(new Error('AI 返回的讨论瞬间数量必须为 3～6 个'), {
      code: 'AI_OUTPUT_INVALID',
      status: 502,
    })
  }
  return data.moments.map((moment, index) => {
    const voteOptions = Array.isArray(moment.voteOptions) ? moment.voteOptions.slice(0, 4) : []
    if (!moment.title || !moment.coreQuestion || !moment.searchQuery || voteOptions.length < 3) {
      throw Object.assign(new Error(`AI 返回的第 ${index + 1} 个讨论瞬间字段不完整`), {
        code: 'AI_OUTPUT_INVALID',
        status: 502,
      })
    }
    return {
      id: `ai-m${index + 1}`,
      index: index + 1,
      title: String(moment.title),
      coreQuestion: String(moment.coreQuestion),
      summary: String(moment.summary || ''),
      searchQuery: String(moment.searchQuery),
      anchorParagraphId: paragraphIds.has(String(moment.anchorParagraphId))
        ? String(moment.anchorParagraphId)
        : null,
      voteOptions: voteOptions.map((label, optionIndex) => ({
        id: `v${optionIndex + 1}`,
        label: String(label),
      })),
    }
  })
}

export async function analyzeArticle(article) {
  requireAiConfig()
  const paragraphs = Array.isArray(article?.paragraphs) ? article.paragraphs : []
  if (!article?.title || paragraphs.length === 0) {
    throw Object.assign(new Error('文章标题和段落不能为空'), {
      code: 'ARTICLE_REQUIRED',
      status: 400,
    })
  }

  const paragraphText = paragraphs
    .map((paragraph, index) => `[${paragraph.id || `p${index + 1}`}] ${paragraph.text || ''}`)
    .join('\n')
  const prompt = `你是知乎社区讨论策展助手。分析下面的文章，找出 3～6 个可以跨内容继续讨论的“讨论瞬间”。\n\n要求：\n1. 每个瞬间必须有明确分歧、选择或普适问题。\n2. searchQuery 要适合用于知乎站内搜索，简洁且包含核心概念。\n3. voteOptions 必须是 3～4 个互斥、可理解的中文观点，只返回字符串数组。\n4. anchorParagraphId 必须来自段落方括号中的 ID。\n5. 只输出 JSON，不要 Markdown。\n\nJSON 结构：\n{"moments":[{"title":"短标题","coreQuestion":"讨论问题","summary":"为什么值得讨论","searchQuery":"知乎搜索词","anchorParagraphId":"p1","voteOptions":["观点一","观点二","观点三"]}]}\n\n文章标题：${article.title}\n作者：${article.author || '未知'}\n正文：\n${paragraphText}`

  const response = await fetch(`${aiConfig.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiConfig.model,
      input: prompt,
      reasoning: { effort: 'high' },
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message || `AI 请求失败（HTTP ${response.status}）`), {
      code: response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_REQUEST_FAILED',
      status: response.status === 429 ? 429 : 502,
    })
  }

  let parsed
  try {
    parsed = parseJsonText(extractOutputText(payload))
  } catch {
    throw Object.assign(new Error('AI 未返回可解析的 JSON'), {
      code: 'AI_OUTPUT_INVALID',
      status: 502,
    })
  }
  return validateMoments(parsed, new Set(paragraphs.map((paragraph) => String(paragraph.id))))
}
