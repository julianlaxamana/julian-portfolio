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
    id: 'white-noise',
    fileName: 'white_noise.exe',
    title: 'White Noise',
    category: 'Games',
    description: 'A short VHS-inspired pixel horror game made for Ludum Dare 60.',
    longDescription:
      'A short VHS-inspired pixel horror game made for Ludum Dare 60. You play a child hunting spider-monsters in the forest before your mother gets home, taking orders from a cryptid eye on the TV — but the rotting tape may be corrupting more than just the VHS.',
    tags: ['Godot', 'Ludum Dare 60', 'Horror', 'Pixel Art'],
    image: '/games/white-noise.png',
    liveUrl: 'https://joulelion.itch.io/white-noise',
  },
  {
    id: 'stop-the-count',
    fileName: 'stop_the_count.exe',
    title: 'Stop The Count',
    category: 'Games',
    description: 'A sniper game about taking down Count Dracula before the volcano erupts. GMTK Game Jam 2026.',
    longDescription:
      'Made for the GMTK Game Jam 2026. On the tropical Island Vesuvius, the volcano Pompeii is angry because of a vampire — grab your sniper rifle and find Count Dracula before it erupts. I worked on programming with a team of five.',
    tags: ['Godot', 'GMTK Game Jam 2026', 'Shooter', 'Team of 5'],
    image: '/games/stop-the-count.png',
    liveUrl: 'https://joseph-orawiec.itch.io/stop-the-count',
  },
  {
    id: 'help-fih',
    fileName: 'help_fih.exe',
    title: 'Help!, Fih??!',
    category: 'Games',
    description: 'A relaxed (and slightly unsettling) fishing visual novel made for The Very Serious Juniper Dev Game Jam.',
    longDescription:
      'Made for The Very Serious Juniper Dev Game Jam (theme: Spin to Win). A relaxed fishing adventure at a mountain lake full of "fih" — catch them, learn their stories, and keep an eye on the mysterious man lurking nearby. I worked on programming with a team of six.',
    tags: ['Godot', 'Game Jam', 'Visual Novel', 'Team of 6'],
    image: '/games/help-fih.png',
    liveUrl: 'https://joseph-orawiec.itch.io/help-fih',
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
