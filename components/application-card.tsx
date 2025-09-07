"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign, MoreHorizontal, MessageSquare } from "lucide-react"
import Image from "next/image"

interface Application {
  id: number
  jobTitle: string
  company: string
  appliedDate: string
  status: string
  salary: string
  location: string
  logo: string
  notes: string
}

interface ApplicationCardProps {
  application: Application
  onDragStart: () => void
  statusColor: string
}

export function ApplicationCard({ application, onDragStart, statusColor }: ApplicationCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "in-review":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "accepted":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card
      className="p-4 bg-muted/30 border-border hover:border-primary/30 transition-all duration-200 cursor-move group"
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={application.logo || "/placeholder.svg"}
              alt={`${application.company} logo`}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground text-sm leading-tight mb-1 text-balance">
              {application.jobTitle}
            </h4>
            <p className="text-sm text-primary font-medium">{application.company}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span className="truncate">{application.location}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3 mr-1" />
          <span>{application.salary}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          <span>Applied {formatDate(application.appliedDate)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge className={`text-xs ${getStatusBadgeColor(application.status)}`}>
          {application.status.replace("-", " ")}
        </Badge>
        {application.notes && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {application.notes && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">{application.notes}</p>
        </div>
      )}
    </Card>
  )
}
