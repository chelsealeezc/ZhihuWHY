import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState(null)

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' })
      const data = await res.json()
      if (data.authorized && data.profile) {
        setUser(data.profile)
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
      setLoginError(params.get('code') || '登录失败，请重试')
    }
  }, [refreshStatus])

  const login = useCallback(() => {
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
