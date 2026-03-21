"use client";
import React, { useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateSireAnalytics, SireAnalytics } from '@/lib/analytics-engine';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, Legend } from 'recharts';
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

// ─── Paleta de colores robusta para múltiples toros ─────────────────────────
const SIRE_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9',
    '#8b5cf6', '#84cc16', '#ec4899', '#14b8a6', '#f97316',
];

// ─── Sub-chart: Evolución de Peso Promedio por Toro ─────────────────────────
function BullWeightEvolutionChart({
    animals,
    onViewChange,
}: {
    animals: import('@/types').ProcessedAnimal[];
    onViewChange?: (view: string) => void;
}) {
    const { setActiveSireId } = useDashboard();

    const { chartData, sires } = useMemo(() => {
        // Collect all weighing events grouped by (padre, dateKey)
        const byPadreAndDate = new Map<string, Map<string, { sum: number; count: number }>>();

        for (const animal of animals) {
            if (!animal.isActive) continue;
            const padre = animal.padre || 'Otros Toros';

            for (const ev of animal.eventos) {
                const isPesada = ev.type.toUpperCase().includes('PESADA');
                if (!isPesada || ev.weight === null) continue;

                const dateKey = ev.date.toISOString().slice(0, 10); // YYYY-MM-DD

                if (!byPadreAndDate.has(padre)) byPadreAndDate.set(padre, new Map());
                const dateMap = byPadreAndDate.get(padre)!;

                if (!dateMap.has(dateKey)) dateMap.set(dateKey, { sum: 0, count: 0 });
                const acc = dateMap.get(dateKey)!;
                acc.sum += ev.weight;
                acc.count++;
            }
        }

        // Gather all unique sorted dates across all bulls
        const allDates = new Set<string>();
        for (const dateMap of byPadreAndDate.values()) {
            for (const dateKey of dateMap.keys()) allDates.add(dateKey);
        }
        const sortedDates = Array.from(allDates).sort();

        const siresFound = Array.from(byPadreAndDate.keys()).sort();

        // Build chart data: one row per date, one column per bull
        const data = sortedDates.map(dateKey => {
            const row: Record<string, any> = {
                fecha: new Date(dateKey).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
                fechaISO: dateKey,
            };
            for (const padre of siresFound) {
                const entry = byPadreAndDate.get(padre)?.get(dateKey);
                row[padre] = entry && entry.count > 0 ? Math.round(entry.sum / entry.count) : null;
            }
            return row;
        });

        return { chartData: data, sires: siresFound };
    }, [animals]);

    if (chartData.length === 0 || sires.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                <p className="text-slate-400 text-center">Sin datos de pesadas suficientes para graficar evolución.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Evolución de Peso Promedio por Toro
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Peso promedio de las hijas de cada padre a lo largo de cada pesada.
                    </p>
                </div>
                <div className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
                    {sires.length} toros · {chartData.length} pesadas
                </div>
            </div>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="fecha"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `${v}kg`}
                            width={52}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.12)',
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                            formatter={(value: any, name: string | undefined) => [`${value} kg`, name ?? '']}
                            labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: 4 }}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                            onClick={(e: any) => {
                                const padre = e?.dataKey;
                                if (padre) {
                                    setActiveSireId(padre);
                                    if (onViewChange) onViewChange('sire-profile');
                                }
                            }}
                        />
                        {sires.map((padre, idx) => (
                            <Line
                                key={padre}
                                type="monotone"
                                dataKey={padre}
                                name={padre}
                                stroke={SIRE_COLORS[idx % SIRE_COLORS.length]}
                                strokeWidth={2.5}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls={false}
                                animationDuration={800}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

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

    // Stable color map: sorted alphabetically to match the LineChart
    const sireColorMap = useMemo(() => {
        const sortedPadres = [...analytics].map(a => a.padre).sort();
        const map = new Map<string, string>();
        sortedPadres.forEach((padre, idx) => {
            map.set(padre, SIRE_COLORS[idx % SIRE_COLORS.length]);
        });
        return map;
    }, [analytics]);

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
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => {
                                if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
                                return v % 1 === 0 ? v.toString() : v.toFixed(1);
                            }} />
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
                                    <Cell key={`cell-${index}`} fill={sireColorMap.get(entry.padre) ?? activeMetricOpt.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bull Weight Evolution Chart */}
            <BullWeightEvolutionChart animals={animals} onViewChange={onViewChange} />

            {/* Detailed Table */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[420px] relative outline-none">
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
                                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                                >
                                    <td
                                        className="px-6 py-4 whitespace-nowrap font-bold cursor-pointer hover:underline"
                                        style={{ color: sireColorMap.get(sire.padre) ?? '#6366f1' }}
                                        onClick={() => {
                                            setActiveSireId(sire.padre);
                                            if (onViewChange) onViewChange('sire-profile');
                                        }}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: sireColorMap.get(sire.padre) ?? '#6366f1' }}
                                            />
                                            {sire.padre}
                                        </span>
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
