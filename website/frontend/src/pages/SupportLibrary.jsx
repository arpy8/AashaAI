import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SupportHub from '@/components/SupportHub';

export default function SupportLibrary() {
    const [resources, setResources] = useState([]);
    const [urgencyFilter, setUrgencyFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        fetchResources(categoryFilter, urgencyFilter);
    }, [categoryFilter, urgencyFilter]);

    const fetchResources = async (category, intensity) => {
        try {
            let url = 'https://arpy8-aasha-ai-backend-server.hf.space/api/resources?';
            if (category && category !== 'All') url += `hub_type=${encodeURIComponent(category)}&`;
            if (intensity && intensity !== 'All') url += `intensity=${intensity}&`;

            const response = await fetch(url);
            const data = await response.json();
            setResources(data);
        } catch (error) {
            console.error("Failed to fetch resources:", error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full flex flex-col gap-8">
            <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight">Support Library</h1>
                <p className="text-lg text-muted-foreground">
                    A curated collection of resources to help you manage academic and emotional stress.
                </p>
            </div>

            <div className="glass-panel rounded-3xl p-8 mb-10 flex flex-col items-center justify-center text-center">
                <div className="flex flex-col md:flex-row gap-6 mb-10 w-full max-w-2xl mx-auto">
                    <div className="flex-1">
                        <label className="text-xs font-medium tracking-wide uppercase mb-2 block text-muted-foreground">Filter by Category</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 dark:border-white/5 shadow-inner rounded-full px-5 py-3 outline-none focus:ring-1 focus:ring-primary appearance-none tracking-wide text-sm"
                        >
                            <option value="All">All Categories</option>
                            <option value="Academic Resilience">Academic Resilience</option>
                            <option value="Emotional Well-being">Emotional Well-being</option>
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="text-xs font-medium tracking-wide uppercase mb-2 block text-muted-foreground">Filter by Intensity</label>
                        <select
                            value={urgencyFilter}
                            onChange={(e) => setUrgencyFilter(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 dark:border-white/5 shadow-inner rounded-full px-5 py-3 outline-none focus:ring-1 focus:ring-primary appearance-none tracking-wide text-sm"
                        >
                            <option value="All">All Intensities</option>
                            <option value="Low">Low (Casual)</option>
                            <option value="High">High (Urgent)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <SupportHub resources={resources} />
            </div>
        </div>
    );
}