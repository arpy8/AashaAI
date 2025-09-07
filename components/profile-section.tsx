"use client"

import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit3, Plus } from "lucide-react"

interface ProfileSectionProps<T> {
  title: string
  icon: ReactNode
  items: T[]
  renderItem: (item: T) => ReactNode
}

export function ProfileSection<T extends { id: number }>({ title, icon, items, renderItem }: ProfileSectionProps<T>) {
  return (
    <Card className="p-8 bg-card border-border mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
            <Edit3 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {items.map((item, index) => (
          <div key={item.id} className="relative">
            {/* Timeline connector */}
            {index < items.length - 1 && <div className="absolute left-4 top-8 w-px h-16 bg-border" />}

            {/* Timeline dot */}
            <div className="absolute left-2 top-2 w-4 h-4 bg-primary rounded-full border-2 border-background" />

            {/* Content */}
            <div className="ml-12">
              <Card className="p-6 bg-muted/30 border-border hover:border-primary/30 transition-colors">
                {renderItem(item)}
              </Card>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
