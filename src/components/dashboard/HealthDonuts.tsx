'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import GlobalReproductiveCard from './GlobalReproductiveCard';

const COLORS_SCORE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function HealthDonuts() {
    const { animals } = useDashboard();

    const { scoreData } = useMemo(() => {
        const active = animals.filter(a => a.isActive);

        // Scores
        const scores = {
            'Elite (80-100)': 0,
            'Óptimo (60-79)': 0,
            'Alerta (40-59)': 0,
            'Crítico (<40)': 0
        };

        active.forEach(a => {
            // Score
            if (a.scoreTotal >= 80) scores['Elite (80-100)']++;
            else if (a.scoreTotal >= 60) scores['Óptimo (60-79)']++;
            else if (a.scoreTotal >= 40) scores['Alerta (40-59)']++;
            else scores['Crítico (<40)']++;
        });

        return {
            scoreData: Object.keys(scores).map(k => ({ name: k, value: scores[k as keyof typeof scores] })).filter(d => d.value > 0)
        };
    }, [animals]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-stretch">
            <Card className="glass border-transparent text-slate-800 shadow-sm flex flex-col">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Score Horizonte</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={scoreData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                                isAnimationActive={true}
                                animationBegin={200}
                                animationDuration={1200}
                            >
                                {scoreData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_SCORE[index % COLORS_SCORE.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#475569' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <GlobalReproductiveCard />
        </div>
    );
}
