import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const COOKIE_NAME = 'zhihuwhy_session'
const MAX_AGE_SECONDS = 8 * 60 * 60

function key() {
  const secret = process.env.SESSION_SECRET || ''
  if (secret.length < 32) {
    throw Object.assign(new Error('服务端缺少至少 32 字符的环境变量：SESSION_SECRET'), {
      code: 'SERVER_CONFIG_MISSING',
      status: 503,
    })
  }
  return createHash('sha256').update(secret).digest()
}

function cookieValue(request) {
  const cookie = request.headers.cookie || ''
  const entry = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : ''
}

function seal(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

function unseal(value) {
  const [ivText, tagText, encryptedText] = String(value || '').split('.')
  if (!ivText || !tagText || !encryptedText) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64url')),
      decipher.final(),
    ])
    return JSON.parse(decrypted.toString('utf8'))
  } catch {
    return null
  }
}

function isSecureRequest(request) {
  const proto = request.headers['x-forwarded-proto']
  return proto === 'https' || process.env.NODE_ENV === 'production'
}

export function readSession(request) {
  const session = unseal(cookieValue(request))
  if (!session || typeof session !== 'object') {
    return { state: null, stateExpiresAt: 0, token: null, expiresAt: null, profile: null }
  }
  return session
}

export function writeSession(request, response, session) {
  const secure = isSecureRequest(request) ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(seal(session))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}${secure}`,
  )
}

export function clearSession(request, response) {
  const secure = isSecureRequest(request) ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  )
}
