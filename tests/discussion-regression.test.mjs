import test from 'node:test'
import assert from 'node:assert/strict'

process.env.OPENAI_NEXT_API_KEY = 'test-only'
process.env.ZHIHU_ACCESS_SECRET = 'test-only'
const { saveDiscussionSpace, getSavedDiscussionSpace } = await import('../src/services/discussionSpaces.js')
const {
  getImportedArticle,
  isLikelyTruncatedText,
  saveImportedArticles,
} = await import('../src/services/importedArticles.js')
const { classifyRelatedContent, expandSelection } = await import('../server/ai.mjs')
const { searchZhihu } = await import('../server/zhihu.mjs')
const { dispatch } = await import('../api/_handler.mjs')
const { articleAnalysisRequest } = await import('../src/services/articleAnalysis.js')
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, value) => store.set(key, value),
}
const related = [
  { id: 'a', author: '甲', authorAvatar: 'https://example.com/a.png', quote: '及时反馈让我容易开始。', title: '反馈', why: '围绕「执行力」提供了相关观点或真实经历。' },
  { id: 'b', author: '乙', quote: '我的困难是任务太模糊。', title: '任务', why: '围绕「执行力」提供了相关观点或真实经历。' },
]
const moment = { id: 'test', coreQuestion: '为什么难开始', searchQuery: '执行力', voteOptions: [], related }
const article = { id: 'article', question: '测试文章', author: { name: '作者' } }

test('built-in articles use precomputed moments without invoking AI analysis', async () => {
  const fallbackMoments = [{ id: 'built-in-moment' }]
  let calls = 0
  const analysis = articleAnalysisRequest(
    { id: 'success-energy' },
    fallbackMoments,
    () => {
      calls++
      throw new Error('must not call live analysis')
    },
  )
  assert.equal(analysis.mode, 'precomputed')
  assert.equal(await analysis.request, fallbackMoments)
  assert.equal(calls, 0)
})

test('imported articles continue to use live AI analysis', async () => {
  const liveMoments = [{ id: 'live-moment' }]
  let calls = 0
  const imported = { id: 'imported-123' }
  const analysis = articleAnalysisRequest(imported, [], async (received) => {
    calls++
    assert.equal(received, imported)
    return liveMoments
  })
  assert.equal(analysis.mode, 'live')
  assert.equal(await analysis.request, liveMoments)
  assert.equal(calls, 1)
})

test('truncated summaries are recognized across common ellipsis styles', () => {
  for (const text of [
    '我们先回顾反馈系统中的振荡现象，然后介绍 ring oscillator...',
    '我们先回顾反馈系统中的振荡现象，然后介绍 ring oscillator……',
    '我们先回顾反馈系统中的振荡现象，然后介绍 ring oscillator⋯”',
  ]) {
    assert.equal(isLikelyTruncatedText(text), true, text)
  }
  assert.equal(isLikelyTruncatedText('振荡器包括环形振荡器、LC 振荡器和 VCO。'), false)
  assert.equal(isLikelyTruncatedText('省略号（……）是这句话讨论的对象。'), false)
})

test('imported articles retain a generic incomplete-source signal', () => {
  const [saved] = saveImportedArticles([{
    id: 'cmos-oscillators',
    title: '模拟 CMOS 集成电路：振荡器基础',
    author: 'YiDingg',
    excerpt: '我们先回顾反馈系统中的振荡现象，然后介绍 ring oscillator...',
    url: 'https://www.zhihu.com/example/cmos-oscillators',
  }])
  assert.equal(saved.sourceIncomplete, true)
  assert.equal(getImportedArticle(saved.id).sourceIncomplete, true)
})

test('unrefined authors retain distinct source text and unknown stance', () => {
  const space = saveDiscussionSpace(moment, article, ['v1'])
  assert.deepEqual(space.posts.map((p) => p.text), related.map((p) => p.quote))
  assert.ok(space.posts.every((p) => p.stance === 'neutral' && !p.refined))
  assert.equal(space.posts[0].avatar, related[0].authorAvatar)
  assert.equal(getSavedDiscussionSpace('test').worthChat[0].claim, related[0].quote)
})

test('pending classification state survives transfer to the discussion space', () => {
  const space = saveDiscussionSpace(moment, article, ['v1'], { classificationStatus: 'pending' })
  assert.equal(space.classificationStatus, 'pending')
  assert.equal(getSavedDiscussionSpace('test').classificationStatus, 'pending')
})

test('refined viewpoint, source and stance survive transfer', () => {
  const space = saveDiscussionSpace({ ...moment, related: [
    { ...related[0], viewpoint: '即时反馈降低启动难度。', stance: 'same' },
    { ...related[1], claim: '先澄清任务。', stance: 'different' },
  ] }, article, ['v1'])
  assert.equal(space.posts[0].text, '即时反馈降低启动难度。')
  assert.equal(space.posts[0].sourceExcerpt, related[0].quote)
  assert.equal(space.posts[1].stance, 'diff')
  assert.ok(space.posts.every((p) => p.refined))
})

test('old generic saved posts recover their original excerpts', () => {
  store.set('zhihuwhy:discussion-spaces:v3', JSON.stringify({ old: {
    posts: [{ text: related[0].why, sourceExcerpt: related[0].quote, stance: 'same', refined: true }],
    worthChat: [{ claim: related[0].why, evidence: [related[0].quote] }],
  } }))
  const space = getSavedDiscussionSpace('old')
  assert.equal(space.posts[0].text, related[0].quote)
  assert.equal(space.posts[0].stance, 'neutral')
})

test('empty candidates never invoke the model', async () => {
  const old = globalThis.fetch
  globalThis.fetch = () => { throw new Error('must not call network') }
  try {
    assert.deepEqual(await classifyRelatedContent(moment, ['选项'], []), { same: [], different: [], neutral: [] })
  } finally { globalThis.fetch = old }
})

test('body timeout is reported as timeout instead of malformed model output', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => { throw Object.assign(new Error('timed out'), { name: 'AbortError' }) },
  })
  try {
    await assert.rejects(classifyRelatedContent(moment, ['选项'], related), { code: 'AI_TIMEOUT' })
  } finally { globalThis.fetch = old }
})

test('recommendation retries one transient network failure and then succeeds', async () => {
  const old = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    if (calls === 1) throw new TypeError('Failed to fetch')
    return {
      ok: true,
      json: async () => ({ ok: true, groups: { same: related, different: [], neutral: [] } }),
    }
  }
  try {
    const { recommendRelatedContent } = await import('../src/services/discussions.js')
    const groups = await recommendRelatedContent(moment, ['主要靠个人意志和能力'])
    assert.equal(calls, 2)
    assert.equal(groups.same.length, 2)
  } finally { globalThis.fetch = old }
})

test('recommendation does not retry a permanent client error', async () => {
  const old = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return {
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: { code: 'RECOMMENDATION_INPUT_REQUIRED', message: '参数不完整' } }),
    }
  }
  try {
    const { recommendRelatedContent } = await import('../src/services/discussions.js')
    await assert.rejects(
      recommendRelatedContent(moment, ['主要靠个人意志和能力']),
      { code: 'RECOMMENDATION_INPUT_REQUIRED' },
    )
    assert.equal(calls, 1)
  } finally { globalThis.fetch = old }
})

test('recommendation hides the browser Failed to fetch wording after both attempts fail', async () => {
  const old = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    throw new TypeError('Failed to fetch')
  }
  try {
    const { recommendRelatedContent } = await import('../src/services/discussions.js')
    await assert.rejects(
      recommendRelatedContent(moment, ['主要靠个人意志和能力']),
      (error) => error.code === 'RECOMMEND_UNAVAILABLE' && !error.message.includes('Failed to fetch'),
    )
    assert.equal(calls, 2)
  } finally { globalThis.fetch = old }
})

test('unparseable model JSON exposes a specific error code', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: 'invalid' }) })
  try {
    await assert.rejects(classifyRelatedContent(moment, ['选项'], related), { code: 'AI_OUTPUT_INVALID' })
  } finally { globalThis.fetch = old }
})

test('missing classifications do not invent shared claims', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: '{"c":[]}' }) })
  try {
    const groups = await classifyRelatedContent({ ...moment, coreQuestion: '缺少分类测试' }, ['选项'], related)
    assert.ok(groups.neutral.every((p) => p.claim === '' && p.viewpoint === undefined))
    const space = saveDiscussionSpace({ ...moment, related: groups.neutral }, article, [])
    assert.deepEqual(space.posts.map((p) => p.text), related.map((p) => p.quote))
  } finally { globalThis.fetch = old }
})

test('recommendation output does not generate or preserve classification reasons', async () => {
  const old = globalThis.fetch
  let requestBody
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ output_text: JSON.stringify({ c: [[0, 's', '即时反馈能降低启动难度。', 90]] }) }),
  })
  try {
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body)
      return { ok: true, json: async () => ({ output_text: '{"c":[[0,"s","即时反馈能降低启动难度。",90]]}' }) }
    }
    const groups = await classifyRelatedContent(
      { ...moment, coreQuestion: '紧凑输出测试' },
      ['主要靠个人意志和能力'],
      related,
    )
    assert.equal(groups.same[0].reason, undefined)
    assert.equal(groups.same[0].viewpoint, undefined)
    assert.equal(groups.same[0].claim, '即时反馈能降低启动难度。')
    assert.equal(requestBody.model, 'gpt-5.6-luna')
    assert.equal(requestBody.max_output_tokens, 300)
  } finally { globalThis.fetch = old }
})

test('empty search retries core question once; errors do not trigger fallback', async () => {
  const old = globalThis.fetch
  const queries = []
  globalThis.fetch = async (url) => {
    queries.push(new URL(url).searchParams.get('Query'))
    return { ok: true, json: async () => ({ Code: 0, Data: { Items: [] } }) }
  }
  try {
    await searchZhihu('主题词', 4, '核心问题')
    assert.deepEqual(queries, ['主题词', '核心问题'])
    let calls = 0
    globalThis.fetch = async () => {
      calls++
      return { ok: false, status: 429, json: async () => ({ Code: 30001, Message: '限流' }) }
    }
    await assert.rejects(searchZhihu('主题词', 4, '核心问题'), { code: 'RATE_LIMITED' })
    assert.equal(calls, 1)
  } finally { globalThis.fetch = old }
})

test('selected text becomes a question and concise search query with context', async () => {
  const old = globalThis.fetch
  let request
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body)
    return {
      ok: true,
      json: async () => ({ output_text: JSON.stringify({
        coreQuestion: '没有正反馈时，怎样保持行动？',
        searchQuery: '正反馈 执行力 坚持',
        summary: '反馈和坚持之间存在不同的因果判断。',
      }) }),
    }
  }
  try {
    const result = await expandSelection({
      selectedText: '努力从未被确认，行动就会变得艰难。',
      contextBefore: '成功次数太少。',
      contextAfter: '从小事积累反馈。',
      articleTitle: '关于执行力',
    })
    assert.equal(result.searchQuery, '正反馈 执行力 坚持')
    assert.equal(result.coreQuestion, '没有正反馈时，怎样保持行动？')
    assert.match(request.input, /成功次数太少/)
    assert.match(request.input, /从小事积累反馈/)
  } finally { globalThis.fetch = old }
})

test('selection validation rejects empty or oversized text before network', async () => {
  const old = globalThis.fetch
  globalThis.fetch = () => { throw new Error('must not call network') }
  try {
    await assert.rejects(expandSelection({ selectedText: '短句' }), { code: 'SELECTION_TOO_SHORT' })
    await assert.rejects(expandSelection({ selectedText: '长'.repeat(501) }), { code: 'SELECTION_TOO_LONG' })
  } finally { globalThis.fetch = old }
})

test('invalid selection model output is rejected', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: '{"searchQuery":"反馈"}' }) })
  try {
    await assert.rejects(expandSelection({ selectedText: '没有反馈时为什么很难坚持？' }), { code: 'AI_OUTPUT_INVALID' })
  } finally { globalThis.fetch = old }
})

test('Vercel selection endpoint returns the same expansion contract', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ output_text: JSON.stringify({
      coreQuestion: '反馈是否决定持续行动？',
      searchQuery: '反馈 持续行动',
      summary: '不同的人对反馈的作用有不同判断。',
    }) }),
  })
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.payload = JSON.parse(value) },
  }
  try {
    await dispatch('discussions/selection', {
      method: 'POST',
      url: '/api/discussions/selection',
      headers: { host: 'localhost:4173' },
      body: { selectedText: '努力从未被确认，行动就会变得艰难。' },
    }, response)
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.payload, {
      ok: true,
      coreQuestion: '反馈是否决定持续行动？',
      searchQuery: '反馈 持续行动',
      summary: '不同的人对反馈的作用有不同判断。',
    })
  } finally { globalThis.fetch = old }
})

test('selection expansion endpoint receives selected text and its reading context', async () => {
  const old = globalThis.fetch
  let requestBody
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body)
    return {
      ok: true,
      json: async () => ({
        ok: true,
        coreQuestion: '精准时间管理是高效还是过度控制？',
        searchQuery: '时间管理 专注 效率',
        summary: '不同人对精细安排的价值有不同判断。',
      }),
    }
  }
  try {
    const { expandSelectedText } = await import('../src/services/discussions.js')
    const result = await expandSelectedText({
      selectedText: '他会谈的人都知道他的时间表精确到10分钟。',
      contextBefore: '他的行程由助理安排。',
      contextAfter: '他非常关注关键细节。',
      articleTitle: '一天的时间管理',
    })
    assert.equal(result.searchQuery, '时间管理 专注 效率')
    assert.match(requestBody.selectedText, /10分钟/)
    assert.match(requestBody.contextBefore, /助理安排/)
    assert.match(requestBody.contextAfter, /关键细节/)
  } finally { globalThis.fetch = old }
})
