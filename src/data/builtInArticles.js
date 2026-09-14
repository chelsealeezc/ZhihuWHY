import humanRelationsMarkdown from './articles/human-relations.md?raw'
import energyMarkdown from './articles/success-energy.md?raw'

function plainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\\([.#?])/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function markdownToBlocks(markdown) {
  const voteupLine = markdown.match(/(?:^|\n)[^\n]*?人赞同\s*\n/)
  const afterAnswerMeta = voteupLine
    ? markdown.slice((voteupLine.index || 0) + voteupLine[0].length)
    : markdown
  const body = afterAnswerMeta.split(/\n\[编辑于/)[0]

  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(-{3,}|—{3,})$/.test(block))
    .map((block, index) => {
      const heading = block.match(/^#{1,6}\s+(.+)$/)
      return {
        id: `p${index + 1}`,
        kind: heading ? 'heading' : 'paragraph',
        text: plainText(heading ? heading[1] : block),
      }
    })
    .filter((block) => block.text)
}

function createArticle({ id, title, author, bio, voteup, comments, sourceUrl, markdown }) {
  const paragraphs = markdownToBlocks(markdown)
  return {
    id,
    type: 'answer',
    question: title,
    author: { name: author, bio, followers: null },
    voteup,
    comments,
    sourceUrl,
    paragraphs,
  }
}

export const builtInArticlesById = {
  'human-relations': createArticle({
    id: 'human-relations',
    title: '人情世故是怎样慢慢学会的？',
    author: 'The Advancer',
    bio: '我选择出谋划策，而不去辩驳是非。',
    voteup: 54000,
    comments: 1338,
    sourceUrl: 'https://www.zhihu.com/question/433658322/answer/2130040041',
    markdown: humanRelationsMarkdown,
  }),
  'success-energy': createArticle({
    id: 'success-energy',
    title: '为什么成功人士的精力都非常旺盛？',
    author: '黑猫',
    bio: '白日慵懒，黑夜捕梦。',
    voteup: 13000,
    comments: 647,
    sourceUrl: 'https://www.zhihu.com/question/1908398681012548518/answer/1999089423606891302',
    markdown: energyMarkdown,
  }),
}

export const builtInArticleCards = Object.values(builtInArticlesById).map((article) => ({
  id: article.id,
  builtin: true,
  type: article.type,
  question: article.question,
  title: article.question,
  author: article.author.name,
  excerpt: article.paragraphs.find((block) => block.kind === 'paragraph')?.text || '',
  voteup: article.voteup,
  comments: article.comments,
  favoritedAt: '',
}))
