'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, Scale, Users, Activity, CalendarClock } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import AlertsRegion from './AlertsRegion';

interface HeaderKPIsProps {
    currentView?: string;
    onViewChange?: (view: string) => void;
}

export default function HeaderKPIs({ currentView, onViewChange }: HeaderKPIsProps) {
    const { animals, availableSnapshots, selectedSnapshot, setSelectedSnapshot } = useDashboard();

    const activeAnimals = useMemo(() => animals.filter(a => a.isActive), [animals]);

    const stats = useMemo(() => {
        if (activeAnimals.length === 0) return { total: 0, avgWeight: 0, avgGdm: 0, avgScore: 0 };

        let totalWeight = 0;
        let sumGdm = 0;
        let validGdmCount = 0;
        let sumScore = 0;

        activeAnimals.forEach(a => {
            totalWeight += a.currentWeight || 0;
            if (a.currentGdm !== null) {
                sumGdm += a.currentGdm;
                validGdmCount++;
            }
            sumScore += a.scoreTotal;
        });

        return {
            total: activeAnimals.length,
            avgWeight: (totalWeight / activeAnimals.length).toFixed(0),
            avgGdm: validGdmCount > 0 ? (sumGdm / validGdmCount).toFixed(3) : '0',
            avgScore: (sumScore / activeAnimals.length).toFixed(0)
        };
    }, [activeAnimals]);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Top Row: Alerts Region & Date Filter */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start gap-4 mb-2">
                <div className="w-full xl:flex-1">
                    {currentView === 'dashboard' && <AlertsRegion onViewChange={onViewChange} />}
                </div>
                {/* Date Filter */}
                <div className="flex justify-end shrink-0 w-full xl:w-auto">
                    <div className="flex items-center gap-3 w-full md:w-auto bg-white/60 p-3 rounded-2xl border border-slate-200/60 backdrop-blur-md shadow-sm">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 hidden md:flex">
                            <CalendarClock className="w-5 h-5" />
                        </div>
                        <label htmlFor="snapshot-select" className="text-sm font-semibold text-slate-600 hidden md:block whitespace-nowrap">
                            Historial de Pesadas:
                        </label>
                        <select
                            id="snapshot-select"
                            value={selectedSnapshot}
                            onChange={(e) => setSelectedSnapshot(e.target.value)}
                            className="bg-white border-2 border-indigo-100 text-slate-800 text-sm font-bold rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 block w-full md:w-auto md:min-w-[250px] p-2.5 shadow-sm transition-all outline-none cursor-pointer hover:border-indigo-300"
                        >
                            {availableSnapshots.map(snap => (
                                <option key={snap.id} value={snap.id} className="font-medium">
                                    {snap.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {(!currentView || currentView === 'dashboard' || currentView === 'productividad') && (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-4 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                {/* KPI 1 */}
                <motion.div variants={itemVariants}>
                    <Card className="glass border-transparent overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 tracking-wide">Cabezas Activas</p>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.total}</h3>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* KPI 2 */}
                <motion.div variants={itemVariants}>
                    <Card className="glass border-transparent overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 tracking-wide">Peso Promedio</p>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Scale className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.avgWeight} <span className="text-xl font-medium text-slate-400">kg</span></h3>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* KPI 3 */}
                <motion.div variants={itemVariants}>
                    <Card className="glass border-transparent overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 tracking-wide">GDM Promedio</p>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-extrabold text-emerald-600 tracking-tight">{stats.avgGdm} <span className="text-xl font-medium text-emerald-600/60">kg/día</span></h3>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* KPI 4 */}
                <motion.div variants={itemVariants}>
                    <Card className="glass border-transparent overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <p className="text-sm font-semibold text-slate-500 tracking-wide">Score Promedio</p>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <Activity className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-extrabold text-blue-600 tracking-tight">{stats.avgScore} <span className="text-xl font-medium text-blue-600/60">pts</span></h3>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
            )}
        </div>
    );
}
