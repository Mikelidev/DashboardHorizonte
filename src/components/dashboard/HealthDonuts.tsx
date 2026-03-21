'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import GlobalReproductiveCard from './GlobalReproductiveCard';

const SCORE_SEGMENTS = [
    { key: 'Elite (80-100)', color: '#10b981', label: 'Élite', range: '80-100' },
    { key: 'Óptimo (60-79)', color: '#3b82f6', label: 'Óptimo', range: '60-79' },
    { key: 'Alerta (40-59)', color: '#f59e0b', label: 'Alerta', range: '40-59' },
    { key: 'Crítico (<40)',  color: '#ef4444', label: 'Crítico', range: '<40' },
];

export default function HealthDonuts() {
    const { animals } = useDashboard();

    const { scoreData, total } = useMemo(() => {
        const active = animals.filter(a => a.isActive);
        const counts: Record<string, number> = {
            'Elite (80-100)': 0,
            'Óptimo (60-79)': 0,
            'Alerta (40-59)': 0,
            'Crítico (<40)':  0,
        };
        active.forEach(a => {
            if (a.scoreTotal >= 80)       counts['Elite (80-100)']++;
            else if (a.scoreTotal >= 60)  counts['Óptimo (60-79)']++;
            else if (a.scoreTotal >= 40)  counts['Alerta (40-59)']++;
            else                          counts['Crítico (<40)']++;
        });
        return {
            scoreData: SCORE_SEGMENTS.map(s => ({ ...s, value: counts[s.key] })).filter(d => d.value > 0),
            total: active.length,
        };
    }, [animals]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

            {/* Score Horizonte — Semi-donut gauge */}
            <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm p-6 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Score Horizonte</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Distribución de calidad genético-productiva del rodeo activo.</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                    {/* Semi-circle chart */}
                    <div className="w-full h-44 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={scoreData}
                                    cx="50%"
                                    cy="92%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius="58%"
                                    outerRadius="80%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    nameKey="label"
                                    stroke="none"
                                    isAnimationActive={true}
                                    animationBegin={200}
                                    animationDuration={1200}
                                >
                                    {scoreData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.75rem', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)', fontSize: 13 }}
                                    formatter={(value: any, name: string | undefined) => [`${value} animales (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, name || '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend pills */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full max-w-xs mx-auto">
                        {scoreData.map((seg) => {
                            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                            return (
                                <div key={seg.key} className="flex items-center gap-2">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                                    <span className="text-xs font-semibold text-slate-600 truncate">{seg.label}</span>
                                    <span className="ml-auto text-xs font-bold text-slate-500">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <GlobalReproductiveCard />
        </div>
    );
}
