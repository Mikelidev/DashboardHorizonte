import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Weight, Activity, Info } from 'lucide-react';
import { ProcessedAnimal } from '@/types';
import EquilibriumChart from './EquilibriumChart';

// Simple Kernel Density Estimation to draw a bell curve of weights
function calculateKDE(animals: ProcessedAnimal[], bandwidth = 20) {
    const weights = animals.map((a: ProcessedAnimal) => a.currentWeight).filter(w => w !== null) as number[];
    if (weights.length === 0) return [];

    const min = Math.min(...weights) - 50;
    const max = Math.max(...weights) + 50;
    const step = 5;

    const data = [];
    for (let x = min; x <= max; x += step) {
        let sum = 0;
        for (const w of weights) {
            const u = (x - w) / bandwidth;
            sum += Math.exp(-0.5 * u * u) / (Math.sqrt(2 * Math.PI));
        }
        data.push({ peso: x, densidad: sum / (weights.length * bandwidth) });
    }
    return data;
}

export default function ProductivityView() {
    const { animals } = useDashboard();

    const stats = useMemo(() => {
        let activeCows = animals.filter(a => a.isActive);
        let countDelta = 0;
        let sumDelta = 0;
        let countPde = 0;
        let sumPde = 0;

        let sumWeight = 0;
        let countWeight = 0;

        for (const an of activeCows) {
            if (an.deltaGdm !== null) {
                sumDelta += an.deltaGdm;
                countDelta++;
            }
            if (an.pde !== null) {
                sumPde += an.pde;
                countPde++;
            }
            if (an.currentWeight !== null) {
                sumWeight += an.currentWeight;
                countWeight++;
            }
        }

        const avgDelta = countDelta > 0 ? sumDelta / countDelta : 0;
        const avgPde = countPde > 0 ? sumPde / countPde : 0;
        const meanWeight = countWeight > 0 ? sumWeight / countWeight : 0;

        // Uniformity Index (CV)
        let sumSqDiff = 0;
        for (const an of activeCows) {
            if (an.currentWeight !== null) {
                sumSqDiff += Math.pow(an.currentWeight - meanWeight, 2);
            }
        }
        const stdDev = countWeight > 1 ? Math.sqrt(sumSqDiff / (countWeight - 1)) : 0;
        const cv = meanWeight > 0 ? (stdDev / meanWeight) * 100 : 0;

        return {
            avgDelta,
            avgPde,
            meanWeight,
            stdDev,
            cv,
            densityData: calculateKDE(activeCows)
        };
    }, [animals]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Productividad y Crecimiento</h2>
                    <p className="text-slate-500 mt-1">Velocidad de caja, eficiencia PDE y distribución estadística del rodeo.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 border border-slate-200/50 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 mb-1 flex items-center gap-2">
                                Velocidad de Caja (Delta GDM)
                                <span title="Diferencia promedio de ganancia de peso entre la última pesada y la anterior. Indica si el rodeo se está acelerando o frenando." className="cursor-help"><Info className="w-3 h-3 text-slate-400" /></span>
                            </p>
                            <h3 className="text-4xl font-extrabold text-slate-800">{stats.avgDelta > 0 ? '+' : ''}{stats.avgDelta.toFixed(3)} <span className="text-lg text-slate-400 font-medium">kg/d</span></h3>
                        </div>
                        <div className={`p-3 rounded-xl ${stats.avgDelta >= 0 ? 'bg-emerald-100/50 text-emerald-600' : 'bg-rose-100/50 text-rose-600'}`}>
                            {stats.avgDelta >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 mb-1 flex items-center gap-2">
                                PDE Promedio
                                <span title="Peso por Día de Edad. Mide la eficiencia metabólica desde el nacimiento basándose en 30kg de peso inicial estimado." className="cursor-help"><Info className="w-3 h-3 text-slate-400" /></span>
                            </p>
                            <h3 className="text-4xl font-extrabold text-slate-800">{stats.avgPde.toFixed(3)} <span className="text-lg text-slate-400 font-medium">kg/d</span></h3>
                        </div>
                        <div className="bg-blue-100/50 p-3 rounded-xl text-blue-600">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 mb-1 flex items-center gap-2">
                                Índice de Uniformidad (CV)
                                <span title="Coeficiente de Variación. Si es menor al 10%, el rodeo es muy parejo (campana alta y estrecha). Si es mayor, hay problemas de disparidad forrajera." className="cursor-help"><Info className="w-3 h-3 text-slate-400" /></span>
                            </p>
                            <h3 className="text-4xl font-extrabold text-slate-800">{stats.cv.toFixed(1)} <span className="text-lg text-slate-400 font-medium">%</span></h3>
                        </div>
                        <div className="bg-purple-100/50 p-3 rounded-xl text-purple-600">
                            <Weight className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Distribution Curve Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 border border-slate-200/50 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Distribución de Pesos (Campana de Gauss)</h3>
                    <div className="text-sm font-medium text-slate-500 bg-white/60 px-3 py-1 rounded-full border border-slate-200/60">
                        Media: <span className="text-emerald-600 ml-1">{Math.round(stats.meanWeight)}kg</span>
                    </div>
                </div>

                {stats.densityData.length > 0 ? (
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.densityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDensidad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="peso"
                                    tickFormatter={(v) => `${v}kg`}
                                    stroke="#94a3b8"
                                    fontSize={12}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(v * 1000).toFixed(1)}`}
                                    width={36}
                                />
                                <Tooltip
                                    formatter={(value: any) => [(value * 100).toFixed(4), 'Densidad Relativa']}
                                    labelFormatter={(label) => `Peso: ${label} kg`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 500 }}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <ReferenceLine x={stats.meanWeight} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'Media', fill: '#64748b', fontSize: 12 }} />
                                <Area type="monotone" dataKey="densidad" stroke="#10b981" fillOpacity={1} fill="url(#colorDensidad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-80 w-full flex items-center justify-center text-slate-400">
                        No hay datos de peso suficientes para graficar la distribución.
                    </div>
                )}
            </motion.div>

            {/* Strategic Cross: Nutrition vs Fertility */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <EquilibriumChart />
            </motion.div>
        </div>
    );
}
