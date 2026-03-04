import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateReproductiveForecast } from '@/lib/analytics-engine';
import { motion } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Target, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function ReproductiveForecast() {
    const { animals, settings, selectedSnapshot, availableSnapshots } = useDashboard();

    const activeSnapshotDate = useMemo(() => {
        return availableSnapshots.find(s => s.id === selectedSnapshot)?.date || null;
    }, [availableSnapshots, selectedSnapshot]);

    const forecast = useMemo(() => {
        return calculateReproductiveForecast(
            animals,
            settings.iatfWindowStart,
            settings.targetWeight,
            activeSnapshotDate
        );
    }, [animals, settings, activeSnapshotDate]);

    if (!settings.iatfWindowStart) {
        return (
            <div className="glass rounded-2xl p-8 border border-slate-200/50 flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Configuración Faltante</h3>
                <p>Debe configurar la "Fecha de Inicio IATF" en el panel de Configuración para ver las proyecciones.</p>
            </div>
        );
    }

    const { targetWeight } = settings;
    const readyRate = forecast.totalEligible > 0 ? (forecast.projectedReady / forecast.totalEligible) * 100 : 0;

    // Formatting data for Scatter Plot tooltip
    const renderTooltip = (props: any) => {
        const { active, payload } = props;
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                    <p className="font-bold text-slate-800 mb-1">IDE: {data.ide}</p>
                    <p className="text-sm text-slate-600">Peso al Servicio: <span className="font-bold">{data.weight} kg</span></p>
                    <p className="text-sm text-slate-600">GDM Contemporáneo: <span className="font-bold">{data.gdm} kg/d</span></p>
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-md inline-block ${data.preñada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {data.preñada ? 'PREÑADA' : 'VACÍA'}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Proyección y Éxito Reproductivo</h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        Simulación a IATF y correlación empírica en campo.
                        {selectedSnapshot && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Modo Time Machine</span>}
                    </p>
                </div>
            </div>

            {/* Projection KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Rodeo Apto Proyectado</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-emerald-600">{forecast.projectedReady}</h3>
                        <span className="text-sm text-slate-400 mb-1 mb-1.5">cabezas</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 border border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Dosis Semen Sugeridas</p>
                    <div className="flex items-end gap-2">
                        {/* Always buy +10% doses relative to the perfectly ready herd */}
                        <h3 className="text-3xl font-extrabold text-blue-600">{Math.ceil(forecast.projectedReady * 1.1)}</h3>
                        <span className="text-sm text-slate-400 mb-1.5 flex items-center gap-1 cursor-help" title="Calculado sumando un 10% de margen de seguridad sobre el rodeo proyectado como Apto."><Info className="w-3 h-3" /> dosis</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5 border border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Rodeo Retrasado Salvable</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-amber-500">{forecast.projectedDelayed}</h3>
                        <span className="text-sm text-slate-400 mb-1.5">cabezas</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5 border border-slate-200/50 bg-rose-50/30">
                    <p className="text-xs font-semibold text-rose-500 mb-1">Imposibilidad Matemática</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-rose-600">{forecast.projectedDanger}</h3>
                        <span className="text-sm text-rose-400 mb-1.5">cabezas</span>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress/Readiness Bar */}
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6 border border-slate-200/50 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Tasa de Aptitud IATF
                    </h3>

                    <div className="relative h-48 w-48 mx-auto">
                        {/* Simple circular progress visualizing the % of herd arriving on time */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="88" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                            <circle
                                cx="96" cy="96" r="88"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="16"
                                strokeDasharray={2 * Math.PI * 88}
                                strokeDashoffset={(2 * Math.PI * 88) * (1 - (readyRate / 100))}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-800">{readyRate.toFixed(1)}%</span>
                            <span className="text-xs font-medium text-slate-500 mt-1">Llegan al Objetivo</span>
                        </div>
                    </div>
                    <p className="text-sm text-center text-slate-500 mt-6">Basado en la Velocidad de Caja (GDM) individual actualizando diáriamente la proyección hasta la fecha IATF.</p>
                </motion.div>

                {/* Scatter Plot */}
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6 border border-slate-200/50 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Tasa de Preñez Empírica vs Peso al Servicio</h3>
                        <p className="text-xs font-medium text-slate-400 max-w-[200px] text-right">Análisis post-mortem cruce Ficha/Eventos.</p>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    type="number"
                                    dataKey="weight"
                                    name="Peso"
                                    unit="kg"
                                    domain={['dataMin - 20', 'dataMax + 20']}
                                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                />
                                {/* Dummy Y Axis to space the dots vertically by successful / failed pregnancy */}
                                <YAxis
                                    type="category"
                                    dataKey="preñada"
                                    name="Resultado"
                                    tickFormatter={(v) => v ? 'Preñada' : 'Vacía'}
                                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                    width={80}
                                    stroke="transparent"
                                />
                                <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />

                                <ReferenceLine x={targetWeight} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Objetivo de Peso', fill: '#10b981', fontSize: 12 }} />

                                <Scatter name="Rodeo" data={forecast.scatterData}>
                                    {forecast.scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.preñada ? '#10b981' : '#f43f5e'} fillOpacity={0.7} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
