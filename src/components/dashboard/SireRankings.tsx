'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SireRankings() {
    const { animals, settings } = useDashboard();

    const data = useMemo(() => {
        const active = animals.filter(a => a.isActive && a.currentGdm !== null);
        if (active.length === 0) return [];

        const statsBySire: Record<string, { sumGdm: number; count: number }> = {};

        active.forEach(a => {
            if (!statsBySire[a.padre]) {
                statsBySire[a.padre] = { sumGdm: 0, count: 0 };
            }
            statsBySire[a.padre].sumGdm += (a.currentGdm as number);
            statsBySire[a.padre].count += 1;
        });

        const items = Object.keys(statsBySire).map(padre => ({
            padre,
            avgGdm: Number((statsBySire[padre].sumGdm / statsBySire[padre].count).toFixed(3)),
            cabezas: statsBySire[padre].count
        })).sort((a, b) => b.avgGdm - a.avgGdm); // Sort descending by GDM

        return items;
    }, [animals]);

    return (
        <Card className="glass border-transparent text-slate-800 mt-2 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Ranking de Genética (Padres) por GDM</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="padre"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9', opacity: 0.8 }}
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#10b981', fontWeight: 600 }}
                            formatter={(value: any, name: any) => [
                                name === 'avgGdm' ? `${value} kg/día` : value,
                                name === 'avgGdm' ? 'GDM Promedio' : 'Cabezas'
                            ]}
                        />
                        <Bar
                            dataKey="avgGdm"
                            radius={[6, 6, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1500}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.avgGdm >= settings.gdmOpt ? '#10b981' : entry.avgGdm >= settings.gdmMin ? '#fbbf24' : '#ea580c'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
