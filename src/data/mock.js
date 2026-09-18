/** Fallback demo data used when the AI, search, or OAuth services are unavailable. */
import { builtInArticleCards, builtInArticlesById } from './builtInArticles'

export const product = {
  name: '知乎 · 回响',
  tagline: '让每一个好问题，连接更多好回答',
  heroTitle: '读到一句有感的话，发现更多真实的讨论',
  heroDesc:
    'AI 将知乎长内容中的观点、经历和情绪转化为一个个「讨论瞬间」，并与站内其他内容连接成关系图谱。让深内容变轻，但不是把内容变浅。',
}

export const mockUser = {
  id: 'u-mock',
  name: '演示用户',
  avatar: '',
}

// 登录后这里会被真实的知乎收藏接口返回值覆盖；仅用于未登录时的旧版占位数据。
export const mockFavorites = [
  {
    id: 'a1', type: 'answer', question: '为什么大多数人没有超强的执行力？',
    title: '执行力不是意志力，而是对结果的掌控感', author: '九歌',
    excerpt: '很多人把执行力差归因于懒或意志薄弱。真正的问题往往是：成功次数太少，大脑从未建立「我能做成」的正向回路。',
    voteup: 1621, comments: 82, favoritedAt: '2026-03-12',
  },
  {
    id: 'a2', type: 'article', question: null, title: '如何建立正向反馈循环？', author: 'Lemon',
    excerpt: '我以前总觉得自己是不自律，后来发现只是长期没有获得正反馈。把目标拆到「今天就能赢一次」的粒度，比逼自己更有效。',
    voteup: 1200, comments: 156, favoritedAt: '2026-02-28',
  },
  {
    id: 'a3', type: 'answer', question: '30岁离开大城市，是一种失败吗？', title: '工资少了一半，但我终于有时间陪父母了', author: '林川',
    excerpt: '离开一线后，节奏慢下来。有人说是逃避，我觉得是换了一种衡量成功的尺子：陪伴、睡眠、和自己相处的时间。',
    voteup: 3402, comments: 421, favoritedAt: '2026-01-15',
  },
  {
    id: 'a4', type: 'answer', question: '长期焦虑该怎么办？', title: '焦虑往往来自「无法完成」的想象，而不是任务本身', author: '陈知微',
    excerpt: '把模糊的大任务拆成可验证的小步，焦虑会跟着下降。执行力差和焦虑，经常是同一枚硬币的两面。',
    voteup: 892, comments: 64, favoritedAt: '2025-12-03',
  },
  {
    id: 'a5', type: 'article', question: null, title: '环境如何悄悄决定你的行为', author: '周然',
    excerpt: '意志力很贵，环境很便宜。把阻力从路径上拿走，比每天给自己打气更靠谱。',
    voteup: 2103, comments: 198, favoritedAt: '2025-11-20',
  },
]

export const demoArticleCards = builtInArticleCards

/** Primary demo article used by「使用示例文章体验」 */
export const sampleArticleId = 'success-energy'

export const articlesById = {
  ...builtInArticlesById,
  a1: {
    id: 'a1',
    type: 'answer',
    question: '为什么大多数人没有超强的执行力？',
    author: {
      name: '九歌',
      bio: '传播学硕士 · 四川大学',
      followers: '12.4 万',
    },
    voteup: 1621,
    comments: 82,
    paragraphs: [
      {
        id: 'p1',
        text: '很多人把「没有执行力」理解成懒、拖延、意志薄弱。可如果只是意志问题，为什么有人能在游戏里连续肝十小时，却写不出一页报告？',
      },
      {
        id: 'p2',
        text: '真正让人动不起来的，往往是一种「被注视」的心态：还没开始，就在想象别人会怎么评价结果。输出恐惧，比懒惰更常见。',
      },
      {
        id: 'p3',
        text: '我越来越相信：执行力不足，很多时候不是因为意志力差，而是因为成功次数太少。大脑没有建立「我做成过」的证据链。',
        highlight: true,
        momentId: 'm1',
      },
      {
        id: 'p4',
        text: '没有正反馈，任何长期目标都会显得像自我折磨。你不是不够努力，而是努力从未被确认。',
      },
      {
        id: 'p5',
        text: '另一个误区是把执行力等同于意志力。意志力像肌肉，会疲劳；执行力更像对结果的掌控感——我知道下一步做什么，也知道做完会得到什么。',
        highlight: true,
        momentId: 'm4',
      },
      {
        id: 'p6',
        text: '过度在意他人评价，会把「开始」变成一场表演彩排。你越想一次做对，就越难迈出第一步。',
        highlight: true,
        momentId: 'm2',
      },
      {
        id: 'p7',
        text: '所以与其逼自己「更有毅力」，不如从小事建立正反馈：今天整理桌面、回复三封邮件、跑完一公里。赢一次，再赢一次。',
        highlight: true,
        momentId: 'm3',
      },
      {
        id: 'p8',
        text: '当你积累了足够多「我能做成」的记忆，执行力往往不再需要靠吼自己。它会变成一种默认路径。',
      },
    ],
  },
}

/** Discussion moments for the sample article */
export const momentsByArticleId = {
  a1: [
    {
      id: 'm1',
      index: 1,
      title: '赢的次数太少',
      coreQuestion: '执行力不足，真的是因为「赢的次数太少」吗？',
      summary:
        '一方认为正反馈缺失导致行动瘫痪；另一方强调意志力与环境同样关键。这是全文最常被继续讨论的分歧点。',
      relatedCount: 986,
      participants: '2.3k',
      anchorParagraphId: 'p3',
      related: [
        {
          id: 'r1',
          title: '如何建立正向反馈循环？',
          author: 'Lemon',
          voteup: '1.2k',
          why: '认同执行力来自正反馈，而非单纯意志力。',
        },
        {
          id: 'r2',
          title: '小胜累积：把目标做成可赢的游戏',
          author: '禾木',
          voteup: 980,
          why: '提供可操作的「每天赢一次」方法。',
        },
        {
          id: 'r3',
          title: '为什么努力很久却看不到结果？',
          author: '南川',
          voteup: 640,
          why: '讨论反馈延迟如何摧毁持续行动。',
        },
      ],
      voteOptions: [
        { id: 'v1', label: '成功反馈更重要', icon: 'chart' },
        { id: 'v2', label: '意志力更重要', icon: 'arm' },
        { id: 'v3', label: '环境与状态更重要', icon: 'leaf' },
        { id: 'v4', label: '情况因人而异', icon: 'people' },
      ],
      voteResults: { v1: 42, v2: 18, v3: 27, v4: 13 },
      closestQuote: {
        text: '我以前总觉得自己是不自律，后来发现只是长期没有获得正反馈。',
        author: 'Lemon',
        source: '《如何建立正向反馈循环？》',
        voteup: '1.2k',
      },
    },
    {
      id: 'm2',
      index: 2,
      title: '过度在意他人评价',
      coreQuestion: '在意评价，是保护自己，还是阻碍行动？',
      summary:
        '有人把外界目光当作质量约束；有人认为它把开始变成表演，拖垮第一步。',
      relatedCount: 742,
      participants: '1.8k',
      anchorParagraphId: 'p6',
      related: [
        {
          id: 'r4',
          title: '怎样停止讨好型人格？',
          author: '清禾',
          voteup: 2100,
          why: '讨论评价焦虑如何侵占行动资源。',
        },
        {
          id: 'r5',
          title: '公开创作会让人更自律吗？',
          author: '木子',
          voteup: 530,
          why: '外部注视既可能驱动，也可能冻结。',
        },
        {
          id: 'r6',
          title: '完美主义如何毁掉交付',
          author: '阿北',
          voteup: 1500,
          why: '与「一次做对」心态直接相关。',
        },
      ],
      voteOptions: [
        { id: 'v1', label: '外部评价有助于质量', icon: 'chart' },
        { id: 'v2', label: '评价焦虑拖垮行动', icon: 'arm' },
        { id: 'v3', label: '关键在于自我标准', icon: 'leaf' },
        { id: 'v4', label: '取决于场景', icon: 'people' },
      ],
      voteResults: { v1: 22, v2: 41, v3: 24, v4: 13 },
      closestQuote: {
        text: '我不是懒，是怕交出去的东西配不上别人对我的想象。',
        author: '清禾',
        source: '《怎样停止讨好型人格？》',
        voteup: '2.1k',
      },
    },
    {
      id: 'm3',
      index: 3,
      title: '从小事建立正反馈',
      coreQuestion: '小胜利真的能重建执行力吗？',
      summary: '支持者强调可完成粒度；质疑者担心碎片化目标会稀释真正重要的事。',
      relatedCount: 611,
      participants: '1.4k',
      anchorParagraphId: 'p7',
      related: [
        {
          id: 'r7',
          title: '习惯养成的最小可行单位',
          author: '周然',
          voteup: 870,
          why: '把行动降到几乎不可能失败的尺度。',
        },
        {
          id: 'r8',
          title: '目标拆解会不会让人更忙？',
          author: '林川',
          voteup: 420,
          why: '质疑过度拆解带来的虚假勤奋。',
        },
        {
          id: 'r9',
          title: '用游戏化对抗拖延',
          author: '禾木',
          voteup: 1100,
          why: '用计分与连胜维持反馈密度。',
        },
      ],
      voteOptions: [
        { id: 'v1', label: '小胜利有效', icon: 'chart' },
        { id: 'v2', label: '容易流于琐碎', icon: 'arm' },
        { id: 'v3', label: '要配合大目标', icon: 'leaf' },
        { id: 'v4', label: '因人而异', icon: 'people' },
      ],
      voteResults: { v1: 48, v2: 15, v3: 26, v4: 11 },
      closestQuote: {
        text: '把目标拆到今天就能赢一次，比逼自己「更有毅力」管用。',
        author: '禾木',
        source: '《小胜累积》',
        voteup: 980,
      },
    },
    {
      id: 'm4',
      index: 4,
      title: '执行力 vs 意志力',
      coreQuestion: '执行力是不是被误解成了意志力？',
      summary:
        '一种观点把执行力看作可控的系统设计；另一种仍强调克制与坚持是核心能力。',
      relatedCount: 534,
      participants: '1.1k',
      anchorParagraphId: 'p5',
      related: [
        {
          id: 'r10',
          title: '环境如何悄悄决定你的行为',
          author: '周然',
          voteup: '2.1k',
          why: '用环境设计替代意志消耗。',
        },
        {
          id: 'r11',
          title: '自律的人真的在靠意志力吗？',
          author: '南川',
          voteup: 760,
          why: '拆解「看起来很自律」背后的结构。',
        },
        {
          id: 'r12',
          title: '结果可控感从哪里来',
          author: '陈知微',
          voteup: 390,
          why: '把执行力定义为对结果的掌控感。',
        },
      ],
      voteOptions: [
        { id: 'v1', label: '执行力 ≠ 意志力', icon: 'chart' },
        { id: 'v2', label: '意志力仍是核心', icon: 'arm' },
        { id: 'v3', label: '环境设计更关键', icon: 'leaf' },
        { id: 'v4', label: '两者都需要', icon: 'people' },
      ],
      voteResults: { v1: 36, v2: 19, v3: 28, v4: 17 },
      closestQuote: {
        text: '意志力很贵，环境很便宜。把阻力从路径上拿走，比每天打气更靠谱。',
        author: '周然',
        source: '《环境如何悄悄决定你的行为》',
        voteup: '2.1k',
      },
    },
  ],
}

/** Discussion space feed after voting */
export const discussionSpaces = {
  m1: {
    momentId: 'm1',
    topic: '执行力不足，真的是因为「赢的次数太少」吗？',
    sourceCount: 37,
    participants: '2.3k',
    options: [
      { id: 'v1', label: '成功反馈更重要' },
      { id: 'v2', label: '意志力更重要' },
      { id: 'v3', label: '环境与状态更重要' },
      { id: 'v4', label: '情况因人而异' },
    ],
    distribution: { v1: 42, v2: 18, v3: 27, v4: 13 },
    filters: [
      { id: 'hot', label: '热门讨论', count: 128 },
      { id: 'new', label: '新观点', count: 36 },
      { id: 'high', label: '高赞讨论', count: 54 },
    ],
    posts: [
      {
        id: 'd1',
        user: '九歌',
        from: '来自原作者',
        time: '2 小时前',
        stance: 'same',
        stanceOptionId: 'v1',
        text: '执行力不足未必是不够努力，更可能是过去成功的次数太少，没有形成“我能做成”的证据链。只靠鼓励很难长期调动意志，更有效的办法是先设计能完成的小目标，让真实的成功经验逐步恢复行动信心。但这些小目标仍然要服务于真正重要的方向。',
        sourceExcerpt: '我写那句「赢的次数太少」，不是否认意志，而是想说：没有证据链，意志很难被调用。很多人缺的不是吼自己，而是一次被确认的成功。',
        sourceTitle: '为什么大多数人没有超强的执行力？',
        refined: true,
        agree: 326,
      },
      {
        id: 'd2',
        user: '阿北',
        from: '来自相关回答',
        time: '5 小时前',
        stance: 'diff',
        stanceOptionId: 'v2',
        text: '正反馈确实能让人更容易开始，但任何长期目标都会经历暂时看不到结果的窗口期。如果把行动完全建立在及时奖励上，反馈一旦中断就容易放弃。因此，承诺感和意志仍是穿越低谷的必要支撑，反馈不能解释执行力的全部。这并不否认环境的作用，只是人不能完全依赖即时奖励。',
        sourceExcerpt: '正反馈当然重要，但总有一段窗口期没有反馈。扛过去靠的就是意志和承诺。把一切归因于反馈，会低估坚持本身。',
        sourceTitle: '为什么努力很久却看不到结果？',
        refined: true,
        agree: 198,
      },
      {
        id: 'd3',
        user: '周然',
        from: '来自专栏文章',
        time: '昨天',
        stance: 'same',
        stanceOptionId: 'v3',
        text: '与其每天消耗意志力逼自己行动，不如先改造环境，让正确行为变得更容易。把手机拿远、把任务写进日历、把第一步缩小到两分钟，都是在前置地降低行动阻力。反馈往往是行动后的结果，而环境才是能够持续撬动行为的杠杆。',
        sourceExcerpt: '我更接近环境派：把手机拿远、把任务放进日历、把第一步缩到两分钟。反馈是结果，环境是杠杆。',
        sourceTitle: '环境如何悄悄决定你的行为',
        refined: true,
        agree: 412,
      },
      {
        id: 'd4',
        user: 'Lemon',
        from: '来自相关文章',
        time: '昨天',
        stance: 'same',
        stanceOptionId: 'v1',
        text: '很多被贴上“不自律”标签的人，其实是长期付出却没有得到可感知的正反馈，于是逐渐怀疑自己是否有能力完成。这时继续强调毅力，可能只会加重挫败感。更可行的做法是先设计能获得小胜利的任务，再用累积的成功经验重建信心。',
        sourceExcerpt: '「不自律」很多时候是标签错误。长期零反馈，谁都会怀疑自己。先设计可赢的小任务，再谈毅力。',
        sourceTitle: '如何建立正向反馈循环？',
        refined: true,
        agree: 887,
      },
      {
        id: 'd5',
        user: '林川',
        from: '来自相关回答',
        time: '2 天前',
        stance: 'diff',
        stanceOptionId: 'v4',
        text: '执行力不足不能简单归结为缺少反馈，因为不同人的阻力可能完全不同。有人缺的是睡眠和精力，有人没有清晰目标，也有人确实需要更及时的回报。因此应该先识别具体卡点，再决定是改环境、补状态还是重新设计反馈，而不是使用统一解法。',
        sourceExcerpt: '这个问题不能一刀切。有人缺反馈，有人缺睡眠，有人缺清晰目标。先诊断，再开药方。',
        sourceTitle: '执行力不足应该如何诊断？',
        refined: true,
        agree: 156,
      },
    ],
    worthChat: [
      {
        id: 'c1',
        name: '阿北',
        claim: '没有反馈时的坚持更能决定执行力',
        snippet: '坚持意志力派 · 与你分歧明显',
        evidence: [
          '正反馈当然重要，但总有一段窗口期没有反馈。扛过去靠的就是意志和承诺。',
          '把一切归因于反馈，会低估坚持本身。',
        ],
      },
      {
        id: 'c2',
        name: '周然',
        claim: '环境设计比每天消耗意志力更重要',
        snippet: '环境设计派 · 可聊「反馈 vs 环境」',
        evidence: [
          '把手机拿远、把任务放进日历、把第一步缩到两分钟。反馈是结果，环境是杠杆。',
        ],
      },
      {
        id: 'c3',
        name: '清禾',
        claim: '很多拖延的根源是对外界评价的恐惧',
        snippet: '评价焦虑视角 · 互补角度',
        evidence: [
          '我不是懒，是怕交出去的东西配不上别人对我的想象。',
        ],
      },
    ],
    sources: [
      {
        id: 's1',
        title: '为什么大多数人没有超强的执行力？',
        author: '九歌',
        voteup: 1621,
        comments: 82,
      },
      {
        id: 's2',
        title: '如何建立正向反馈循环？',
        author: 'Lemon',
        voteup: 1200,
        comments: 156,
      },
      {
        id: 's3',
        title: '环境如何悄悄决定你的行为',
        author: '周然',
        voteup: 2103,
        comments: 198,
      },
    ],
  },
}

export function getArticle(id) {
  return articlesById[id] || articlesById[sampleArticleId]
}

function createOfflineMoment({ id, index, title, coreQuestion, summary, anchorParagraphId, options, quote }) {
  return {
    id,
    index,
    title,
    coreQuestion,
    summary,
    anchorParagraphId,
    relatedCount: 0,
    participants: 0,
    related: [],
    voteOptions: options.map((label, optionIndex) => ({ id: `v${optionIndex + 1}`, label })),
    voteResults: { v1: 36, v2: 24, v3: 22, v4: 18 },
    closestQuote: { text: quote, author: '观点引力场', source: '本文讨论', voteup: 0 },
  }
}

const builtInOfflineMoments = {
  'success-energy': [
    createOfflineMoment({
      id: 'energy-m1', index: 1, title: '被消除的摩擦', anchorParagraphId: 'p9',
      coreQuestion: '成功者看起来精力充沛，关键是体力更强，还是日常摩擦被系统性消除了？',
      summary: '文章用助理筛选信息、私人飞机和精确到分钟的行程说明：碎片化决策与等待被外包，才让精力没有在“赶路”中流失。',
      options: ['消除摩擦是核心', '体力与天赋更关键', '目标感更关键', '三者缺一不可'],
      quote: '各种垃圾信息都在抵达他之前都被粉碎了。',
    }),
    createOfflineMoment({
      id: 'energy-m2', index: 2, title: '只做决策的人', anchorParagraphId: 'p20',
      coreQuestion: '把工作剥离成“只做最核心决策”，是高效分工，还是一种难以复制的权力特权？',
      summary: '从星舰材质大掉头、删除无用零件到危机阻断，文章把旺盛精力归因于工作内容的高度提纯——只做没人敢拍板的关键决策。',
      options: ['高效分工的结果', '权力特权更明显', '关键在专业能力', '岗位不同无法比较'],
      quote: '马斯克选择让星舰材质大掉头，让材料团队的方向从研究碳纤维复合材料换成改进不锈钢。',
    }),
    createOfflineMoment({
      id: 'energy-m3', index: 3, title: '情绪劳动的去向', anchorParagraphId: 'p28',
      coreQuestion: '当一个人把冲突、安抚与后果交给团队承担，这还是“精力管理”吗？',
      summary: '文章把高效率的另一面点得很具体：人性纠葛和情绪劳动并未消失，而是被转移给了其他人，让他依然有精力思考下一步。',
      options: ['是必要的角色分工', '是成本的转嫁', '取决于是否承担责任', '效率与伦理需分开看'],
      quote: '有人帮马斯克屏蔽人性纠葛和情绪劳动。',
    }),
    createOfflineMoment({
      id: 'energy-m4', index: 4, title: '早期的退路', anchorParagraphId: 'p41',
      coreQuestion: '“极度简化生活”究竟是普通人可复制的方法，还是建立在隐形安全垫之上？',
      summary: '文章先交代了马斯克早期的家庭与资源背景，随后才讨论他通过放弃生活、零通勤和快餐压缩摩擦的做法。',
      options: ['安全垫决定上限', '方法本身可以借鉴', '只适合短期冲刺', '不能脱离个人处境'],
      quote: '但马斯克做了一个惊人的决定：放弃生活。',
    }),
    createOfflineMoment({
      id: 'energy-m5', index: 5, title: '普通人的简化模式', anchorParagraphId: 'p51',
      coreQuestion: '普通人该如何简化生活，又怎样避免把“简化”误变成无意义的自我消耗？',
      summary: '结尾把可借鉴的部分收束为：为了稳定而重要的核心目标，主动放弃低收益摩擦，而不是盲目苦行。',
      options: ['先确定核心目标', '先减少琐碎任务', '先保证基本生活', '不应鼓励苦行'],
      quote: '为了某种真正重要的东西，你愿意去否定其他东西，这就是简化模式的真谛。',
    }),
  ],
  'human-relations': [
    createOfflineMoment({
      id: 'relations-m1', index: 1, title: '先找到自己的位置', anchorParagraphId: 'p4',
      coreQuestion: '进入一个新圈子，先证明自己能做事，还是先经营关系更重要？',
      summary: '文章开篇的路径很明确：先找到位置、做好位置上的事，再谈连接他人、组织势力和稳固地位。',
      options: ['先把事做好', '先建立关系', '同步推进', '看圈子的规则'],
      quote: '在一个圈子中自己的朋友多了，就能逐渐组织起自己的政治势力了。',
    }),
    createOfflineMoment({
      id: 'relations-m2', index: 2, title: '做事先做人', anchorParagraphId: 'p9',
      coreQuestion: '“做事之前是做人”，是成熟的处世智慧，还是对老实人的规训？',
      summary: '这一段把情绪控制、避免无谓争执与“做人”放在一起，讨论关系中冲突的代价与做人的底线。',
      options: ['做人是前提', '能力更重要', '先做事再做人', '看场景'],
      quote: '做事之前是做人，做人都不行，别人根本不会看得起。',
    }),
    createOfflineMoment({
      id: 'relations-m3', index: 3, title: '理性处理对立', anchorParagraphId: 'p16',
      coreQuestion: '面对潜在对立，先评估利益和关系，是否比立即表达立场更成熟？',
      summary: '文章在“排除异己”部分要求先辨识动机、利益联系、关系状态和对方处境；它提供的是一套冲突前的冷静审视框架。',
      options: ['先评估再行动', '立场必须及时表达', '应优先寻求合作', '不该把关系工具化'],
      quote: '目前与对手的状态是何种关系？公开敌对、潜在敌对、互不干涉、潜在合作、公开合作。',
    }),
    createOfflineMoment({
      id: 'relations-m4', index: 4, title: '成果胜过奉承', anchorParagraphId: 'p24',
      coreQuestion: '确立圈子地位，靠做出成果，还是靠人情与话术？',
      summary: '文章认为直截了当表达谢意与回报、确保表达准确，最终拿出的成果比阿谀奉承更能确立地位。',
      options: ['成果最有说服力', '人情同样重要', '两者都需要', '取决于圈子文化'],
      quote: '当做出来的成果是好的时候，比什么阿谀奉承和笼络人心更能确立自己的地位。',
    }),
    createOfflineMoment({
      id: 'relations-m5', index: 5, title: '劳动与社交', anchorParagraphId: 'p33',
      coreQuestion: '劳动创造价值、社交表现价值：两者应如何平衡？',
      summary: '文章把劳动与社交视为相互支撑的两种能力，讨论何时应投入作品、何时应投入关系，并指出无用劳动和无用社交都会损害自身价值。',
      options: ['先做事再社交', '社交同样是能力', '不同阶段不同', '取决于行业'],
      quote: '无用劳动和无用社交都会损害自身的价值与地位。',
    }),
    createOfflineMoment({
      id: 'relations-m6', index: 6, title: '相互认可与沟通', anchorParagraphId: 'p48',
      coreQuestion: '关系中的“相互认可”，如何避免变成单方面揣测与讨好？',
      summary: '文章后段把社交重新定义为沟通：既传达自己，也考虑对方立场；人格平等是坦率协作的前提。',
      options: ['清晰沟通最重要', '先建立信任', '先照顾对方感受', '关系天然不对等'],
      quote: '沟通不仅仅是为了传达自己的信息与情绪，也要考虑对方的立场和情绪。',
    }),
    createOfflineMoment({
      id: 'relations-m7', index: 7, title: '人格价值与信任', anchorParagraphId: 'p58',
      coreQuestion: '能力、资源与人格价值，哪一个更决定长期合作的可靠性？',
      summary: '文章将人格价值解释为利益交换的可靠性：做事周到、可信赖的人，能降低协作中的不确定性。',
      options: ['人格价值最根本', '能力更有决定性', '资源更现实', '三者相互支撑'],
      quote: '社交的本质是社会层面的利益交换，人格价值决定了利益交换的可靠性。',
    }),
  ],
}

export function getMoments(articleId) {
  // 内置长文直接使用预生成的讨论瞬间；动态导入内容仍由 AI 分析。
  return momentsByArticleId[articleId] || builtInOfflineMoments[articleId] || momentsByArticleId.a1
}

export function getSpace(momentId) {
  return discussionSpaces[momentId] || discussionSpaces.m1
}
