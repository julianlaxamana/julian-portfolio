import { useEffect, useRef, useState } from 'react'
import './AboutContent.css'

const HOVER_PHOTOS = ['/julian2.jpg', '/julian3.jpg']
const TAP_DISPLAY_MS = 700

export default function AboutContent() {
  const [hoverSrc, setHoverSrc] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [transitionId, setTransitionId] = useState(0)
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
  }, [])

  const triggerGlitch = () => {
    setHoverSrc(HOVER_PHOTOS[Math.floor(Math.random() * HOVER_PHOTOS.length)])
    setIsHovering(true)
    setTransitionId((id) => id + 1)
  }

  const revertGlitch = () => {
    setIsHovering(false)
    setTransitionId((id) => id + 1)
  }

  const handleTap = () => {
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
    triggerGlitch()
    tapTimeoutRef.current = setTimeout(revertGlitch, TAP_DISPLAY_MS)
  }

  const baseClass =
    transitionId === 0
      ? 'about-photo__img'
      : `about-photo__img ${isHovering ? 'about-photo__img--glitch-out' : 'about-photo__img--glitch-in'}`

  return (
    <div className="about-content">
      <div className="about-header">
        <div
          className="about-photo"
          onMouseEnter={triggerGlitch}
          onMouseLeave={revertGlitch}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={handleTap}
        >
          <img key={`base-${transitionId}`} className={baseClass} src="/julian.jpg" alt="Julian Laxamana" />
          {hoverSrc && (
            <img
              key={`hover-${transitionId}`}
              className={`about-photo__img ${isHovering ? 'about-photo__img--glitch-in' : 'about-photo__img--glitch-out'}`}
              src={hoverSrc}
              alt=""
              aria-hidden="true"
            />
          )}
        </div>
        <div className="about-heading">
          <h2 className="about-title">Julian Laxamana</h2>
          <p className="about-subtitle">Software Engineer</p>
          <p className="about-subtitle">Building weird little things on the web</p>
        </div>
      </div>
      <p className="about-bio">Hi, I&apos;m Julian. This desktop is a work in progress — more soon.</p>
    </div>
  )
}
