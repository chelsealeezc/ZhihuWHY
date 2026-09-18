import { useEffect, useState } from 'react'

export default function UserAvatar({ name = '知乎用户', src = '', size = '', className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const classes = ['avatar', size, className].filter(Boolean).join(' ')

  useEffect(() => setImageFailed(false), [src])

  return (
    <span className={classes} aria-label={`${name} 的头像`}>
      {src && !imageFailed ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
      ) : (
        name.slice(0, 1) || '知'
      )}
    </span>
  )
}
