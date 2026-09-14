import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const LOGIN_ERROR_MESSAGES = {
  SERVER_CONFIG_MISSING: '登录服务尚未配置完整，请检查 Vercel 环境变量。',
  STATE_EXPIRED: '登录等待时间过长，请重新连接知乎。',
  STATE_MISMATCH: '登录状态校验失败，请重新连接知乎。',
  STATE_MISSING: '知乎授权回调缺少登录状态，请检查回调配置。',
  CODE_MISSING: '知乎没有返回授权结果，请重新连接知乎。',
  TOKEN_EXCHANGE_FAILED: '知乎授权失败，请确认 OAuth 回调地址配置正确。',
  TOKEN_EXPIRED: '知乎授权已过期，请重新登录。',
  OAUTH_FAILED: '知乎登录失败，请稍后重试。',
}

function readableLoginError(code, fallback) {
  return LOGIN_ERROR_MESSAGES[code] || fallback || '知乎登录失败，请稍后重试。'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState(null)

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || data?.ok === false) {
        setLoginError(readableLoginError(data?.error?.code, data?.error?.message))
      }
      if (data.authorized) {
        setUser(data.profile || { name: '已授权知乎用户' })
      } else {
        setUser(null)
      }
      return data
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    // 检查 URL 上的登录结果提示
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === 'error') {
      setLoginError(readableLoginError(params.get('code')))
    }
  }, [refreshStatus])

  const login = useCallback(() => {
    setLoginError(null)
    window.location.href = '/api/auth/start'
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, loginError, login, logout, refreshStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
