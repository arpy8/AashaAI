"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, Building2, DollarSign, Users, Calendar, Heart, Bookmark } from "lucide-react"
import Image from "next/image"

interface Job {
  id: number
  title: string
  company: string
  location: string
  type: string
  postedDate: string
  description: string
  skills: string[]
  salary: string
  logo: string
}

interface JobDetailsModalProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
  onSave: () => void
}

export function JobDetailsModal({ job, open, onOpenChange, onApply, onSave }: JobDetailsModalProps) {
  if (!job) return null

  const handleApply = () => {
    onApply()
    onOpenChange(false)
  }

  const handleSave = () => {
    onSave()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-card border-border p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="space-y-4">
              {/* Company Header */}
              <div className="flex items-start space-x-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={job.logo || "/placeholder.svg"}
                    alt={`${job.company} logo`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-2xl font-bold text-foreground text-balance">{job.title}</DialogTitle>
                  <div className="flex items-center text-muted-foreground mt-2 mb-3">
                    <Building2 className="h-4 w-4 mr-1" />
                    <span className="font-medium text-lg">{job.company}</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {job.type}
                  </Badge>
                </div>
              </div>

              {/* Job Meta Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Posted {job.postedDate}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  <span className="font-medium text-foreground">{job.salary}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  <span>50+ applicants</span>
                </div>
              </div>
            </DialogHeader>

            <Separator className="my-6" />

            {/* Job Description */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">About this role</h3>
                <DialogDescription className="text-muted-foreground leading-relaxed text-base">
                  {job.description}
                </DialogDescription>
              </div>

              {/* Extended Description */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">What you'll do</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Collaborate with cross-functional teams to deliver high-quality solutions
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Participate in code reviews and contribute to technical discussions
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Learn and grow your skills in a supportive environment
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Take ownership of projects and see them through to completion
                  </li>
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">What we're looking for</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Currently pursuing a degree in Computer Science or related field
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Strong problem-solving skills and attention to detail
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Excellent communication and teamwork abilities
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    Passion for learning new technologies and best practices
                  </li>
                </ul>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="border-border hover:border-primary/50 transition-colors"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">About {job.company}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {job.company} is a leading technology company focused on innovation and creating meaningful impact
                  through cutting-edge solutions. We believe in fostering a collaborative environment where talented
                  individuals can grow and thrive.
                </p>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">What we offer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    <span>Flexible working hours</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    <span>Mentorship program</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Building2 className="h-4 w-4 mr-2 text-primary" />
                    <span>Modern office space</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <DollarSign className="h-4 w-4 mr-2 text-primary" />
                    <span>Competitive compensation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleSave}
                className="flex-1 border-border hover:bg-card bg-transparent"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Save for Later
              </Button>
              <Button
                onClick={handleApply}
                className="flex-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              >
                <Heart className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
