import { useEffect, useState } from 'react'

const STORAGE_KEY = 'zhihuwhy:followed-authors:v1'

function readFollowedAuthors() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || [])
  } catch {
    return new Set()
  }
}

export default function FollowButton({ authorKey, className = '' }) {
  const key = String(authorKey || '').trim()
  const [followed, setFollowed] = useState(() => key && readFollowedAuthors().has(key))

  useEffect(() => {
    setFollowed(Boolean(key && readFollowedAuthors().has(key)))
    function syncFollowState(event) {
      if (!event.detail || event.detail.key === key) {
        setFollowed(Boolean(key && readFollowedAuthors().has(key)))
      }
    }
    window.addEventListener('zhihuwhy:follow-change', syncFollowState)
    return () => window.removeEventListener('zhihuwhy:follow-change', syncFollowState)
  }, [key])

  function toggleFollow() {
    if (!key) return
    const followedAuthors = readFollowedAuthors()
    if (followedAuthors.has(key)) followedAuthors.delete(key)
    else followedAuthors.add(key)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedAuthors]))
    } catch {
      // The button still works for the current page when storage is unavailable.
    }
    setFollowed(followedAuthors.has(key))
    window.dispatchEvent(new CustomEvent('zhihuwhy:follow-change', { detail: { key } }))
  }

  return (
    <button
      type="button"
      className={`${className}${followed ? ' followed' : ''}`}
      aria-pressed={followed}
      title={followed ? '取消在回响中关注' : '在回响中关注该用户'}
      onClick={toggleFollow}
    >
      {followed ? '✓ 已关注' : '+ 关注'}
    </button>
  )
}
