'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function WeightDistributionChart() {
    const { animals, settings } = useDashboard();

    const data = useMemo(() => {
        const active = animals.filter(a => a.isActive);
        if (active.length === 0) return [];

        const bins: Record<string, number> = {};
        const binSize = 10;

        active.forEach(a => {
            if (a.currentWeight) {
                const binLower = Math.floor(a.currentWeight / binSize) * binSize;
                const binLabel = `${binLower}`;
                bins[binLabel] = (bins[binLabel] || 0) + 1;
            }
        });

        return Object.keys(bins).map(bin => ({
            peso: parseInt(bin),
            cabezas: bins[bin],
        })).sort((a, b) => a.peso - b.peso);

    }, [animals]);

    return (
        <Card className="glass border-transparent text-slate-800 mt-2 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Distribución de Pesos</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="colorCabezas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="peso"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            height={60}
                            tickFormatter={(val) => `${val}kg`}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#10b981', fontWeight: 600 }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="cabezas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCabezas)" animationDuration={1500} isAnimationActive={true} />
                        <ReferenceLine x={settings.targetWeight} stroke="#ea580c" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: `Meta: ${settings.targetWeight}kg`, fill: '#ea580c', fontWeight: 600, fontSize: 13 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
