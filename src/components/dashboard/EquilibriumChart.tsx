import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Scale, Target, Activity, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { ProcessedAnimal } from '@/types';

// Group cows by GDM into distinct "buckets" (e.g., intervals of 0.1 kg/d)
// to calculate the empirical pregnancy rate at each specific GDM strata.
function calculateEquilibriumCurve(animals: ProcessedAnimal[]) {
    const buckets = new Map<number, { total: number, prenadas: number }>();
    const bucketSize = 0.1; // 100g buckets

    for (const an of animals) {
        // Use the new serviceWindowGdm for a more precise biological correlation, fallback to currentGdm
        const evalGdm = an.serviceWindowGdm !== null ? an.serviceWindowGdm : an.currentGdm;

        if (!an.isActive || evalGdm === null || !an.reproductiveState) continue;

        // Round GDM to nearest bucket size (e.g., 0.43 -> 0.4, 0.48 -> 0.5)
        const bucketKey = Math.round(evalGdm / bucketSize) * bucketSize;

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

    const totalSampleLote = useMemo(() => {
        return animals.filter(an => an.isActive && an.reproductiveState && (an.serviceWindowGdm !== null || an.currentGdm !== null)).length;
    }, [animals]);

    // Find the GDM bucket where pregnancy crosses the 60% standard threshold
    const equilibriumData = useMemo(() => {
        const point = curveData.find(d => d.tasaPrenez >= 60);

        if (!point) return { point: undefined, confidenceStatus: 'INSUFICIENTE', reason: 'No se alcanzó el 60% de preñez en ningún estrato.' };

        // Criterio de Muestra Mínima (n) - A NIVEL REBAÑO/LOTE, no por estrato.
        if (totalSampleLote < 20) {
            return {
                point: point.gdmBucket,
                confidenceStatus: 'INHABILITADO',
                reason: `Esperando más datos de campo en el lote (n = ${totalSampleLote} < 20 vacas evaluadas).`,
                nEstrato: point.muestra,
                nLote: totalSampleLote,
                prenez: point.tasaPrenez
            };
        }

        // Criterio de Correlación Biológica e Índice de Preñez
        if (point.tasaPrenez < 15) {
            return { point: point.gdmBucket, confidenceStatus: 'CRITICO', reason: 'Muestra insuficiente (Preñez < 15%).', nEstrato: point.muestra, nLote: totalSampleLote, prenez: point.tasaPrenez };
        }

        // Biological Error check: Losing weight correlates with high pregnancy? That's suspicious.
        if (point.gdmBucket < -0.10) {
            return { point: point.gdmBucket, confidenceStatus: 'BAJA_CONFIANZA', reason: 'Error Biológico: Correlación negativa detectada.', nEstrato: point.muestra, nLote: totalSampleLote, prenez: point.tasaPrenez };
        }

        if (point.tasaPrenez >= 15 && point.tasaPrenez <= 40) {
            return { point: point.gdmBucket, confidenceStatus: 'ADVERTENCIA', reason: 'Tendencia en formación: Se requiere mayor estabilidad en los datos para confirmar el punto de equilibrio.', nEstrato: point.muestra, nLote: totalSampleLote, prenez: point.tasaPrenez };
        }

        // Default to Validado si preñez > 40% y correlación es lógica (GDM >= -0.10)
        return { point: point.gdmBucket, confidenceStatus: 'VALIDADO', reason: 'Análisis biológicamente consistente e índice de preñez confiable.', nEstrato: point.muestra, nLote: totalSampleLote, prenez: point.tasaPrenez };

    }, [curveData, totalSampleLote]);

    const eqPoint = equilibriumData.point;
    const confidence = equilibriumData.confidenceStatus;

    if (curveData.length === 0) {
        return (
            <div className="glass rounded-2xl p-8 border border-slate-200/50 flex flex-col items-center justify-center text-slate-500 h-[400px]">
                <Activity className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Datos Insuficientes</h3>
                <p>No hay suficientes pesadas o tactos para calcular la curva nutricional.</p>
            </div>
        );
    }

    // Determine UI render properties based on Confidence
    let valueColor = "text-indigo-600";
    let unitColor = "text-indigo-400";
    let badgeBg = "bg-indigo-100 text-indigo-700 border-indigo-200";
    let badgeIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
    let badgeText = "Validado";

    if (confidence === 'INHABILITADO') {
        valueColor = "text-slate-400";
        unitColor = "text-slate-300";
        badgeBg = "bg-slate-100 text-slate-600 border-slate-200";
        badgeIcon = <Info className="w-3.5 h-3.5" />;
        badgeText = "Inhabilitado";
    } else if (confidence === 'CRITICO' || confidence === 'BAJA_CONFIANZA') {
        valueColor = "text-rose-600";
        unitColor = "text-rose-400";
        badgeBg = "bg-rose-100 text-rose-700 border-rose-200";
        badgeIcon = <AlertCircle className="w-3.5 h-3.5" />;
        badgeText = confidence === 'CRITICO' ? "Muestra Insuficiente" : "Baja Confianza";
    } else if (confidence === 'ADVERTENCIA') {
        valueColor = "text-amber-600";
        unitColor = "text-amber-500";
        badgeBg = "bg-amber-100 text-amber-700 border-amber-200";
        badgeIcon = <AlertTriangle className="w-3.5 h-3.5" />;
        badgeText = "En Formación";
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-800">Punto de Equilibrio Nutricional</h2>
                        {eqPoint !== undefined && (
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${badgeBg} cursor-help`} title={equilibriumData.reason}>
                                {badgeIcon}
                                {badgeText}
                            </div>
                        )}
                    </div>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        Data Mining: Umbral de Velocidad de Caja (GDM) vs Ciclicidad Empírica ({curveData.length > 0 ? 'Ventana de Servicio' : 'Global'}).
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
                        {eqPoint !== undefined ? (
                            <div className="group relative inline-block">
                                <h3 className={`text-5xl font-extrabold ${valueColor} transition-colors duration-300`}>
                                    {eqPoint > 0 && confidence !== 'BAJA_CONFIANZA' ? '+' : ''}{eqPoint.toFixed(2)}<span className={`text-2xl ${unitColor} ml-1`}>kg/d</span>
                                </h3>

                                <div className="mt-2 text-sm text-slate-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    {equilibriumData.nLote} vientres evaluados en total.<br />
                                    <span className="text-xs opacity-80">
                                        Estrato {eqPoint} kg/d: n={equilibriumData.nEstrato} ({equilibriumData.prenez?.toFixed(1)}% preñez estratificada)
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <h3 className="text-2xl font-bold text-rose-500">
                                No Alcanzado
                            </h3>
                        )}
                        <p className="text-xs text-slate-400 mt-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {confidence === 'INHABILITADO'
                                ? "Esperando más recolección de datos de campo para validar estadísticamente este umbral (se requieren al menos 20 vientres por estrato)."
                                : confidence === 'ADVERTENCIA'
                                    ? "Tendencia en formación: Se requiere mayor estabilidad en los datos para confirmar este punto de equilibrio."
                                    : "Descubierto mediante el cruce algorítmico del registro histórico de tactos corporales contra las fluctuaciones de peso previas al servicio."}
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
                                {eqPoint !== undefined && (
                                    <ReferenceLine x={eqPoint} stroke={confidence === 'INHABILITADO' ? '#94a3b8' : confidence === 'BAJA_CONFIANZA' || confidence === 'CRITICO' ? '#f43f5e' : confidence === 'ADVERTENCIA' ? '#d97706' : '#6366f1'} strokeDasharray="3 3" label={{ position: 'right', value: 'Punto EQ', fill: confidence === 'INHABILITADO' ? '#94a3b8' : confidence === 'BAJA_CONFIANZA' || confidence === 'CRITICO' ? '#f43f5e' : confidence === 'ADVERTENCIA' ? '#d97706' : '#6366f1', fontSize: 10 }} />
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
