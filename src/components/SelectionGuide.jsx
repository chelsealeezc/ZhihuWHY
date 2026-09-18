import { useEffect, useState } from 'react'

export default function SelectionGuide({ bodyRef, articleId }) {
  const [position, setPosition] = useState(null)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const paragraphs = [...body.querySelectorAll('p[data-paragraph-id]')]
      .filter((paragraph) => paragraph.textContent.trim().length >= 8)
    let activeParagraph = null
    let finished = false
    let timer

    function dismiss() {
      finished = true
      window.clearTimeout(timer)
      observer.disconnect()
      resizeObserver.disconnect()
      setPosition(null)
    }

    function lineRect(paragraph) {
      const textNode = paragraph.firstChild
      if (textNode?.nodeType !== Node.TEXT_NODE) return null
      const range = document.createRange()
      range.setStart(textNode, 0)
      range.setEnd(textNode, Math.min(textNode.length, 28))
      return range.getClientRects()[0]
    }

    function measure() {
      if (!activeParagraph || finished) return
      const rect = lineRect(activeParagraph)
      if (!rect?.width) return
      const bodyRect = body.getBoundingClientRect()
      setPosition({
        left: rect.left - bodyRect.left,
        top: rect.bottom - bodyRect.top + 2,
        width: rect.width,
      })
    }

    const resizeObserver = new ResizeObserver(measure)
    const observer = new IntersectionObserver((entries) => {
      if (finished || activeParagraph || document.hidden) return
      const paragraph = paragraphs.find((candidate) => {
        const visible = entries.some((entry) => entry.target === candidate && entry.isIntersecting)
        if (!visible) return false
        const rect = lineRect(candidate)
        return rect?.top >= 68 && rect.bottom <= window.innerHeight
      })
      if (!paragraph) return
      activeParagraph = paragraph
      measure()
      resizeObserver.observe(body)
      timer = window.setTimeout(dismiss, 5200)
    }, { rootMargin: '-68px 0px 0px', threshold: 0 })

    function onSelectionChange() {
      const selection = window.getSelection()
      if (!selection?.isCollapsed && body.contains(selection?.anchorNode)) dismiss()
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') dismiss()
    }

    function onVisibilityChange() {
      if (document.hidden && activeParagraph) dismiss()
      if (!document.hidden && !finished && !activeParagraph) {
        observer.disconnect()
        paragraphs.forEach((paragraph) => observer.observe(paragraph))
      }
    }

    function onScroll() {
      if (activeParagraph) dismiss()
    }

    setPosition(null)
    paragraphs.forEach((paragraph) => observer.observe(paragraph))
    body.addEventListener('pointerdown', dismiss)
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      finished = true
      window.clearTimeout(timer)
      observer.disconnect()
      resizeObserver.disconnect()
      body.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('scroll', onScroll)
    }
  }, [articleId, bodyRef])

  return position && (
    <span className="selection-guide" style={position} aria-hidden="true">
      <span className="selection-guide-stroke" />
    </span>
  )
}
