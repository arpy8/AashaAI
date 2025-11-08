"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface TrendData {
  month: string
  applications: number
  interviews: number
  offers: number
}

interface ApplicationTrendChartProps {
  data: TrendData[]
}

export function ApplicationTrendChart({ data }: ApplicationTrendChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis dataKey="month" stroke="#A0A0A0" fontSize={12} />
          <YAxis stroke="#A0A0A0" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="applications" name="Applications" fill="#3B82F6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="interviews" name="Interviews" fill="#EAB308" radius={[2, 2, 0, 0]} />
          <Bar dataKey="offers" name="Offers" fill="#22C55E" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
