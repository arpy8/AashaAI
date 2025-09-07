"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const [jobTypes, setJobTypes] = useState<string[]>([])
  const [location, setLocation] = useState("")
  const [salaryRange, setSalaryRange] = useState([20])
  const [skills, setSkills] = useState<string[]>([])

  const jobTypeOptions = ["Internship", "Full-time", "Part-time", "Contract", "Remote"]
  const skillOptions = ["React", "Python", "JavaScript", "TypeScript", "Node.js", "SQL", "AWS", "Figma"]

  const handleJobTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setJobTypes((prev) => [...prev, type])
    } else {
      setJobTypes((prev) => prev.filter((t) => t !== type))
    }
  }

  const handleSkillToggle = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills((prev) => prev.filter((s) => s !== skill))
    } else {
      setSkills((prev) => [...prev, skill])
    }
  }

  const handleApplyFilters = () => {
    // Apply filters logic here
    onOpenChange(false)
  }

  const handleClearFilters = () => {
    setJobTypes([])
    setLocation("")
    setSalaryRange([20])
    setSkills([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Filter Jobs</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your job search to find the perfect match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Job Type</Label>
            <div className="space-y-2">
              {jobTypeOptions.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={jobTypes.includes(type)}
                    onCheckedChange={(checked) => handleJobTypeChange(type, checked as boolean)}
                  />
                  <Label htmlFor={type} className="text-sm text-muted-foreground">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <Label htmlFor="location" className="text-sm font-medium text-foreground">
              Location
            </Label>
            <Input
              id="location"
              placeholder="Enter city or 'Remote'"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-input border-border"
            />
          </div>

          {/* Salary Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Minimum Salary: ${salaryRange[0]}/hour</Label>
            <Slider value={salaryRange} onValueChange={setSalaryRange} max={50} min={15} step={5} className="w-full" />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Skills</Label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <Badge
                  key={skill}
                  variant={skills.includes(skill) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    skills.includes(skill)
                      ? "bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleSkillToggle(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={handleClearFilters} className="border-border hover:bg-card bg-transparent">
            Clear All
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
