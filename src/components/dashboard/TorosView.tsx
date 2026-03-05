import React, { useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateSireAnalytics, SireAnalytics } from '@/lib/analytics-engine';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { ArrowDown, ArrowUp, Minus, Info, Medal } from 'lucide-react';
import TopBottomRankings from './TopBottomRankings';

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { key: keyof SireAnalytics | '', direction: SortDirection };

type MetricKey = keyof SireAnalytics;

interface MetricOption {
    id: MetricKey;
    label: string;
    format: (val: number) => string;
    color: string;
}

const METRICS: MetricOption[] = [
    { id: 'totalBiomasa', label: 'Biomasa Producida', format: v => `${Math.floor(v)} kg totales`, color: '#6366f1' },
    { id: 'totalHijas', label: 'Volumen', format: v => `${v} hijas`, color: '#8b5cf6' },
    { id: 'porcentajePrenadas', label: 'Tasa de Preñez', format: v => `${v.toFixed(1)}%`, color: '#10b981' },
    { id: 'porcentajeAnestro', label: 'Aparición Anestro Histórico', format: v => `${v.toFixed(1)}%`, color: '#f43f5e' },
    { id: 'gdmPromedio', label: 'GDM Promedio', format: v => `${v.toFixed(3)} kg/d`, color: '#f59e0b' },
    { id: 'pesoPromedio', label: 'Peso Promedio', format: v => `${v.toFixed(1)} kg`, color: '#0ea5e9' }
];

export default function TorosView({ onViewChange }: { onViewChange?: (view: string) => void }) {
    const { animals, setActiveSireId } = useDashboard();
    const analytics = useMemo(() => calculateSireAnalytics(animals), [animals]);
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('totalBiomasa');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    const sortedAnalytics = useMemo(() => {
        let sortableItems = [...analytics];
        if (sortConfig.direction !== null && sortConfig.key !== '') {
            sortableItems.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof SireAnalytics];
                let bVal: any = b[sortConfig.key as keyof SireAnalytics];

                if (aVal === null) aVal = -Infinity;
                if (bVal === null) bVal = -Infinity;

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [analytics, sortConfig]);

    const handleSort = (key: keyof SireAnalytics) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null; // Neutral state
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey: keyof SireAnalytics) => {
        if (sortConfig.key !== columnKey) return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-500 ml-1 inline" />;
        if (sortConfig.direction === 'desc') return <ArrowDown className="w-3 h-3 text-rose-500 ml-1 inline" />;
        return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
    };

    if (analytics.length === 0) {
        return <div className="p-10 text-center text-slate-500">No hay datos suficientes para generar el Ranking de Toros.</div>;
    }

    const activeMetricOpt = METRICS.find(m => m.id === selectedMetric)!;

    // Sort chart data based on selected metric descending
    const chartData = [...analytics].sort((a, b) => (b[selectedMetric] as number) - (a[selectedMetric] as number));

    return (
        <div className="animate-in fade-in duration-700 max-w-[1400px] mx-auto flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Ranking de Genética (Padres)</h2>
                <p className="text-slate-500 mt-1">Ranking de performance reproductiva y desarrollo por Padre.</p>
            </div>

            {/* Metric Selector & Chart */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500 mr-2">Eje del Gráfico:</span>
                    {METRICS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedMetric(m.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${selectedMetric === m.id
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="padre" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => Math.floor(v).toString()} />
                            <RechartsTooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [activeMetricOpt.format(value as number), activeMetricOpt.label]}
                                labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                            />
                            <Bar
                                dataKey={selectedMetric}
                                radius={[6, 6, 0, 0]}
                                animationDuration={1000}
                                className="cursor-pointer"
                                onClick={(data: any) => {
                                    const padre = data?.payload?.padre || data?.padre;
                                    if (padre) {
                                        setActiveSireId(padre);
                                        if (onViewChange) onViewChange('sire-profile');
                                    }
                                }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={activeMetricOpt.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Strategic Scatter Plot */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Relación Productiva: Preñez vs Peso Promedio
                        <Info className="w-4 h-4 text-slate-400" />
                    </h3>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                type="number"
                                dataKey="pesoPromedio"
                                name="Peso Promedio"
                                unit="kg"
                                domain={['dataMin - 10', 'dataMax + 10']}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="number"
                                dataKey="porcentajePrenadas"
                                name="Tasa de Preñez"
                                unit="%"
                                domain={[0, 100]}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <RechartsTooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any, name: string | undefined) => {
                                    if (name === 'Peso Promedio') return [`${(value as number).toFixed(1)} kg`, name];
                                    if (name === 'Tasa de Preñez') return [`${(value as number).toFixed(1)}%`, name];
                                    return [value, name || ''];
                                }}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.padre || ''}
                                labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral Mínimo 60%', fill: '#f59e0b', fontSize: 10 }} />
                            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'Élite >= 80%', fill: '#10b981', fontSize: 10 }} />

                            <Scatter
                                name="Padres"
                                data={analytics}
                                fill="#8b5cf6"
                                className="cursor-pointer"
                                onClick={(data: any) => {
                                    const padre = data?.payload?.padre || data?.padre || data?.name;
                                    if (padre) {
                                        setActiveSireId(padre);
                                        if (onViewChange) onViewChange('sire-profile');
                                    }
                                }}
                            >
                                {analytics.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.porcentajePrenadas >= 80 ? '#10b981' : entry.porcentajePrenadas >= 60 ? '#f59e0b' : '#f43f5e'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden h-[500px] flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1 relative outline-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
                            <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('padre')}>
                                    Padre {getSortIcon('padre')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('totalHijas')}>
                                    Volumen (Crías) {getSortIcon('totalHijas')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('totalBiomasa')}>
                                    Biomasa Total {getSortIcon('totalBiomasa')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('porcentajePrenadas')}>
                                    Tasa de Preñez Final {getSortIcon('porcentajePrenadas')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('porcentajeAnestro')}>
                                    Aparición Anestro Histórico (AS/AP) {getSortIcon('porcentajeAnestro')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('gdmPromedio')}>
                                    GDM Crecimiento {getSortIcon('gdmPromedio')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('pesoPromedio')}>
                                    Peso Promedio {getSortIcon('pesoPromedio')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedAnalytics.map((sire, idx) => (
                                <motion.tr
                                    key={sire.padre}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-slate-50/50 transition-colors duration-200"
                                >
                                    <td
                                        className="px-6 py-4 whitespace-nowrap font-bold text-indigo-600 cursor-pointer hover:underline"
                                        onClick={() => {
                                            setActiveSireId(sire.padre);
                                            if (onViewChange) onViewChange('sire-profile');
                                        }}
                                    >
                                        {sire.padre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-600">
                                        {sire.totalHijas}
                                    </td>

                                    {/* Biomasa */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-indigo-600">
                                        {Math.floor(sire.totalBiomasa).toLocaleString()} kg
                                    </td>

                                    {/* Tasa Preñez */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`inline-flex font-semibold items-center px-2.5 py-0.5 rounded-full text-sm ${sire.porcentajePrenadas >= 80 ? 'bg-emerald-100 text-emerald-800' : sire.porcentajePrenadas >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                            {sire.porcentajePrenadas.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-slate-400 ml-2">({sire.hijasPrenadas})</span>
                                    </td>

                                    {/* Historial Anestro */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`font-semibold ${sire.porcentajeAnestro > 30 ? 'text-red-600' : 'text-slate-700'}`}>
                                            {sire.porcentajeAnestro.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-slate-400 ml-2">({sire.hijasConAnestroHistorial})</span>
                                    </td>

                                    {/* GDM */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-700">
                                        {sire.gdmPromedio.toFixed(3)} kg/d
                                    </td>

                                    {/* Peso Promedio */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-700">
                                        {sire.pesoPromedio.toFixed(1)} kg
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Individual Quality Extremes */}
            <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <Medal className="w-7 h-7 text-indigo-500" />
                    <h2 className="text-2xl font-bold text-slate-800">Ranking Individual de Vientres</h2>
                </div>
                <p className="text-slate-500 mb-6">Identificación de matrices de élite y pasajeras costosas basada en Performance Data Engine (PDE) y crecimiento.</p>
                <TopBottomRankings onViewChange={onViewChange} />
            </div>
        </div>
    );
}
