export const PROJECT_CATEGORIES = ['Web Development', 'Games', 'Robotics'] as const
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

export type Project = {
  id: string
  fileName: string
  title: string
  category: ProjectCategory
  description: string
  longDescription?: string
  tags: string[]
  image: string
  githubUrl?: string
  liveUrl?: string
}

export const PROJECTS: Project[] = [
  {
    id: 'desktop-portfolio',
    fileName: 'desktop_portfolio.exe',
    title: 'This Desktop Portfolio',
    category: 'Web Development',
    description:
      'A recreation of a retro desktop OS built with React and a custom WebGL CRT shader, complete with draggable windows and a boot sequence.',
    tags: ['React', 'WebGL', 'TypeScript'],
    image: '',
  },
  {
    id: 'project-two',
    fileName: 'project_two.txt',
    title: 'Project Two',
    category: 'Games',
    description: 'Placeholder description — swap this out with a real project once details are ready.',
    tags: ['Placeholder', 'Tag'],
    image: '',
  },
  {
    id: 'project-three',
    fileName: 'project_three.txt',
    title: 'Project Three',
    category: 'Robotics',
    description: 'Placeholder description — swap this out with a real project once details are ready.',
    tags: ['Placeholder', 'Tag'],
    image: '',
  },
]

export function getProjectById(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id)
}

export function getProjectsByCategory(category: ProjectCategory): Project[] {
  return PROJECTS.filter((project) => project.category === category)
}
