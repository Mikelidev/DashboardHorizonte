import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Scale, Target, Activity } from 'lucide-react';
import { ProcessedAnimal } from '@/types';

// Group cows by GDM into distinct "buckets" (e.g., intervals of 0.1 kg/d)
// to calculate the empirical pregnancy rate at each specific GDM strata.
function calculateEquilibriumCurve(animals: ProcessedAnimal[]) {
    const buckets = new Map<number, { total: number, prenadas: number }>();
    const bucketSize = 0.1; // 100g buckets

    for (const an of animals) {
        if (!an.isActive || an.currentGdm === null || !an.reproductiveState) continue;

        // Round GDM to nearest bucket size (e.g., 0.43 -> 0.4, 0.48 -> 0.5)
        const bucketKey = Math.round(an.currentGdm / bucketSize) * bucketSize;

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, { total: 0, prenadas: 0 });
        }

        const stats = buckets.get(bucketKey)!;
        stats.total++;

        if (an.reproductiveState.toUpperCase().includes('PREÑADA') || an.reproductiveState.toUpperCase().includes('CICLANDO')) {
            stats.prenadas++;
        }
    }

    // Convert map to array and compute %
    const curveData = Array.from(buckets.entries())
        .map(([gdmBucket, stats]) => ({
            gdmBucket: Number(gdmBucket.toFixed(2)),
            tasaPrenez: stats.total > 0 ? (stats.prenadas / stats.total) * 100 : 0,
            muestra: stats.total
        }))
        .filter(d => d.muestra >= 3) // Need minimum sample size per bucket to be statistically relevant
        .sort((a, b) => a.gdmBucket - b.gdmBucket);

    return curveData;
}

export default function EquilibriumChart() {
    const { animals, settings } = useDashboard();

    const curveData = useMemo(() => calculateEquilibriumCurve(animals), [animals]);

    // Find the GDM bucket where pregnancy crosses the 60% standard threshold
    const equilibriumPoint = useMemo(() => {
        return curveData.find(d => d.tasaPrenez >= 60)?.gdmBucket;
    }, [curveData]);

    if (curveData.length === 0) {
        return (
            <div className="glass rounded-2xl p-8 border border-slate-200/50 flex flex-col items-center justify-center text-slate-500 h-[400px]">
                <Activity className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Datos Insuficientes</h3>
                <p>No hay suficientes pesadas o tactos para calcular la curva nutricional.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Punto de Equilibrio Nutricional</h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        Data Mining: Umbral de Velocidad de Caja (GDM) vs Ciclicidad Empírica.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 border border-slate-200/50 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-indigo-500" />
                        Umbral Mínimo Requerido
                    </h3>
                    <div className="text-center">
                        <p className="text-sm text-slate-500 font-semibold mb-2">Para garantizar &gt;60% de Preñez</p>
                        {equilibriumPoint !== undefined ? (
                            <h3 className="text-5xl font-extrabold text-indigo-600">
                                {equilibriumPoint.toFixed(2)}<span className="text-2xl text-indigo-400">kg/d</span>
                            </h3>
                        ) : (
                            <h3 className="text-2xl font-bold text-rose-500">
                                No Alcanzado
                            </h3>
                        )}
                        <p className="text-xs text-slate-400 mt-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            Descubierto mediante el cruce algorítmico del registro histórico de tactos corporales contra las últimas fluctuaciones termodinámicas de peso.
                        </p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 border border-slate-200/50 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Curva de Fertilidad Sensible a la Nutrición (GDM)
                        </h3>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={curveData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="gdmBucket"
                                    name="Velocidad de Caja"
                                    unit=" kg/d"
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    stroke="#cbd5e1"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tickFormatter={(v) => `${v}%`}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    stroke="#cbd5e1"
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any, name: string | undefined) => [
                                        name === 'tasaPrenez' ? `${(value as number).toFixed(1)}%` : value,
                                        name === 'tasaPrenez' ? 'Tasa de Preñez/Ciclicidad' : 'Muestra (Cabezas)'
                                    ]}
                                    labelFormatter={(label) => `GDM Cont.: ${label} kg/d`}
                                />

                                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral Económico 60%', fill: '#f59e0b', fontSize: 10 }} />
                                {equilibriumPoint !== undefined && (
                                    <ReferenceLine x={equilibriumPoint} stroke="#6366f1" strokeDasharray="3 3" label={{ position: 'right', value: 'Punto EQ', fill: '#6366f1', fontSize: 10 }} />
                                )}

                                <Line type="monotone" dataKey="tasaPrenez" stroke="#6366f1" strokeWidth={4} activeDot={{ r: 8, fill: '#6366f1', strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
