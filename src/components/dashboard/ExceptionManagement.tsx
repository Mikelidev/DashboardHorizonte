import React, { useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowDown, ArrowUp, Minus, Activity, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessedAnimal } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import AlertCards from './AlertCards';

function AnomalyCategoryGroup({ category, items, setActiveProfileIde }: { category: string, items: any[], setActiveProfileIde: (ide: string) => void }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white/40 rounded-xl overflow-hidden shadow-sm border border-indigo-100/50 opacity-95 hover:opacity-100 transition-opacity">
            <div
                className="bg-indigo-100/50 px-4 py-3 flex items-center justify-between border-b border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <h4 className="font-bold text-indigo-900">{category}</h4>
                    <span className="text-xs font-bold bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">{items.length}</span>
                </div>
                <div className="text-indigo-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <ScrollArea className="h-[280px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-indigo-50/95 backdrop-blur-sm z-10 border-b border-indigo-100 shadow-sm">
                                    <tr className="text-indigo-900 uppercase tracking-wider text-xs">
                                        <th className="py-3 px-4 font-bold w-32">IDE</th>
                                        <th className="py-3 px-4 font-bold">Descripción</th>
                                        <th className="py-3 px-4 font-bold w-48">Ubicación</th>
                                        <th className="py-3 px-4 font-bold w-64">Posible Causa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm divide-indigo-50">
                                    {items.map((ano, i) => (
                                        <tr key={`${ano.ide}-${i}`} className="hover:bg-indigo-50/50 transition-colors">
                                            <td
                                                className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap cursor-pointer hover:underline"
                                                onClick={() => setActiveProfileIde(ano.ide)}
                                            >
                                                {ano.ide}
                                            </td>
                                            <td className="py-3 px-4 text-slate-800 break-words">{ano.desc}</td>
                                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap"><span className="bg-white/60 px-2 py-1 rounded text-xs font-mono">{ano.location}</span></td>
                                            <td className="py-3 px-4 text-slate-600 italic break-words">{ano.cause}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { key: keyof ProcessedAnimal | '', direction: SortDirection };

export default function ExceptionManagement({ onViewChange }: { onViewChange?: (view: string) => void }) {
    const { animals, settings, anomalies, setActiveProfileIde } = useDashboard();
    const [isQaExpanded, setIsQaExpanded] = useState(false);

    // Sort states for Top and Bottom lists
    const [topSort, setTopSort] = useState<SortConfig>({ key: '', direction: null });
    const [bottomSort, setBottomSort] = useState<SortConfig>({ key: '', direction: null });

    const alerts = useMemo(() => {
        const active = animals.filter(a => a.isActive);

        // Z-Score Critical Alerts (Red) 
        // We defined Z-score < -2 as critical in data-processor.ts (alertRed incorporates it implicitly if we configured it, 
        // but let's strictly count the lowest category from our Horizon Score mapped matrix).
        const criticalCows = active.filter(a => a.scoreCategory === 'DESCARTE' || a.alertRed);

        // At-risk Cows (Yellow)
        const delayedCows = active.filter(a => a.alertYellow && !a.alertRed);

        // --- TOP 20 BEST COWS (Las Matrices) ---
        // Criteria: Pregnant/Cycling + Highest PDE + Highest GDM
        const top20 = [...active]
            .filter(a => a.reproductiveState && (a.reproductiveState.toUpperCase().includes('PREÑADA') || a.reproductiveState.toUpperCase().includes('CICLANDO')))
            .filter(a => a.pde !== null && a.currentGdm !== null)
            .sort((a, b) => {
                // Secondary sort: Score Total. Primary Sort: PDE
                if (b.pde !== a.pde) return (b.pde || 0) - (a.pde || 0);
                return b.scoreTotal - a.scoreTotal;
            })
            .slice(0, 20);

        // --- BOTTOM 20 WORST COWS (Los Pasajeros Costosos) ---
        // Criteria: Deep Anestrus + Lowest GDM 
        const bottom20 = [...active]
            .filter((a: ProcessedAnimal) => a.reproductiveState && a.reproductiveState.toUpperCase().includes('ANESTRO'))
            .filter((a: ProcessedAnimal) => a.currentGdm !== null)
            .sort((a, b) => {
                // Sort ascending by Score (Lowest first) and GDM
                if (a.scoreTotal !== b.scoreTotal) return a.scoreTotal - b.scoreTotal;
                return (a.currentGdm || 0) - (b.currentGdm || 0);
            })
            .slice(0, 20);

        return {
            totalActive: active.length,
            criticalCows,
            delayedCows,
            top20,
            bottom20
        };
    }, [animals]);

    // Sorting Helper
    const performSort = (list: ProcessedAnimal[], config: SortConfig) => {
        if (!config.key || config.direction === null) return list;
        return [...list].sort((a, b) => {
            let aVal: any = a[config.key as keyof ProcessedAnimal];
            let bVal: any = b[config.key as keyof ProcessedAnimal];
            if (aVal === null) aVal = -Infinity;
            if (bVal === null) bVal = -Infinity;
            if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedTop20 = React.useMemo(() => performSort(alerts.top20, topSort), [alerts.top20, topSort]);
    const sortedBottom20 = React.useMemo(() => performSort(alerts.bottom20, bottomSort), [alerts.bottom20, bottomSort]);

    const handleSort = (config: SortConfig, setConfig: React.Dispatch<React.SetStateAction<SortConfig>>, key: keyof ProcessedAnimal) => {
        let direction: SortDirection = 'asc';
        if (config.key === key && config.direction === 'asc') direction = 'desc';
        else if (config.key === key && config.direction === 'desc') direction = null;
        setConfig({ key, direction });
    };

    const getSortIcon = (config: SortConfig, columnKey: keyof ProcessedAnimal) => {
        if (config.key !== columnKey) return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
        if (config.direction === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-500 ml-1 inline" />;
        if (config.direction === 'desc') return <ArrowDown className="w-3 h-3 text-rose-500 ml-1 inline" />;
        return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
    };

    const renderCowTableRows = (list: ProcessedAnimal[], isTop: boolean) => {
        if (list.length === 0) return (
            <tr><td colSpan={5} className="text-slate-500 text-center py-8">No hay suficientes datos procesados.</td></tr>
        );
        return list.map((cow, index) => (
            <tr key={cow.ide} className={`hover:bg-slate-50 border-b border-slate-100 ${isTop ? 'hover:bg-emerald-50/30' : 'hover:bg-rose-50/30'} transition-colors`}>
                <td className="py-3 px-4 font-mono font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => { setActiveProfileIde(cow.ide); if (onViewChange) onViewChange('profile'); }}>
                    {cow.ide}
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">
                    {cow.reproductiveState || 'Sin Tacto'}
                </td>
                <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.currentGdm?.toFixed(3)}</span>
                </td>
                <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.pde !== null ? cow.pde.toFixed(3) : '-'}</span>
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-700">
                    {cow.scoreTotal}
                </td>
            </tr>
        ));
    };

    // Group anomalies by category
    const groupedAnomalies = useMemo(() => {
        if (!anomalies) return {};
        return anomalies.reduce((acc, curr) => {
            if (!acc[curr.category]) acc[curr.category] = [];
            acc[curr.category].push(curr);
            return acc;
        }, {} as Record<string, import('@/types').DataAnomaly[]>);
    }, [anomalies]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Control de Pérdidas y Calidad</h2>
                    <p className="text-slate-500 mt-1">Gestión de excepciones mediante Z-Scores y detección polarizada del rodeo.</p>
                </div>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition flex items-center gap-2">
                    <ArrowDown className="w-4 h-4" />
                    Exportar Lista de Descarte
                </button>
            </div>

            {/* Alert Summary Cards */}
            <AlertCards />

            {/* Rankings Top/Bottom Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">

                {/* Top 20 Best */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 border border-slate-200/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ArrowUp className="w-5 h-5 text-emerald-500" />
                            Top 20 Absoluto (Mejores)
                        </h3>
                        <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Matrices Élite</span>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto relative outline-none custom-scrollbar rounded-xl border border-slate-200 shadow-inner bg-white/50">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
                                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none" onClick={() => handleSort(topSort, setTopSort, 'ide')}>IDE {getSortIcon(topSort, 'ide')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none" onClick={() => handleSort(topSort, setTopSort, 'reproductiveState')}>Repro {getSortIcon(topSort, 'reproductiveState')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(topSort, setTopSort, 'currentGdm')}>GDM {getSortIcon(topSort, 'currentGdm')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(topSort, setTopSort, 'pde')}>PDE {getSortIcon(topSort, 'pde')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(topSort, setTopSort, 'scoreTotal')}>Score {getSortIcon(topSort, 'scoreTotal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderCowTableRows(sortedTop20, true)}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Bottom 20 Worst */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 border border-slate-200/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ArrowDown className="w-5 h-5 text-rose-500" />
                            Bottom 20 (Peores)
                        </h3>
                        <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-1 rounded-md">Pasajeros Costosos</span>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto relative outline-none custom-scrollbar rounded-xl border border-slate-200 shadow-inner bg-white/50">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
                                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none" onClick={() => handleSort(bottomSort, setBottomSort, 'ide')}>IDE {getSortIcon(bottomSort, 'ide')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none" onClick={() => handleSort(bottomSort, setBottomSort, 'reproductiveState')}>Repro {getSortIcon(bottomSort, 'reproductiveState')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(bottomSort, setBottomSort, 'currentGdm')}>GDM {getSortIcon(bottomSort, 'currentGdm')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(bottomSort, setBottomSort, 'pde')}>PDE {getSortIcon(bottomSort, 'pde')}</th>
                                    <th className="py-3 px-4 font-bold cursor-pointer select-none text-right" onClick={() => handleSort(bottomSort, setBottomSort, 'scoreTotal')}>Score {getSortIcon(bottomSort, 'scoreTotal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderCowTableRows(sortedBottom20, false)}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

            </div>

            {/* QA AUDIT DATA ANOMALIES SECTION */}
            {anomalies && anomalies.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 glass rounded-2xl p-6 border-2 border-indigo-200/50 bg-indigo-50/20 transition-all">

                    {/* Collapsible Header */}
                    <div
                        className={`flex items-center justify-between pb-4 cursor-pointer select-none group ${isQaExpanded ? 'border-b border-indigo-100 mb-6' : ''}`}
                        onClick={() => setIsQaExpanded(!isQaExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                                <Activity className="w-6 h-6 text-indigo-600" />
                                Auditoría de Integridad de Datos (QA)
                            </h3>
                            <p className="text-sm text-indigo-700 mt-1">
                                Anormalidades detectadas cruzando cronología biológica y ganancias metabólicas extremas.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-extrabold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
                                {anomalies.length} Errores
                            </span>
                            <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                                {isQaExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isQaExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-6 overflow-hidden"
                            >
                                {Object.entries(groupedAnomalies).map(([category, items]) => (
                                    <AnomalyCategoryGroup key={category} category={category} items={items} setActiveProfileIde={setActiveProfileIde} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
