import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const getIntensityColors = (intensity) => {
    switch (intensity?.toLowerCase()) {
        case 'immediate':
            return "bg-red-500/10 text-red-500 border-red-500/20";
        case 'high':
            return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        case 'standard':
            return "bg-primary/10 text-primary border-primary/20";
        default:
            return "bg-background/50 text-foreground border-white/10";
    }
};

export default function SupportHub({ resources }) {
    if (!resources || resources.length === 0) {
        return (
            <Card className="w-full bg-card/50 border-white/5 shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No resources found for this selection.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
            {resources.map((resource, index) => {
                const CardWrapper = resource.actionLink ? 'a' : 'div';
                const wrapperProps = resource.actionLink
                    ? { href: resource.actionLink, target: "_blank", rel: "noopener noreferrer", className: "block h-full cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200" }
                    : { className: "block h-full cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200", onClick: () => alert("Action triggered: " + resource.actionText) };

                return (
                    <CardWrapper key={index} {...wrapperProps}>
                        <Card className="glass-card shadow-none border-0 overflow-hidden flex flex-col h-full group">
                            <CardHeader className="bg-white/5 dark:bg-black/20 border-b border-white/10 dark:border-white/5 pb-4 px-6 relative z-10 transition-colors group-hover:bg-transparent">
                                <div className="flex items-start justify-between gap-4">
                                    <h3 className="font-medium text-lg text-foreground tracking-wide">{resource.title}</h3>
                                    <Badge variant="outline" className={`text-xs font-semibold shrink-0 backdrop-blur-md ${getIntensityColors(resource.intensity)}`}>
                                        {resource.intensity}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 px-6 pb-6 relative z-10 flex-grow">
                                <p className="text-sm text-muted-foreground leading-relaxed font-light text-balance">
                                    {resource.description}
                                </p>
                            </CardContent>
                        </Card>
                    </CardWrapper>
                )
            })}
        </div>
    );
}
