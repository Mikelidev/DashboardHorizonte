import React, { useState, useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Activity, Calendar, GitCommit, HeartPulse, Scale, Dna, Info, Target, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';
import { ProcessedAnimal, ProcessedEvent } from '@/types';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.chartWeight === null) return null;

    const state = payload.reproductiveState?.toUpperCase() || '';
    let fill = '#94a3b8'; // Default slate
    let r = 4;
    let stroke = '#fff';

    if (state.includes('PREÑADA') || state.includes('CICLANDO')) {
        fill = '#10b981'; // Emerald
        r = 6;
    } else if (state.includes('ANESTRO')) {
        fill = '#f43f5e'; // Rose
        r = 6;
    }

    // Give prominence to explicit Tacto or Service events even without state match
    if (payload.type.toUpperCase().includes('TACTO') || payload.type.toUpperCase().includes('SERVICIO')) {
        stroke = fill;
        fill = '#fff';
        r = 5;
    }

    return (
        <circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={2} fill={fill} />
    );
};

interface AnimalProfileProps {
    onViewChange?: (view: string) => void;
}

export default function AnimalProfile({ onViewChange }: AnimalProfileProps = {}) {
    const { animals, settings, activeProfileIde, setActiveProfileIde, setActiveSireId } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIde, setSelectedIde] = useState<string | null>(activeProfileIde || null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Sync with global context if it changes from outside (e.g., clicking on Inventory Table)
    React.useEffect(() => {
        if (activeProfileIde) {
            setSelectedIde(activeProfileIde);
            setSearchTerm(activeProfileIde);
        }
    }, [activeProfileIde]);

    // Active animals to search from
    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return animals
            .filter(a => a.ide.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 10); // Limit to top 10
    }, [animals, searchTerm]);

    const activeAnimal = useMemo(() => {
        if (!selectedIde) return null;
        return animals.find(a => a.ide === selectedIde) || null;
    }, [animals, selectedIde]);

    const handleSelectAnimal = (ide: string) => {
        setSelectedIde(ide);
        setActiveProfileIde(ide); // Update global state
        setSearchTerm(ide);
        setIsDropdownOpen(false);
    };

    // Prepare chronological data for charts & timeline
    const { chartData, chronologicalEvents } = useMemo(() => {
        if (!activeAnimal) return { chartData: [], chronologicalEvents: [] };

        const chrono = [...activeAnimal.eventos].sort((a, b) => a.date.getTime() - b.date.getTime());

        let lastKnownWeight: number | null = null;
        const mappedChart = chrono.map(ev => {
            if (ev.weight !== null) lastKnownWeight = ev.weight;
            return {
                ...ev,
                chartWeight: ev.weight !== null ? ev.weight : lastKnownWeight,
                dateFormatted: ev.date.getTime() === 0 ? 'Sin fecha' : ev.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
            };
        });

        return { chartData: mappedChart, chronologicalEvents: chrono };
    }, [activeAnimal]);

    const padresActivos = React.useMemo(() => {
        const activeAnimals = animals.filter(a => a.isActive);
        const counts: Record<string, number> = {};
        activeAnimals.forEach(a => {
            if (a.padre) {
                counts[a.padre] = (counts[a.padre] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([padre, count]) => ({ padre, count }))
            .sort((a, b) => b.count - a.count);
    }, [animals]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Ficha Médica Individual</h2>
                    <p className="text-slate-500 mt-1">
                        Historial clínico, curva de desarrollo longitudinal y trazabilidad de eventos.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80 z-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar IDE de animal..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                                if (e.target.value === '') {
                                    setSelectedIde(null);
                                    setActiveProfileIde(null);
                                }
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-slate-700 font-medium placeholder:font-normal"
                        />
                    </div>

                    {/* Auto-complete Dropdown */}
                    <AnimatePresence>
                        {isDropdownOpen && searchResults.length > 0 && (
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
                                                {animal.isActive ? (
                                                    <span className="text-emerald-500">Activa</span>
                                                ) : (
                                                    <span className="text-rose-500">Inactiva (Sin Info)</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Padres Activos List */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Dna className="w-4 h-4 text-indigo-400" />
                    Fichas Médicas de Padres Activos
                </h4>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex w-max space-x-4">
                        {padresActivos.map((p) => (
                            <div
                                key={p.padre}
                                onClick={() => {
                                    setActiveSireId(p.padre);
                                    if (onViewChange) onViewChange('sire-profile');
                                }}
                                className="inline-flex items-center gap-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all rounded-xl p-3 px-5 group"
                            >
                                <div className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Dna className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-800 group-hover:text-indigo-700 transition-colors">{p.padre}</p>
                                    <p className="text-xs font-semibold text-slate-400">{p.count} crías hijas</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Empty State */}
            {!activeAnimal && (
                <div className="glass rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <Search className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Buscador de Historial Clínico</h3>
                    <p className="text-slate-500 max-w-sm">
                        Busca y selecciona un IDE (Identificador Electrónico) para desplegar su ficha médica, línea de vida y trazabilidad completa.
                    </p>
                </div>
            )}

            {/* Profile Content */}
            {activeAnimal && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">

                    {/* Header Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Identidad & Genética</span>
                            <div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{activeAnimal.ide}</h3>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1">
                                    <Dna className="w-3 h-3" /> Padre: {activeAnimal.padre}
                                </p>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                                Termodinámica (GDM)
                                {activeAnimal.alertRed && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                            </span>
                            <div>
                                <h3 className={`text-3xl font-extrabold tracking-tight ${activeAnimal.currentGdm !== null && activeAnimal.currentGdm < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {activeAnimal.currentGdm !== null ? `${activeAnimal.currentGdm > 0 ? '+' : ''}${activeAnimal.currentGdm.toFixed(3)}` : 'N/A'} <span className="text-sm font-semibold opacity-70">kg/d</span>
                                </h3>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1">
                                    <Scale className="w-3 h-3" /> Peso Actual: {activeAnimal.currentWeight ?? 'N/A'} kg
                                </p>
                            </div>
                        </div>

                        <div className={`rounded-2xl p-5 border flex flex-col justify-between ${activeAnimal.reproductiveState?.toUpperCase().includes('PREÑADA') ? 'bg-emerald-50 border-emerald-200/60' :
                            activeAnimal.reproductiveState?.toUpperCase().includes('ANESTRO') ? 'bg-rose-50 border-rose-200/60' :
                                'glass border-slate-200/60'
                            }`}>
                            <span className="text-xs font-semibold uppercase tracking-wider mb-2 flex justify-between items-center text-slate-500">
                                Estado Reproductivo
                            </span>
                            <div>
                                <h3 className={`text-2xl font-extrabold tracking-tight ${activeAnimal.reproductiveState?.toUpperCase().includes('PREÑADA') ? 'text-emerald-700' :
                                    activeAnimal.reproductiveState?.toUpperCase().includes('ANESTRO') ? 'text-rose-700' :
                                        'text-slate-800'
                                    }`}>
                                    {activeAnimal.reproductiveState || 'Sin Tacto o Vacía'}
                                </h3>
                                <p className="text-sm font-medium opacity-70 flex items-center gap-1 mt-1">
                                    <HeartPulse className="w-3 h-3" /> {activeAnimal.masterServiceType ? `Servicio: ${activeAnimal.masterServiceType}` : 'No Evaluada'}
                                </p>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between relative overflow-hidden">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Score Horizon / PDE</span>
                            <div className="z-10 relative">
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {activeAnimal.scoreTotal} <span className="text-sm font-semibold text-slate-500">/ 100 pt</span>
                                </h3>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1">
                                    <Activity className="w-3 h-3" /> PDE: {activeAnimal.pde !== null ? activeAnimal.pde.toFixed(3) : 'Sin Nacimiento'}
                                </p>
                            </div>
                            {/* Decorative badge background for Category */}
                            <div className={`absolute -right-4 -bottom-4 opacity-10 font-black text-6xl italic transform rotate-[-10deg]`}>
                                {activeAnimal.scoreCategory === 'ELITE' ? 'ÉLITE' : activeAnimal.scoreCategory === 'DESCARTE' ? 'RECHAZO' : ''}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Life Line Chart */}
                        <div className="glass rounded-2xl p-6 border border-slate-200/60 lg:col-span-2">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                Curva de Evolución Longitudinal (Línea de Vida)
                                <span title="Curva de peso en el tiempo intercedida con los eventos reproductivos." className="cursor-help"><Info className="w-4 h-4 text-slate-400" /></span>
                            </h3>

                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="dateFormatted"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            stroke="#cbd5e1"
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            domain={['dataMin - 20', 'dataMax + 20']}
                                            unit="kg"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            stroke="#cbd5e1"
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                            formatter={(value: any, name: string | undefined) => {
                                                if (name === 'chartWeight') return [`${value} kg`, 'Peso Interpolado/Real'];
                                                return [value, name || ''];
                                            }}
                                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                                            labelFormatter={(label, payload) => {
                                                if (!payload || payload.length === 0) return label;
                                                const data = payload[0].payload as any;
                                                return `Fecha: ${label} | Evento: ${data.type}`;
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="chartWeight"
                                            stroke="#94a3b8"
                                            strokeWidth={3}
                                            connectNulls
                                            dot={<CustomDot />}
                                            activeDot={{ r: 8, strokeWidth: 0, fill: '#6366f1' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center gap-4 mt-4 justify-center text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Preñada / Ciclando</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Anestro</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-white inline-block"></span> Evaluación (Tacto/Servicio)</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Pesada</span>
                            </div>
                        </div>

                        {/* Clinical Timeline */}
                        <div className="glass rounded-2xl p-6 border border-slate-200/60 flex flex-col h-[420px]">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 shrink-0">
                                <GitCommit className="w-5 h-5 text-indigo-500" />
                                Trazabilidad Clínica
                            </h3>

                            <div className="flex-1 overflow-y-auto pr-2 relative">
                                {/* Timeline vertical line */}
                                <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-slate-200/80 z-0"></div>

                                <div className="space-y-6 relative z-10">
                                    {chronologicalEvents.reverse().map((ev, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            {/* Node */}
                                            <div className="shrink-0 mt-1">
                                                <div className={`w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${ev.reproductiveState?.toUpperCase().includes('PREÑADA') ? 'bg-emerald-500' :
                                                    ev.reproductiveState?.toUpperCase().includes('ANESTRO') ? 'bg-rose-500' :
                                                        ev.gdm && ev.gdm < 0 ? 'bg-amber-500' :
                                                            'bg-slate-400'
                                                    }`}></div>
                                            </div>

                                            {/* Content */}
                                            <div className={`flex-1 rounded-xl p-4 border shadow-sm transition-all ${idx === 0 ? 'bg-white border-indigo-100 shadow-md ring-1 ring-indigo-500/10' : 'bg-white/50 border-slate-100'
                                                }`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-bold text-sm ${idx === 0 ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {ev.type}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {ev.date.getTime() === 0 ? 'Sin fecha definida' : ev.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-medium text-slate-600">
                                                    {ev.weight && (
                                                        <span className="flex items-center gap-1"><Scale className="w-3 h-3 text-slate-400" /> {ev.weight} kg</span>
                                                    )}
                                                    {ev.gdm !== null && (
                                                        <span className={`flex items-center gap-1 ${ev.gdm < 0 ? 'text-rose-600 font-bold' : ''}`}>
                                                            <Activity className="w-3 h-3 text-slate-400" />
                                                            {ev.gdm > 0 ? '+' : ''}{ev.gdm.toFixed(3)} kg/d
                                                        </span>
                                                    )}
                                                    {ev.reproductiveState && (
                                                        <span className={`flex items-center gap-1 ${ev.reproductiveState.toUpperCase().includes('PREÑADA') ? 'text-emerald-600' : ev.reproductiveState.toUpperCase().includes('ANESTRO') ? 'text-rose-600' : ''}`}>
                                                            <HeartPulse className="w-3 h-3 text-slate-400" /> {ev.reproductiveState}
                                                        </span>
                                                    )}
                                                    {ev.serviceType && (
                                                        <span className="flex items-center gap-1 text-indigo-600"><Target className="w-3 h-3 text-indigo-400" /> {ev.serviceType}</span>
                                                    )}
                                                </div>

                                                {/* Veterinarian Comments */}
                                                {ev.comments && ev.comments.trim() !== '' && (
                                                    <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                                        "{ev.comments}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </div>
    );
}
