import { randomBytes, timingSafeEqual } from 'node:crypto'
import { oauthConfig } from './config.mjs'

const sessions = new Map()
const SESSION_COOKIE = 'zhihuwhy_session'
const SESSION_MAX_AGE = 8 * 60 * 60 // 8 小时

function sessionId(request) {
  const cookie = request.headers.cookie || ''
  const match = cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(SESSION_COOKIE + '='))
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null
}

function getSession(request, response) {
  let id = sessionId(request)
  let session = id ? sessions.get(id) : null
  if (!session) {
    id = randomBytes(24).toString('base64url')
    session = {
      id,
      state: null,
      stateExpiresAt: 0,
      token: null,
      expiresAt: null,
      profile: null,
      error: null,
    }
    sessions.set(id, session)
    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`,
    )
  }
  return session
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && timingSafeEqual(x, y)
}

function buildRedirectUri(request) {
  if (oauthConfig.redirectUri) return oauthConfig.redirectUri
  const proto = request.headers['x-forwarded-proto'] || 'https'
  const host = request.headers['x-forwarded-host'] || request.headers.host
  return `${proto}://${host}/api/auth/callback`
}

// 发起授权：生成 state 并返回知乎授权页 URL
export function startAuth(request, response) {
  const session = getSession(request, response)
  session.state = randomBytes(24).toString('base64url')
  session.stateExpiresAt = Date.now() + 10 * 60 * 1000 // 10 分钟有效
  session.error = null

  const params = new URLSearchParams({
    redirect_uri: buildRedirectUri(request),
    app_id: oauthConfig.appId,
    response_type: 'code',
    state: session.state,
  })
  return `${oauthConfig.authorizeUrl}?${params.toString()}`
}

// 处理回调：校验 state → 换 token → 拉用户信息
export async function handleCallback(request, response, url) {
  const session = getSession(request, response)
  const code = url.searchParams.get('authorization_code') || url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')

  if (!code) {
    throw Object.assign(new Error('回调缺少 authorization_code'), { code: 'CODE_MISSING' })
  }
  if (!session.state || Date.now() > session.stateExpiresAt) {
    throw Object.assign(new Error('state 已过期，请重新登录'), { code: 'STATE_EXPIRED' })
  }
  if (returnedState && !safeEqual(returnedState, session.state)) {
    throw Object.assign(new Error('state 校验失败'), { code: 'STATE_MISMATCH' })
  }

  // 交换 access_token
  const form = new URLSearchParams({
    app_id: oauthConfig.appId,
    app_key: oauthConfig.appKey,
    grant_type: 'authorization_code',
    redirect_uri: buildRedirectUri(request),
    code,
  }).toString()

  const tokenRes = await fetch(oauthConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData?.access_token || tokenData?.data?.access_token || tokenData?.Data?.access_token
  if (!accessToken) {
    const msg = tokenData?.message || tokenData?.data?.message || '未获得 OAuth access token'
    throw Object.assign(new Error(msg), { code: 'TOKEN_EXCHANGE_FAILED' })
  }

  const expiresIn = Number(tokenData?.expires_in ?? tokenData?.data?.expires_in ?? tokenData?.Data?.expires_in)
  session.token = accessToken
  session.expiresAt = Number.isFinite(expiresIn) ? Date.now() + expiresIn * 1000 : null
  session.state = null
  session.stateExpiresAt = 0
  session.error = null

  // 拉取用户基础信息
  try {
    const profileRes = await fetch(oauthConfig.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profileData = await profileRes.json()
    const src = profileData?.data || profileData?.Data || profileData
    if (src && typeof src === 'object') {
      session.profile = {
        uid: src.uid != null ? String(src.uid) : null,
        hashId: src.hash_id || src.HashId || null,
        name: src.fullname || src.Fullname || src.name || null,
        avatar: src.avatar_path || src.AvatarUrl || src.avatar_url || null,
        headline: src.headline || src.Headline || null,
        url: src.url || src.Url || null,
      }
    }
  } catch {
    session.profile = null
  }
}

// 返回当前登录状态
export function getAuthStatus(request, response) {
  const session = getSession(request, response)
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    session.token = null
    session.profile = null
    session.error = { code: 'TOKEN_EXPIRED', message: '授权已过期，请重新登录' }
  }
  return {
    authorized: Boolean(session.token),
    profile: session.profile,
    expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
    error: session.error,
  }
}

export function logout(request, response) {
  const session = getSession(request, response)
  session.token = null
  session.expiresAt = null
  session.profile = null
  session.state = null
  session.stateExpiresAt = 0
  session.error = null
}

// 读取当前授权用户的近期收藏
export async function getCollections(request, response, limit = 20) {
  const session = getSession(request, response)
  if (!session.token) {
    throw Object.assign(new Error('请先完成知乎账号授权'), { code: 'LOGIN_REQUIRED' })
  }
  const params = new URLSearchParams({ Limit: String(limit) })
  const res = await fetch(`${oauthConfig.userApiBase}/api/v1/user/collections?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${oauthConfig.accessSecret}`,
      'X-OAuth-Token': session.token,
      'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json()
  if (data?.Code !== 0) {
    throw Object.assign(new Error(data?.Message || '收藏接口失败'), { code: 'API_ERROR' })
  }
  return data?.Data?.Items || []
}

// 读取授权用户的创作内容
export async function getContents(request, response, type = 'all', limit = 20) {
  const session = getSession(request, response)
  if (!session.token) {
    throw Object.assign(new Error('请先完成知乎账号授权'), { code: 'LOGIN_REQUIRED' })
  }
  const params = new URLSearchParams({
    ContentType: type,
    Limit: String(limit),
    Offset: '0',
    SortField: 'ts',
    SortOrder: 'desc',
  })
  const res = await fetch(`${oauthConfig.userApiBase}/api/v1/user/contents?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${oauthConfig.accessSecret}`,
      'X-OAuth-Token': session.token,
      'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json()
  if (data?.Code !== 0) {
    throw Object.assign(new Error(data?.Message || '内容接口失败'), { code: 'API_ERROR' })
  }
  return data?.Data?.Items || []
}
