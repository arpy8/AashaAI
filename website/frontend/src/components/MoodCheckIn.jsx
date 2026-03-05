import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Heart, BookOpen, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MoodCheckIn({ currentMood, onMoodChange, urgencyFilter, onUrgencyFilterChange }) {
    const moods = [
        { label: 'Anxious about Exams', icon: <BookOpen className="w-4 h-4 mr-2" />, type: 'Academic Resilience' },
        { label: 'Feeling Lonely', icon: <Heart className="w-4 h-4 mr-2" />, type: 'Emotional Well-being' },
        { label: 'Need to Vent', icon: <AlertCircle className="w-4 h-4 mr-2" />, type: 'Emotional Well-being' },
        { label: 'Feeling Overwhelmed', icon: <AlertCircle className="w-4 h-4 mr-2" />, type: 'Academic Resilience' }
    ];

    return (
        <div className="w-full glass-panel shadow-sm rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <span className="text-muted-foreground text-sm font-medium">How are you feeling right now?</span>
                <div className="flex flex-wrap gap-2 justify-center">
                    {moods.map((mood, idx) => (
                        <Badge
                            key={idx}
                            variant={currentMood?.label === mood.label ? "default" : "secondary"}
                            className="cursor-pointer px-4 py-2 rounded-full font-medium text-xs md:text-sm tracking-wide transition-all shadow-inner border border-white/10 dark:border-white/5"
                            style={{ backgroundColor: currentMood?.label === mood.label ? 'hsl(var(--primary)/0.9)' : 'hsl(var(--background)/0.5)', color: currentMood?.label === mood.label ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))' }}
                            onClick={() => onMoodChange(mood)}
                        >
                            {mood.icon}
                            {mood.label}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pb-2 md:pb-0 border-b border-border md:border-0 justify-center">
                <span className="text-muted-foreground text-xs md:text-sm font-medium">Support Intensity:</span>
                <select
                    value={urgencyFilter}
                    onChange={(e) => onUrgencyFilterChange(e.target.value)}
                    className="bg-background/50 text-foreground text-sm rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-primary border border-white/10 dark:border-white/5 shadow-inner tracking-wide appearance-none"
                >
                    <option value="All">All Resources</option>
                    <option value="Low">Low (Casual)</option>
                    <option value="High">High (Urgent)</option>
                </select>
            </div>
        </div>
    );
}
