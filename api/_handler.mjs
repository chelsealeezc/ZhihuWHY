import {
  getAuthStatus,
  getCollections,
  getContents,
  handleCallback,
  logout,
  startAuth,
} from '../server/oauth.mjs'
import {
  analyzeArticle,
  chatWithPersona,
  classifyRelatedContent,
  generateVoteOptionSets,
} from '../server/ai.mjs'
import { searchZhihu } from '../server/zhihu.mjs'

function json(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

function redirect(response, location) {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.setHeader('Cache-Control', 'no-store')
  response.end()
}

function requestUrl(request) {
  const proto = request.headers['x-forwarded-proto'] || 'https'
  const host = request.headers['x-forwarded-host'] || request.headers.host
  return new URL(request.url, `${proto}://${host}`)
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object') return request.body
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1024 * 1024) {
      throw Object.assign(new Error('请求内容不能超过 1 MB'), {
        code: 'PAYLOAD_TOO_LARGE',
        status: 413,
      })
    }
    chunks.push(chunk)
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
  } catch {
    throw Object.assign(new Error('请求 JSON 格式无效'), { code: 'INVALID_JSON', status: 400 })
  }
}

function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed)
  json(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } })
}

export async function dispatch(route, request, response) {
  const url = requestUrl(request)
  try {
    if (route === 'auth/status') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      return json(response, 200, { ok: true, ...getAuthStatus(request, response) })
    }
    if (route === 'auth/start') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      return redirect(response, startAuth(request, response))
    }
    if (route === 'auth/callback') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      await handleCallback(request, response, url)
      return redirect(response, '/?login=success')
    }
    if (route === 'auth/logout') {
      if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
      logout(request, response)
      return json(response, 200, { ok: true })
    }
    if (route === 'user/collections') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      const items = await getCollections(request, response, Math.min(Number(url.searchParams.get('limit')) || 20, 50))
      return json(response, 200, { ok: true, items })
    }
    if (route === 'user/contents') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      const items = await getContents(
        request,
        response,
        url.searchParams.get('type') || 'all',
        Math.min(Number(url.searchParams.get('limit')) || 20, 50),
      )
      return json(response, 200, { ok: true, items })
    }
    if (route === 'discussions/analyze') {
      if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
      const body = await readJson(request)
      const moments = await analyzeArticle(body.article)
      return json(response, 200, { ok: true, moments })
    }
    if (route === 'discussions/options') {
      if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
      const body = await readJson(request)
      const requestedMoments = Array.isArray(body.moments)
        ? body.moments
        : [body.moment].filter(Boolean)
      const optionSets = await generateVoteOptionSets(requestedMoments)
      return json(response, 200, { ok: true, optionSets })
    }
    if (route === 'discussions/persona-chat') {
      if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
      const body = await readJson(request)
      const reply = await chatWithPersona(body)
      return json(response, 200, { ok: true, reply })
    }
    if (route === 'discussions/recommend') {
      if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
      const body = await readJson(request)
      if (!body.moment?.coreQuestion || !Array.isArray(body.selectedOpinions) || body.selectedOpinions.length === 0) {
        throw Object.assign(new Error('讨论问题和用户选择均不能为空'), {
          code: 'RECOMMENDATION_INPUT_REQUIRED',
          status: 400,
        })
      }
      const suppliedCandidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 10) : []
      const search = suppliedCandidates.length > 0
        ? { items: suppliedCandidates, searchHashId: null }
        : await searchZhihu(body.moment?.searchQuery || body.moment?.coreQuestion, 10, body.moment?.coreQuestion)
      const groups = await classifyRelatedContent(body.moment, body.selectedOpinions, search.items)
      return json(response, 200, { ok: true, groups, searchHashId: search.searchHashId })
    }
    if (route === 'zhihu/search') {
      if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
      const result = await searchZhihu(url.searchParams.get('query'), url.searchParams.get('count'), url.searchParams.get('fallback'))
      return json(response, 200, { ok: true, ...result })
    }
    return json(response, 404, { ok: false, error: { code: 'NOT_FOUND', message: '接口不存在' } })
  } catch (error) {
    if (route === 'auth/callback' || route === 'auth/start') {
      return redirect(response, `/?login=error&code=${encodeURIComponent(error.code || 'OAUTH_FAILED')}`)
    }
    return json(response, error.status || (error.code === 'LOGIN_REQUIRED' ? 401 : 500), {
      ok: false,
      error: { code: error.code || 'INTERNAL_ERROR', message: error.message },
    })
  }
}
