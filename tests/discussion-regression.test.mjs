import test from 'node:test'
import assert from 'node:assert/strict'

process.env.OPENAI_NEXT_API_KEY = 'test-only'
process.env.ZHIHU_ACCESS_SECRET = 'test-only'
const { saveDiscussionSpace, getSavedDiscussionSpace } = await import('../src/services/discussionSpaces.js')
const { analyzeArticle, classifyRelatedContent, generateVoteOptionSets } = await import('../server/ai.mjs')
const { searchZhihu } = await import('../server/zhihu.mjs')
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, value) => store.set(key, value),
}
const related = [
  { id: 'a', author: '甲', quote: '及时反馈让我容易开始。', title: '反馈', why: '围绕「执行力」提供了相关观点或真实经历。' },
  { id: 'b', author: '乙', quote: '我的困难是任务太模糊。', title: '任务', why: '围绕「执行力」提供了相关观点或真实经历。' },
]
const moment = { id: 'test', coreQuestion: '为什么难开始', searchQuery: '执行力', voteOptions: [], related }
const article = { id: 'article', question: '测试文章', author: { name: '作者' } }

test('unrefined authors retain distinct source text and unknown stance', () => {
  const space = saveDiscussionSpace(moment, article, ['v1'])
  assert.deepEqual(space.posts.map((p) => p.text), related.map((p) => p.quote))
  assert.ok(space.posts.every((p) => p.stance === 'neutral' && !p.refined))
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

test('article analysis returns the discussion skeleton before vote options', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({ moments: [1, 2, 3].map((index) => ({
        title: `观点${index}`,
        coreQuestion: `问题${index}`,
        summary: `说明${index}`,
        searchQuery: `搜索${index}`,
        anchorParagraphId: 'p1',
      })) }),
    }),
  })
  try {
    const moments = await analyzeArticle({ title: '测试文章', paragraphs: [{ id: 'p1', text: '正文' }] })
    assert.equal(moments.length, 3)
    assert.ok(moments.every((item) => item.voteOptions.length === 0))
  } finally { globalThis.fetch = old }
})

test('all vote options are generated together in a separate background request', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({ optionSets: [
        { momentId: 'ai-m1', voteOptions: ['观点一', '观点二', '观点三'] },
        { momentId: 'ai-m2', voteOptions: ['支持', '反对', '视情况而定'] },
      ] }),
    }),
  })
  try {
    const optionSets = await generateVoteOptionSets([
      { id: 'ai-m1', coreQuestion: '是否应该分步加载？' },
      { id: 'ai-m2', coreQuestion: '是否应该预生成？' },
    ])
    assert.equal(optionSets.length, 2)
    assert.deepEqual(optionSets[0].voteOptions, [
      { id: 'v1', label: '观点一' },
      { id: 'v2', label: '观点二' },
      { id: 'v3', label: '观点三' },
    ])
    assert.equal(optionSets[1].voteOptions[0].label, '支持')
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

test('unparseable model JSON exposes a specific error code', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: 'invalid' }) })
  try {
    await assert.rejects(classifyRelatedContent(moment, ['选项'], related), { code: 'AI_OUTPUT_INVALID' })
  } finally { globalThis.fetch = old }
})

test('missing classifications do not invent shared viewpoints', async () => {
  const old = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output_text: '{"classifications":[]}' }) })
  try {
    const groups = await classifyRelatedContent(moment, ['选项'], related)
    assert.ok(groups.neutral.every((p) => p.viewpoint === '' && p.claim === ''))
    const space = saveDiscussionSpace({ ...moment, related: groups.neutral }, article, [])
    assert.deepEqual(space.posts.map((p) => p.text), related.map((p) => p.quote))
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
