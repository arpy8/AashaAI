"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, X, MapPin, Clock, Building2, DollarSign, Eye } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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

interface JobCardProps {
  job: Job
  onApply: () => void
  onSkip: () => void
  onViewDetails: () => void
}

export function JobCard({ job, onApply, onSkip, onViewDetails }: JobCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right" | null>(null)

  const handleApply = () => {
    setIsAnimating(true)
    setAnimationDirection("right")
    setTimeout(() => {
      onApply()
      setIsAnimating(false)
      setAnimationDirection(null)
    }, 300)
  }

  const handleSkip = () => {
    setIsAnimating(true)
    setAnimationDirection("left")
    setTimeout(() => {
      onSkip()
      setIsAnimating(false)
      setAnimationDirection(null)
    }, 300)
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={job.id}
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          x: animationDirection === "left" ? -300 : animationDirection === "right" ? 300 : 0,
          rotate: animationDirection === "left" ? -15 : animationDirection === "right" ? 15 : 0,
        }}
        exit={{
          scale: 0.8,
          opacity: 0,
          x: animationDirection === "left" ? -300 : animationDirection === "right" ? 300 : 0,
          rotate: animationDirection === "left" ? -15 : animationDirection === "right" ? 15 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative"
      >
        <Card className="p-8 bg-card border-border hover:border-primary/30 transition-all duration-300 shadow-lg">
          {/* Company Logo and Header */}
          <div className="flex items-start space-x-4 mb-6">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
              <Image src={job.logo || "/placeholder.svg"} alt={`${job.company} logo`} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-1 text-balance">{job.title}</h2>
              <div className="flex items-center text-muted-foreground mb-2">
                <Building2 className="h-4 w-4 mr-1" />
                <span className="font-medium">{job.company}</span>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {job.type}
              </Badge>
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{job.postedDate}</span>
              </div>
            </div>

            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-1 text-green-500" />
              <span className="font-medium text-foreground">{job.salary}</span>
            </div>

            <p className="text-muted-foreground leading-relaxed">{job.description}</p>

            {/* Skills */}
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 3).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="border-border hover:border-primary/50 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 3 && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  +{job.skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={onViewDetails}
              className="w-full border-border hover:bg-card hover:border-primary/50 transition-all duration-200 bg-transparent"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleSkip}
                disabled={isAnimating}
                className="flex-1 border-border hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 bg-transparent"
              >
                <X className="h-5 w-5 mr-2" />
                Skip
              </Button>
              <Button
                size="lg"
                onClick={handleApply}
                disabled={isAnimating}
                className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-200"
              >
                <Heart className="h-5 w-5 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
