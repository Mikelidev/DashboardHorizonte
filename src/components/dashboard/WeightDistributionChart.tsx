'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Custom label component for the target weight reference line
const MetaLabel = ({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value?: string }) => {
    const { x = 0, y = 0 } = viewBox || {};
    const labelWidth = value ? value.length * 7 + 20 : 90;
    return (
        <g>
            <rect
                x={x - labelWidth / 2}
                y={y + 6}
                width={labelWidth}
                height={22}
                rx={6}
                ry={6}
                fill="#fff7ed"
                stroke="#ea580c"
                strokeWidth={1.5}
            />
            <text
                x={x}
                y={y + 21}
                textAnchor="middle"
                fill="#ea580c"
                fontSize={12}
                fontWeight="700"
                fontFamily="inherit"
            >
                {value}
            </text>
        </g>
    );
};

export default function WeightDistributionChart() {
    const { animals, settings } = useDashboard();

    const { data, mean, aboveMeta } = useMemo(() => {
        const active = animals.filter(a => a.isActive);
        if (active.length === 0) return { data: [], mean: 0, aboveMeta: 0 };

        const bins: Record<string, number> = {};
        const binSize = 10;
        let sumW = 0;
        let cnt = 0;
        let above = 0;

        active.forEach(a => {
            if (a.currentWeight) {
                const binLower = Math.floor(a.currentWeight / binSize) * binSize;
                bins[`${binLower}`] = (bins[`${binLower}`] || 0) + 1;
                sumW += a.currentWeight;
                cnt++;
                if (a.currentWeight >= settings.targetWeight) above++;
            }
        });

        return {
            data: Object.keys(bins).map(bin => ({
                peso: parseInt(bin),
                cabezas: bins[bin],
            })).sort((a, b) => a.peso - b.peso),
            mean: cnt > 0 ? Math.round(sumW / cnt) : 0,
            aboveMeta: above,
        };
    }, [animals, settings.targetWeight]);

    const total = animals.filter(a => a.isActive && a.currentWeight).length;
    const abovePct = total > 0 ? Math.round((aboveMeta / total) * 100) : 0;

    return (
        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex flex-wrap justify-between items-start gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Distribución de Pesos del Rodeo</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Concentración de animales activos por rango de kilogramos.</p>
                </div>
                {/* Quick stats pills */}
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                        Media: <span className="text-slate-800 font-bold">{mean} kg</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        Sobre meta: <span className="font-bold">{aboveMeta} ({abovePct}%)</span>
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-72 px-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 30, right: 24, left: 0, bottom: 10 }}>
                        <defs>
                            <linearGradient id="colorCabezas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
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
                            height={44}
                            tickFormatter={(val) => `${val}kg`}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            width={36}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.75rem', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)', fontSize: 13 }}
                            itemStyle={{ color: '#10b981', fontWeight: 600 }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                            formatter={(v: any) => [`${v} animales`, 'Cabezas']}
                            labelFormatter={(l) => `${l} – ${parseInt(l) + 9} kg`}
                        />
                        <Area type="monotone" dataKey="cabezas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCabezas)" animationDuration={1500} isAnimationActive={true} />
                        <ReferenceLine
                            x={settings.targetWeight}
                            stroke="#ea580c"
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            label={<MetaLabel value={`Meta: ${settings.targetWeight}kg`} />}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
