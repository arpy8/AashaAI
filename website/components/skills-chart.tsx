"use client"

interface Skill {
  skill: string
  matches: number
  percentage: number
}

interface SkillsChartProps {
  skills: Skill[]
}

export function SkillsChart({ skills }: SkillsChartProps) {
  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={skill.skill} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{skill.skill}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">{skill.matches} matches</span>
              <span className="text-xs font-medium text-primary">{skill.percentage}%</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${skill.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
