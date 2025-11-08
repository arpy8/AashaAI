"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApplicationCard } from "@/components/application-card"
import { Plus } from "lucide-react"

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

interface KanbanBoardProps {
  applications: Application[]
  onStatusChange: (applicationId: number, newStatus: string) => void
}

const columns = [
  {
    id: "applied",
    title: "Applied",
    color: "blue",
    description: "Applications submitted",
  },
  {
    id: "in-review",
    title: "In Review",
    color: "yellow",
    description: "Under consideration",
  },
  {
    id: "outcome",
    title: "Outcome",
    color: "gray",
    description: "Final decisions",
    subColumns: ["accepted", "rejected"],
  },
]

export function KanbanBoard({ applications, onStatusChange }: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = useState<Application | null>(null)

  const getApplicationsByStatus = (status: string) => {
    if (status === "outcome") {
      return applications.filter((app) => app.status === "accepted" || app.status === "rejected")
    }
    return applications.filter((app) => app.status === status)
  }

  const handleDragStart = (app: Application) => {
    setDraggedItem(app)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (draggedItem) {
      onStatusChange(draggedItem.id, newStatus)
      setDraggedItem(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "blue"
      case "in-review":
        return "yellow"
      case "accepted":
        return "green"
      case "rejected":
        return "red"
      default:
        return "gray"
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {columns.map((column) => (
        <Card key={column.id} className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-3 h-3 rounded-full bg-${column.color}-500`} />
                <h3 className="font-semibold text-foreground">{column.title}</h3>
                <Badge variant="outline" className="border-border">
                  {getApplicationsByStatus(column.id).length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{column.description}</p>
            </div>
            <Button variant="ghost" size="sm" className="hover:bg-muted">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="space-y-3 min-h-[400px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id === "outcome" ? "accepted" : column.id)}
          >
            {column.id === "outcome" ? (
              // Special handling for outcome column with sub-sections
              <div className="space-y-4">
                {/* Accepted Section */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-500">Accepted</span>
                  </div>
                  <div
                    className="space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed border-green-500/20"
                    onDrop={(e) => handleDrop(e, "accepted")}
                  >
                    {applications
                      .filter((app) => app.status === "accepted")
                      .map((app) => (
                        <ApplicationCard
                          key={app.id}
                          application={app}
                          onDragStart={() => handleDragStart(app)}
                          statusColor={getStatusColor(app.status)}
                        />
                      ))}
                  </div>
                </div>

                {/* Rejected Section */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-500">Rejected</span>
                  </div>
                  <div
                    className="space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed border-red-500/20"
                    onDrop={(e) => handleDrop(e, "rejected")}
                  >
                    {applications
                      .filter((app) => app.status === "rejected")
                      .map((app) => (
                        <ApplicationCard
                          key={app.id}
                          application={app}
                          onDragStart={() => handleDragStart(app)}
                          statusColor={getStatusColor(app.status)}
                        />
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              // Regular columns
              getApplicationsByStatus(column.id).map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onDragStart={() => handleDragStart(app)}
                  statusColor={getStatusColor(app.status)}
                />
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
