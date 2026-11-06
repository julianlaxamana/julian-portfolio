import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../data/projects'
import './AboutContent.css'

const HOVER_PHOTOS = ['/julian2.jpg', '/julian3.jpg']
const TAP_DISPLAY_MS = 700

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 448 512" aria-hidden="true">
      <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.19a53.19 53.19 0 0 1 106.38 0c0 30.31-24.1 54.91-52.59 54.91zM447.9 448h-92.68V302.4c0-34.7-.7-79.3-48.29-79.3-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3z" />
    </svg>
  )
}

function ProjectImagePlaceholder() {
  return (
    <div className="about-project__image about-project__image--placeholder">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v16H4V4zm2 2v10.59l4-4 3 3 5-5V6H6zm2 8.83l2.29-2.29a1 1 0 0 1 1.42 0L12 12.83l3.29-3.3a1 1 0 0 1 1.42 0L18 10.83V6H6v8.83zM9 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    </div>
  )
}

type AboutContentProps = {
  onOpenProject: (id: string) => void
}

export default function AboutContent({ onOpenProject }: AboutContentProps) {
  const [hoverSrc, setHoverSrc] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [transitionId, setTransitionId] = useState(0)
  const [projectIndex, setProjectIndex] = useState(0)
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

  const project = PROJECTS[projectIndex]

  const goToPrevProject = () => {
    setProjectIndex((index) => (index - 1 + PROJECTS.length) % PROJECTS.length)
  }

  const goToNextProject = () => {
    setProjectIndex((index) => (index + 1) % PROJECTS.length)
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
          <p className="about-subtitle">Computer Science @ UCLA</p>
          <p className="about-subtitle">nihilistic penguin is my role model</p>
        </div>
        <div className="about-social">
          <a
            className="about-social__link"
            href="https://github.com/julianlaxamana"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <GithubIcon />
          </a>
          <a
            className="about-social__link"
            href="https://www.linkedin.com/in/julian-laxamana/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <LinkedinIcon />
          </a>
        </div>
      </div>
      <hr className="about-divider" />
      <p className="about-bio">
        Hi, my name is Julian Laxamana. I am currently in my 4th year at UCLA and I&apos;m interested in embedded
        systems, robotics, and machine learning. I also occasionally participate in game jams too!
      </p>
      <p className="about-bio">
        Reach out to me at julianlaxamana [at] ucla [dot] edu or send me a message on this website!
      </p>

      <div className="about-section">
        <span className="about-section__title">Education</span>
        <div className="about-edu-list">
          <div className="about-edu-item">
            <div className="about-edu-item__rail">
              <span className="about-edu-item__icon">
                <img src="/ucla.png" alt="UCLA logo" />
              </span>
            </div>
            <div className="about-edu-item__body">
              <div className="about-edu-item__info">
                <p className="about-section__item">B.S. Computer Science</p>
                <p className="about-section__meta">University of California, Los Angeles</p>
              </div>
              <p className="about-section__years">2025 – 2027</p>
            </div>
          </div>
          <div className="about-edu-item">
            <div className="about-edu-item__rail">
              <span className="about-edu-item__icon">
                <img src="/ccc.png" alt="Clovis Community College logo" />
              </span>
            </div>
            <div className="about-edu-item__body">
              <div className="about-edu-item__info">
                <p className="about-section__item">A.S. Computer Science</p>
                <p className="about-section__meta">Clovis Community College</p>
              </div>
              <p className="about-section__years">2023 – 2025</p>
            </div>
          </div>
        </div>
      </div>

      <div className="about-section">
        <span className="about-section__title">Featured Projects</span>
        <div className="about-projects">
          <button
            type="button"
            className="about-projects__arrow"
            aria-label="Previous project"
            onClick={goToPrevProject}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            ‹
          </button>
          <div className="about-project">
            {project.image ? (
              <img className="about-project__image" src={project.image} alt={project.title} />
            ) : (
              <ProjectImagePlaceholder />
            )}
            <div className="about-project__body">
              <p className="about-project__title">{project.title}</p>
              <p className="about-project__description">{project.description}</p>
              <div className="about-project__tags">
                {project.tags.map((tag) => (
                  <span className="about-project__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="about-project__open"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={() => onOpenProject(project.id)}
              >
                Open Project
              </button>
            </div>
          </div>
          <button
            type="button"
            className="about-projects__arrow"
            aria-label="Next project"
            onClick={goToNextProject}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            ›
          </button>
        </div>
        <div className="about-projects__dots">
          {PROJECTS.map((p, i) => (
            <span
              key={p.title}
              className={`about-projects__dot ${i === projectIndex ? 'about-projects__dot--active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
