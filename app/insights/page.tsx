"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { InsightsChart } from "@/components/insights-chart"
import { SkillsChart } from "@/components/skills-chart"
import { ApplicationTrendChart } from "@/components/application-trend-chart"
import { TrendingUp, Target, Clock, Award, Users, Calendar, Download, RefreshCw } from "lucide-react"

// Mock insights data
const insightsData = {
  overview: {
    totalApplications: 24,
    successRate: 16.7, // 4 out of 24
    averageResponseTime: 5.2, // days
    activeApplications: 8,
    interviewsScheduled: 3,
    offersReceived: 1,
  },
  applicationsByMonth: [
    { month: "Oct", applications: 3, interviews: 1, offers: 0 },
    { month: "Nov", applications: 8, interviews: 2, offers: 0 },
    { month: "Dec", applications: 7, interviews: 3, offers: 1 },
    { month: "Jan", applications: 6, interviews: 1, offers: 0 },
  ],
  topSkills: [
    { skill: "React", matches: 18, percentage: 75 },
    { skill: "JavaScript", matches: 16, percentage: 67 },
    { skill: "TypeScript", matches: 14, percentage: 58 },
    { skill: "Python", matches: 12, percentage: 50 },
    { skill: "Node.js", matches: 10, percentage: 42 },
    { skill: "CSS", matches: 9, percentage: 38 },
  ],
  applicationStatus: [
    { status: "Applied", count: 12, percentage: 50 },
    { status: "In Review", count: 8, percentage: 33 },
    { status: "Accepted", count: 1, percentage: 4 },
    { status: "Rejected", count: 3, percentage: 13 },
  ],
  recentActivity: [
    {
      id: 1,
      type: "application",
      company: "TechCorp",
      position: "Frontend Developer Intern",
      date: "2024-01-18",
      status: "applied",
    },
    {
      id: 2,
      type: "interview",
      company: "StartupXYZ",
      position: "Software Engineering Intern",
      date: "2024-01-17",
      status: "scheduled",
    },
    {
      id: 3,
      type: "offer",
      company: "DesignStudio",
      position: "UX Design Intern",
      date: "2024-01-15",
      status: "received",
    },
  ],
}

export default function InsightsPage() {
  const { overview, applicationsByMonth, topSkills, applicationStatus, recentActivity } = insightsData

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Insights Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Track your job search performance and identify opportunities for improvement
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Applied</p>
                  <p className="text-2xl font-bold text-foreground">{overview.totalApplications}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-500">{overview.successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold text-yellow-500">{overview.averageResponseTime}d</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-blue-500">{overview.activeApplications}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Interviews</p>
                  <p className="text-2xl font-bold text-purple-500">{overview.interviewsScheduled}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offers</p>
                  <p className="text-2xl font-bold text-green-500">{overview.offersReceived}</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Application Trends */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Application Trends</h3>
                <Badge variant="outline" className="border-border">
                  Last 4 months
                </Badge>
              </div>
              <ApplicationTrendChart data={applicationsByMonth} />
            </Card>

            {/* Application Status */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Application Status</h3>
                <Badge variant="outline" className="border-border">
                  Current
                </Badge>
              </div>
              <InsightsChart data={applicationStatus} />
            </Card>
          </div>

          {/* Skills and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Skills */}
            <Card className="lg:col-span-2 p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Most Matched Skills</h3>
                <Badge variant="outline" className="border-border">
                  Top 6
                </Badge>
              </div>
              <SkillsChart skills={topSkills} />
            </Card>

            {/* Recent Activity */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                <Badge variant="outline" className="border-border">
                  Last 7 days
                </Badge>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === "application"
                          ? "bg-blue-500"
                          : activity.type === "interview"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.type === "application"
                          ? "Applied to"
                          : activity.type === "interview"
                            ? "Interview with"
                            : "Offer from"}{" "}
                        {activity.company}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.position}</p>
                      <p className="text-xs text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
