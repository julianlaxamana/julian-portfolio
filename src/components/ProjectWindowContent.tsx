import type { Project } from '../data/projects'
import './ProjectWindowContent.css'

function ProjectImagePlaceholder() {
  return (
    <div className="project-window__image project-window__image--placeholder">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v16H4V4zm2 2v10.59l4-4 3 3 5-5V6H6zm2 8.83l2.29-2.29a1 1 0 0 1 1.42 0L12 12.83l3.29-3.3a1 1 0 0 1 1.42 0L18 10.83V6H6v8.83zM9 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    </div>
  )
}

type ProjectWindowContentProps = {
  project: Project | undefined
}

export default function ProjectWindowContent({ project }: ProjectWindowContentProps) {
  if (!project) {
    return (
      <div className="project-window project-window--missing">
        <p>This project could not be found.</p>
      </div>
    )
  }

  const hasLinks = Boolean(project.githubUrl || project.liveUrl)

  return (
    <div className="project-window">
      {project.image ? (
        <img className="project-window__image" src={project.image} alt={project.title} />
      ) : (
        <ProjectImagePlaceholder />
      )}
      <div className="project-window__body">
        <p className="project-window__title">{project.title}</p>
        <p className="project-window__description">{project.longDescription ?? project.description}</p>
        <div className="project-window__tags">
          {project.tags.map((tag) => (
            <span className="project-window__tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {hasLinks && (
          <div className="project-window__links">
            {project.githubUrl && (
              <a
                className="project-window__link"
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                View Source
              </a>
            )}
            {project.liveUrl && (
              <a
                className="project-window__link"
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                Live Demo
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
