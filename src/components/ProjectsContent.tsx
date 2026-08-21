import { useState } from 'react'
import { PROJECT_CATEGORIES, getProjectsByCategory, type ProjectCategory } from '../data/projects'
import './ProjectsContent.css'

function FileIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M22 8 H62 L78 24 V92 H22 Z" fill="#ffffff" stroke="#8a8f98" strokeWidth="2" />
      <path d="M62 8 V24 H78 Z" fill="#e4e0d8" stroke="#8a8f98" strokeWidth="2" />
      <rect x="32" y="44" width="38" height="5" fill="#4a5568" />
      <rect x="32" y="56" width="38" height="5" fill="#4a5568" />
      <rect x="32" y="68" width="24" height="5" fill="#4a5568" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="13" y="26" width="33" height="10" fill="#f2b705" />
      <rect x="13" y="34" width="74" height="50" fill="#ffce3d" stroke="#8a6d1a" strokeWidth="1" />
    </svg>
  )
}

type ProjectsContentProps = {
  onOpenProject: (id: string) => void
}

type Selection = { type: 'folder' | 'file'; id: string } | null

export default function ProjectsContent({ onOpenProject }: ProjectsContentProps) {
  const [openFolder, setOpenFolder] = useState<ProjectCategory | null>(null)
  const [selection, setSelection] = useState<Selection>(null)

  const goToRoot = () => {
    setOpenFolder(null)
    setSelection(null)
  }

  const openFolderView = (category: ProjectCategory) => {
    setOpenFolder(category)
    setSelection(null)
  }

  return (
    <div className="projects-content" onClick={() => setSelection(null)}>
      <div className="projects-content__breadcrumbs">
        <button
          type="button"
          className={`projects-breadcrumb${openFolder === null ? ' projects-breadcrumb--current' : ''}`}
          disabled={openFolder === null}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            goToRoot()
          }}
        >
          Projects
        </button>
        {openFolder && (
          <>
            <span className="projects-breadcrumb__sep">›</span>
            <span className="projects-breadcrumb projects-breadcrumb--current">{openFolder}</span>
          </>
        )}
      </div>
      <div className="projects-content__grid">
        {openFolder === null
          ? PROJECT_CATEGORIES.map((category) => (
              <div
                key={category}
                className={`projects-file${
                  selection?.type === 'folder' && selection.id === category ? ' projects-file--selected' : ''
                }`}
                role="button"
                tabIndex={0}
                aria-label={category}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelection({ type: 'folder', id: category })
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  openFolderView(category)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFolderView(category)
                  }
                }}
              >
                <div className="projects-file__icon">
                  <FolderIcon />
                </div>
                <span className="projects-file__label">{category}</span>
              </div>
            ))
          : getProjectsByCategory(openFolder).map((project) => (
              <div
                key={project.id}
                className={`projects-file${
                  selection?.type === 'file' && selection.id === project.id ? ' projects-file--selected' : ''
                }`}
                role="button"
                tabIndex={0}
                aria-label={project.title}
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelection({ type: 'file', id: project.id })
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  onOpenProject(project.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenProject(project.id)
                  }
                }}
              >
                <div className="projects-file__icon">
                  <FileIcon />
                </div>
                <span className="projects-file__label">{project.fileName}</span>
              </div>
            ))}
      </div>
    </div>
  )
}
