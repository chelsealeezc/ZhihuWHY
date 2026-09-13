import http from 'node:http'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serverPort } from './config.mjs'
import {
  startAuth,
  handleCallback,
  getAuthStatus,
  logout,
  getCollections,
  getContents,
} from './oauth.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
])

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' })
  res.end()
}

async function serveStatic(res, urlPath) {
  let filePath = path.join(distDir, urlPath === '/' ? '/index.html' : urlPath)
  // 防止路径穿越
  if (!filePath.startsWith(distDir)) {
    return json(res, 403, { ok: false, error: '禁止访问' })
  }
  if (!existsSync(filePath)) {
    // SPA fallback：非静态资源回退到 index.html
    filePath = path.join(distDir, 'index.html')
  }
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, { 'Content-Type': types.get(ext) || 'application/octet-stream' })
  res.end(await readFile(filePath))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname

  try {
    // ---- OAuth / 用户接口 ----
    if (p === '/api/auth/status' && req.method === 'GET') {
      return json(res, 200, { ok: true, ...getAuthStatus(req, res) })
    }

    if (p === '/api/auth/start' && req.method === 'GET') {
      try {
        return redirect(res, startAuth(req, res))
      } catch (e) {
        return json(res, 400, { ok: false, error: { code: e.code, message: e.message } })
      }
    }

    if (p === '/api/auth/callback' && req.method === 'GET') {
      try {
        await handleCallback(req, res, url)
        return redirect(res, '/?login=success')
      } catch (e) {
        return redirect(res, `/?login=error&code=${e.code || 'OAUTH_FAILED'}`)
      }
    }

    if (p === '/api/auth/logout' && req.method === 'POST') {
      logout(req, res)
      return json(res, 200, { ok: true })
    }

    if (p === '/api/user/collections' && req.method === 'GET') {
      try {
        const limit = Number(url.searchParams.get('limit')) || 20
        const items = await getCollections(req, res, Math.min(limit, 50))
        return json(res, 200, { ok: true, items })
      } catch (e) {
        return json(res, 401, { ok: false, error: { code: e.code, message: e.message } })
      }
    }

    if (p === '/api/user/contents' && req.method === 'GET') {
      try {
        const type = url.searchParams.get('type') || 'all'
        const limit = Number(url.searchParams.get('limit')) || 20
        const items = await getContents(req, res, type, Math.min(limit, 50))
        return json(res, 200, { ok: true, items })
      } catch (e) {
        return json(res, 401, { ok: false, error: { code: e.code, message: e.message } })
      }
    }

    // ---- 静态资源 ----
    if (req.method === 'GET') {
      return serveStatic(res, p)
    }

    return json(res, 405, { ok: false, error: '不支持的请求方法' })
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message })
  }
})

server.listen(serverPort, '0.0.0.0', () => {
  process.stdout.write(`ZhihuWHY 服务已启动: http://localhost:${serverPort}/\n`)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)))
}
