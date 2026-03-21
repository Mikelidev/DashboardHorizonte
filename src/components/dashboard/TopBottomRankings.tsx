"use client";
import React, { useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { ProcessedAnimal } from '@/types';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { key: keyof ProcessedAnimal | '', direction: SortDirection };

export default function TopBottomRankings({ onViewChange }: { onViewChange?: (view: string) => void }) {
    const { animals, setActiveProfileIde } = useDashboard();

    const [topSort, setTopSort] = useState<SortConfig>({ key: 'scoreTotal', direction: 'desc' });
    const [bottomSort, setBottomSort] = useState<SortConfig>({ key: 'scoreTotal', direction: 'asc' });

    const handleSort = (config: SortConfig, setConfig: React.Dispatch<React.SetStateAction<SortConfig>>, key: keyof ProcessedAnimal) => {
        let direction: SortDirection = 'asc';
        if (config.key === key && config.direction === 'asc') direction = 'desc';
        else if (config.key === key && config.direction === 'desc') direction = null;

        setConfig(direction ? { key, direction } : { key: 'scoreTotal', direction: config === topSort ? 'desc' : 'asc' });
    };

    const getSortIcon = (config: SortConfig, columnKey: keyof ProcessedAnimal) => {
        if (config.key !== columnKey) return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
        if (config.direction === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-500 ml-1 inline" />;
        if (config.direction === 'desc') return <ArrowDown className="w-3 h-3 text-rose-500 ml-1 inline" />;
        return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
    };

    // Calculate Top 20 and Bottom 20 based on initial default score
    const top20 = useMemo(() => {
        return [...animals]
            .filter(a => a.scoreTotal !== undefined && a.reproductiveState !== null)
            .sort((a, b) => (b.scoreTotal || 0) - (a.scoreTotal || 0))
            .slice(0, 20);
    }, [animals]);

    const bottom20 = useMemo(() => {
        return [...animals]
            .filter(a => a.scoreTotal !== undefined && a.reproductiveState !== null)
            .sort((a, b) => (a.scoreTotal || 0) - (b.scoreTotal || 0))
            .slice(0, 20);
    }, [animals]);

    // Apply interactive sorting
    const sortedTop20 = useMemo(() => {
        if (!topSort.key) return top20;
        return [...top20].sort((a, b) => {
            const aVal = a[topSort.key as keyof ProcessedAnimal] as any;
            const bVal = b[topSort.key as keyof ProcessedAnimal] as any;
            if (aVal < bVal) return topSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return topSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [top20, topSort]);

    const sortedBottom20 = useMemo(() => {
        if (!bottomSort.key) return bottom20;
        return [...bottom20].sort((a, b) => {
            const aVal = a[bottomSort.key as keyof ProcessedAnimal] as any;
            const bVal = b[bottomSort.key as keyof ProcessedAnimal] as any;
            if (aVal < bVal) return bottomSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return bottomSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [bottom20, bottomSort]);

    const renderCowTableRows = (list: ProcessedAnimal[], isTop: boolean) => {
        if (list.length === 0) return (
            <tr><td colSpan={5} className="text-slate-500 text-center py-8">No hay suficientes datos procesados.</td></tr>
        );
        return list.map((cow, index) => (
            <tr key={cow.ide} className={`border-b border-slate-100 ${isTop ? 'hover:bg-emerald-50/40' : 'hover:bg-rose-50/40'} ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} transition-colors`}>
                <td className="py-3 px-4 max-w-[180px]">
                    <span
                        className="font-mono font-bold text-indigo-600 cursor-pointer hover:underline block truncate"
                        title={cow.ide}
                        onClick={() => { setActiveProfileIde(cow.ide); if (onViewChange) onViewChange('profile'); }}
                    >
                        {cow.ide}
                    </span>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">
                    {cow.reproductiveState || 'Sin Tacto'}
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                    <span className={`font-semibold ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.currentGdm?.toFixed(3) || '-'}</span>
                </td>
                <td className="py-3 px-4 text-right tabular-nums">
                    <span className={`font-semibold ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.pde !== null && cow.pde !== undefined ? cow.pde.toFixed(3) : '-'}</span>
                </td>
                <td className="py-3 px-4 text-right font-black text-slate-700 tabular-nums">
                    {cow.scoreTotal}
                </td>
            </tr>
        ));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Top 20 Best */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 shadow-sm">
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
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ArrowDown className="w-5 h-5 text-rose-500" />
                        Bottom 20 (Peores)
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <button className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition flex items-center gap-1.5 shadow-sm">
                            <ArrowDown className="w-3.5 h-3.5" />
                            Exportar Lista de Descarte
                        </button>
                        <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-1 rounded-md">Pasajeros Costosos</span>
                    </div>
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
    );
}
