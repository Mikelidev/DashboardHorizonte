"use client";
import React, { useState, useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Scale, Dna, Activity, HeartPulse, ShieldAlert, GitCompare, BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';

interface AnimalComparisonViewProps {
    onViewChange?: (view: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b']; // Indigo, Emerald, Rose, Amber

export default function AnimalComparisonView({ onViewChange }: AnimalComparisonViewProps = {}) {
    const { animals, setActiveProfileIde } = useDashboard();
    
    // Multi-select state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIdes, setSelectedIdes] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'WEIGHT' | 'GDM' | 'SCORE'>('WEIGHT');

    // Active animals to search from, excluding already selected
    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return animals
            .filter(a => 
                a.ide.toLowerCase().includes(searchTerm.toLowerCase()) && 
                !selectedIdes.includes(a.ide)
            )
            .slice(0, 10); // Limit to top 10
    }, [animals, searchTerm, selectedIdes]);

    const selectedAnimals = useMemo(() => {
        return selectedIdes.map(ide => animals.find(a => a.ide === ide)).filter(Boolean) as typeof animals;
    }, [animals, selectedIdes]);

    const handleSelectAnimal = (ide: string) => {
        if (selectedIdes.length < 4 && !selectedIdes.includes(ide)) {
            setSelectedIdes([...selectedIdes, ide]);
        }
        setSearchTerm('');
        setIsDropdownOpen(false);
    };

    const handleRemoveAnimal = (ideToRemove: string) => {
        setSelectedIdes(selectedIdes.filter(ide => ide !== ideToRemove));
    };

    // Prepare chronological data for charts
    // We need to merge all events from selected animals into a unified timeline
    const mergedChartData = useMemo(() => {
        if (selectedAnimals.length === 0) return [];

        // 1. Gather all unique dates across all selected animals
        const allDates = new Set<number>();
        selectedAnimals.forEach(animal => {
            animal.eventos.forEach(ev => {
                if (ev.date.getTime() > 0) { // Ignore zero dates
                    allDates.add(ev.date.getTime());
                }
            });
        });

        // 2. Sort dates chronologically
        const sortedDates = Array.from(allDates).sort((a, b) => a - b);

        // Track last known weights to interpolate for each animal
        const lastKnownWeights: Record<string, number | null> = {};
        const lastKnownGdms: Record<string, number | null> = {};
        selectedAnimals.forEach(a => {
            lastKnownWeights[a.ide] = null;
            lastKnownGdms[a.ide] = null;
        });

        // 3. Create unified data points
        const chartData = sortedDates.map(time => {
            const dateObj = new Date(time);
            const dataPoint: any = {
                time: time,
                dateFormatted: dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
            };

            selectedAnimals.forEach(animal => {
                // Find event on this exact date
                const ev = animal.eventos.find(e => e.date.getTime() === time);
                
                if (ev) {
                    if (ev.weight !== null) {
                        dataPoint[`weight_${animal.ide}`] = ev.weight;
                        lastKnownWeights[animal.ide] = ev.weight;
                    } else {
                        dataPoint[`weight_${animal.ide}`] = lastKnownWeights[animal.ide];
                    }

                    if (ev.gdm !== null) {
                        dataPoint[`gdm_${animal.ide}`] = ev.gdm;
                        lastKnownGdms[animal.ide] = ev.gdm;
                    } else {
                        dataPoint[`gdm_${animal.ide}`] = lastKnownGdms[animal.ide];
                    }
                } else {
                    dataPoint[`weight_${animal.ide}`] = lastKnownWeights[animal.ide];
                    dataPoint[`gdm_${animal.ide}`] = lastKnownGdms[animal.ide];
                }
            });

            return dataPoint;
        });

        return chartData;
    }, [selectedAnimals]);

    const scoreChartData = useMemo(() => {
        if (selectedAnimals.length === 0) return [];
        return [
            {
                name: 'GDM (máx 30)',
                ...Object.fromEntries(selectedAnimals.map(a => [a.ide, a.scoreGdm]))
            },
            {
                name: 'Peso vs Lote (máx 30)',
                ...Object.fromEntries(selectedAnimals.map(a => [a.ide, a.scoreConsistency]))
            },
            {
                name: 'Tacto Anestro (máx 40)',
                ...Object.fromEntries(selectedAnimals.map(a => [a.ide, a.scoreReproductive]))
            },
        ];
    }, [selectedAnimals]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <GitCompare className="w-6 h-6 text-indigo-500" />
                        Comparativa de Vaquillonas
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Compara cara a cara hasta 4 animales para analizar su historial genético, reproductivo y de peso.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-96 z-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={selectedIdes.length >= 4 ? "Máximo 4 animales permitidos" : "Buscar IDE para agregar a la comparativa..."}
                            value={searchTerm}
                            disabled={selectedIdes.length >= 4}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-slate-700 font-medium placeholder:font-normal disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Auto-complete Dropdown */}
                    <AnimatePresence>
                        {isDropdownOpen && searchResults.length > 0 && selectedIdes.length < 4 && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-xl overflow-hidden"
                            >
                                <ul className="max-h-60 overflow-y-auto py-1">
                                    {searchResults.map(animal => (
                                        <li
                                            key={animal.ide}
                                            onClick={() => handleSelectAnimal(animal.ide)}
                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div className="font-semibold text-slate-700">{animal.ide}</div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{animal.reproductiveState || 'Sin Tacto'}</span>
                                                <span className="text-emerald-500">Activa</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Selected Animals Chips */}
            {selectedIdes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedAnimals.map((animal, idx) => (
                        <div 
                            key={animal.ide} 
                            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm"
                            style={{ borderLeftColor: COLORS[idx % COLORS.length], borderLeftWidth: '4px' }}
                        >
                            <span className="font-bold text-slate-700">{animal.ide}</span>
                            <button 
                                onClick={() => handleRemoveAnimal(animal.ide)}
                                title="Eliminar animal de la comparativa"
                                aria-label="Eliminar"
                                className="text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {selectedIdes.length < 4 && (
                        <div className="flex items-center gap-2 bg-transparent border border-dashed border-slate-300 px-3 py-1.5 rounded-full text-sm text-slate-400">
                            Espacio disponible ({4 - selectedIdes.length})
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {selectedAnimals.length === 0 && (
                <div className="glass rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center mt-8">
                    <GitCompare className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-2xl font-bold text-slate-700 mb-2">Comienza tu Comparativa</h3>
                    <p className="text-slate-500 max-w-md">
                        Utiliza el buscador superior para agregar hasta 4 animales y visualizar su información biológica, genética y productiva lado a lado.
                    </p>
                </div>
            )}

            {selectedAnimals.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-8">
                    
                    {/* Matrix Dashboard Cards */}
                    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(selectedAnimals.length, 4)} gap-4`}>
                        {selectedAnimals.map((animal, idx) => (
                            <div key={animal.ide} className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                                {/* Color line accent */}
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-slate-800 cursor-pointer hover:underline" onClick={() => {
                                            if (onViewChange) {
                                                setActiveProfileIde(animal.ide);
                                                onViewChange('profile');
                                            }
                                        }}>
                                            {animal.ide}
                                        </h3>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
                                            <Dna className="w-3 h-3" /> Padre: {animal.padre}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-black tracking-tighter text-indigo-900">{animal.scoreTotal}</span>
                                        <span className="text-xs text-slate-500 block">SCORE GDM</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><Scale className="w-3 h-3" /> Peso Actual</span>
                                        <span className="font-bold text-slate-800">{animal.currentWeight ?? '-'} kg</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3" /> GDM Promedio</span>
                                        <span className={`font-bold ${animal.averageGdm !== null && animal.averageGdm < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {animal.averageGdm ? `${animal.averageGdm > 0 ? '+' : ''}${animal.averageGdm.toFixed(3)}` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><HeartPulse className="w-3 h-3" /> Reproductivo</span>
                                        <span className={`font-bold text-xs ${animal.reproductiveState?.includes('PREÑADA') ? 'text-emerald-600' : animal.reproductiveState?.includes('ANESTRO') ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {animal.reproductiveState || 'Sin Tacto'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Retraso IATF</span>
                                        <span className={`font-bold ${animal.daysToTarget !== null && animal.daysToTarget > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {animal.daysToTarget !== null && animal.daysToTarget > 0 ? `${animal.daysToTarget} días` : 'Alcanzado'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className={`mt-4 absolute -bottom-3 -right-3 px-6 py-2 rounded-tl-2xl font-black text-sm uppercase transform -skew-x-12 ${
                                    animal.scoreCategory === 'ELITE' ? 'bg-indigo-600 text-white' : 
                                    animal.scoreCategory === 'COMERCIAL' ? 'bg-emerald-500 text-white' : 
                                    'bg-rose-500 text-white'
                                }`}>
                                    <div className="transform skew-x-12">
                                        {animal.scoreCategory}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comparative Historical Chart with Tabs */}
                    <div className="glass rounded-2xl p-6 border border-slate-200/60 flex flex-col h-[500px]">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Análisis Comparativo Detallado
                                <span title="Compara evolución y puntajes" className="cursor-help"><Activity className="w-4 h-4 text-slate-400" /></span>
                            </h3>

                            {/* Chart Tabs */}
                            <div className="flex bg-slate-100/80 p-1.5 rounded-xl self-start">
                                <button
                                    onClick={() => setActiveTab('WEIGHT')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'WEIGHT' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    <Scale className="w-4 h-4" /> Evolución de Peso
                                </button>
                                <button
                                    onClick={() => setActiveTab('GDM')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'GDM' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    <TrendingUp className="w-4 h-4" /> Evolución de GDM
                                </button>
                                <button
                                    onClick={() => setActiveTab('SCORE')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'SCORE' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                >
                                    <BarChart3 className="w-4 h-4" /> Comparativa de Score
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            {activeTab !== 'SCORE' ? (
                                mergedChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={mergedChartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="dateFormatted"
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                stroke="#cbd5e1"
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                unit={activeTab === 'WEIGHT' ? "kg" : "kg/d"}
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                stroke="#cbd5e1"
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                                                formatter={(value: any, name: string | number | undefined) => {
                                                    const unit = activeTab === 'WEIGHT' ? 'kg' : 'kg/día';
                                                    const prefix = activeTab === 'WEIGHT' ? 'weight_' : 'gdm_';
                                                    const ide = String(name || '').replace(prefix, '');
                                                    return [`${Number(value).toFixed(activeTab === 'GDM' ? 3 : 1)} ${unit}`, `IDE: ${ide}`];
                                                }}
                                            />
                                            <Legend 
                                                verticalAlign="top" 
                                                height={36} 
                                                formatter={(value) => {
                                                    const idea = value.replace('weight_', '').replace('gdm_', '');
                                                    return <span className="text-slate-700 font-semibold text-sm">IDE: {idea}</span>;
                                                }}
                                            />

                                            {selectedAnimals.map((animal, idx) => (
                                                <Line
                                                    key={animal.ide}
                                                    type="monotone"
                                                    dataKey={activeTab === 'WEIGHT' ? `weight_${animal.ide}` : `gdm_${animal.ide}`}
                                                    name={activeTab === 'WEIGHT' ? `weight_${animal.ide}` : `gdm_${animal.ide}`}
                                                    stroke={COLORS[idx % COLORS.length]}
                                                    strokeWidth={3}
                                                    connectNulls
                                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                                    activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 font-medium italic">
                                        No hay datos históricos suficientes para trazar el gráfico.
                                    </div>
                                )
                            ) : (
                                /* SCORE BAR CHART */
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreChartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            domain={[0, 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)', padding: '12px', background: 'rgba(255,255,255,0.97)' }}
                                            formatter={(value: any, name?: string | number) => [`${Number(value).toFixed(1)} pts`, `IDE: ${String(name ?? '')}`]}
                                        />
                                        <Legend 
                                            verticalAlign="top" 
                                            height={36} 
                                            formatter={(value) => <span className="text-slate-700 font-semibold text-sm">IDE: {value}</span>}
                                        />
                                        {selectedAnimals.map((animal, idx) => (
                                            <Bar 
                                                key={animal.ide}
                                                dataKey={animal.ide} 
                                                name={animal.ide}
                                                fill={COLORS[idx % COLORS.length]} 
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={60}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
