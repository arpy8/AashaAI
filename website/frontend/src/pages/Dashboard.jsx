import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, TrendingUp } from 'lucide-react';

const mockData = [
    { day: 'Mon', anxiety: 6, calmness: 4 },
    { day: 'Tue', anxiety: 8, calmness: 3 },
    { day: 'Wed', anxiety: 5, calmness: 6 },
    { day: 'Thu', anxiety: 4, calmness: 7 },
    { day: 'Fri', anxiety: 3, calmness: 8 },
    { day: 'Sat', anxiety: 2, calmness: 9 },
    { day: 'Sun', anxiety: 3, calmness: 7 },
];

export default function Dashboard() {
    return (
        <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4 md:p-8 w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="w-full space-y-2">
                <h1 className="text-3xl font-medium tracking-tight">Your Weekly Insights</h1>
                <p className="text-muted-foreground font-light tracking-wide">
                    A look at your recent check-ins and emotional trends.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <Card className="glass-card shadow-none border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-widest font-medium">Average Mood</CardDescription>
                        <CardTitle className="text-3xl font-light">Calm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-green-500/80 flex items-center gap-1 font-medium">
                            <TrendingUp className="w-4 h-4" />
                            +12% from last week
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-none border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10 md:col-span-2">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-medium tracking-wide">Emotional Balance</CardTitle>
                            <CardDescription className="text-sm font-light">Anxiety vs Calmness over the past 7 days</CardDescription>
                        </div>
                        <div className="p-2 rounded-full bg-primary/10">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                                <Tooltip
                                    cursor={{ fill: 'var(--secondary)' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                                />
                                <Bar dataKey="anxiety" name="Anxiety" radius={[4, 4, 0, 0]}>
                                    {mockData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="hsl(var(--destructive)/0.7)" />
                                    ))}
                                </Bar>
                                <Bar dataKey="calmness" name="Calmness" radius={[4, 4, 0, 0]}>
                                    {mockData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="hsl(var(--primary)/0.8)" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="w-full glass-panel rounded-3xl p-8 text-center border border-white/10">
                <h3 className="text-xl font-medium tracking-wide mb-3">Notice a pattern?</h3>
                <p className="text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto text-balance">
                    Your anxiety seems to peak early in the week. Consider scheduling a short 5-minute session in the <span className="text-primary font-medium">Breathe</span> tool every Tuesday morning to help center yourself before classes.
                </p>
            </div>
        </div>
    );
}
