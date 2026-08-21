import './SkillsContent.css'

type SkillGroup = {
  title: string
  skills: string[]
}

const SKILL_GROUPS: SkillGroup[] = [
  { title: 'Languages', skills: ['Java', 'Python', 'C/C++', 'SQL (Postgres)', 'JavaScript', 'HTML/CSS', 'MATLAB', 'Shell'] },
  { title: 'Frameworks', skills: ['React', 'Node.js', 'Flask', 'Vite', 'ROS', 'YOLO'] },
  { title: 'Developer Tools', skills: ['Git', 'Docker', 'Google Cloud Platform', 'VS Code', 'Visual Studio', 'Vim', 'Raspberry Pi', 'ESP32'] },
  { title: 'Libraries', skills: ['pandas', 'NumPy', 'Matplotlib', 'raylib', 'tkinter', 'Qt'] },
]

export default function SkillsContent() {
  return (
    <div className="skills-content">
      {SKILL_GROUPS.map((group) => (
        <div className="skills-section" key={group.title}>
          <span className="skills-section__title">{group.title}</span>
          <div className="skills-tags">
            {group.skills.map((skill) => (
              <span className="skills-tag" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
