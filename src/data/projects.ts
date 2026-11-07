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
    id: 'bruineats',
    fileName: 'bruineats.exe',
    title: 'BruinEats',
    category: 'Web Development',
    description:
      "A single-page UCLA dining app with live menus, ratings, and analytics, replacing UCLA's multi-page navigation.",
    longDescription:
      "A full-stack dining app for UCLA students (Jan. – Mar. 2026). A React frontend and Node.js backend use Firebase for real-time data, and a Python web scraper keeps menu data up to date automatically. It replaces UCLA's multi-page dining navigation with a single-page interface, a ratings system, and analytics.",
    tags: ['React', 'Node.js', 'Vite', 'Firebase', 'Python'],
    image: '',
  },
  {
    id: 'bur-fish-robot',
    fileName: 'bur_fish_robot.txt',
    title: 'BUR Fish Robot',
    category: 'Robotics',
    description: 'A bio-inspired robotic fish with simulated swimming gaits, a ROS control pipeline, and YOLO-based navigation.',
    longDescription:
      'A robotic fish (Jul. 2026 – present). I simulated swimming gaits in MuJoCo, tuning tail frequency, amplitude, and phase to optimize forward speed before hardware testing. I built a Gazebo simulation with a ROS control pipeline that closes the loop between IMU and depth sensors and servo actuators on a Raspberry Pi, and deployed YOLO object detection on a Jetson for autonomous navigation.',
    tags: ['ROS', 'Gazebo', 'MuJoCo', 'Python', 'Docker', 'YOLO'],
    image: '',
  },
  {
    id: 'underwater-rov',
    fileName: 'underwater_rov.txt',
    title: 'Underwater ROV',
    category: 'Robotics',
    description:
      'An 8-thruster, 2-arm underwater ROV for MATE ROV 2025. I led the 11-person software subteam.',
    longDescription:
      'An underwater ROV built for MATE ROV 2025 (Jan. – Jul. 2025). I led an 11-person software subteam on the control systems and embedded firmware. I derived a 6-DOF kinematic model in MATLAB mapping 8 thruster forces to vehicle motion and implemented the thrust allocation in C++ with Eigen. A PID auto-leveling controller using IMU pitch and roll feedback cut steady-state error from 8° to under 1°. Moving video streaming to UDP sockets cut latency by 70%.',
    tags: ['C++', 'Python', 'Eigen', 'KiCAD', 'Raspberry Pi', 'MATE ROV'],
    image: '',
  },
]

export function getProjectById(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id)
}

export function getProjectsByCategory(category: ProjectCategory): Project[] {
  return PROJECTS.filter((project) => project.category === category)
}
