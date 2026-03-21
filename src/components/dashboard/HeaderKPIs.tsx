'use client';

import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { TrendingUp, Scale, Users, Activity, CalendarClock, TrendingDown } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import AlertsRegion from './AlertsRegion';

interface HeaderKPIsProps {
    currentView?: string;
    onViewChange?: (view: string) => void;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }
};

interface KpiCardProps {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    accentColor: string;       // bg-* for icon bg  e.g. 'bg-emerald-100'
    iconColor: string;         // text-* for icon   e.g. 'text-emerald-600'
    accentBar: string;         // bg-* for bottom bar e.g. 'bg-emerald-500'
    sub?: React.ReactNode;
}

function KpiCard({ label, value, icon, accentColor, iconColor, accentBar, sub }: KpiCardProps) {
    return (
        <motion.div variants={itemVariants} className="relative group overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* Subtle top-left glow on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${accentColor.replace('bg-', 'from-').replace('-100', '-500/5')} to-transparent pointer-events-none`} />

            <div className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex justify-between items-start mb-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide leading-tight">{label}</p>
                    <div className={`shrink-0 p-2.5 ${accentColor} rounded-xl ${iconColor} shadow-sm`}>
                        {icon}
                    </div>
                </div>

                {/* Main value */}
                <div className="mb-1">{value}</div>

                {/* Sub-line */}
                {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
            </div>

            {/* Accent bar at bottom */}
            <div className={`h-1 w-full ${accentBar} opacity-70`} />
        </motion.div>
    );
}

export default function HeaderKPIs({ currentView, onViewChange }: HeaderKPIsProps) {
    const { animals, availableSnapshots, selectedSnapshot, setSelectedSnapshot } = useDashboard();

    const activeAnimals = useMemo(() => animals.filter(a => a.isActive), [animals]);

    const stats = useMemo(() => {
        if (activeAnimals.length === 0) return { total: 0, avgWeight: 0, avgGdm: 0, avgScore: 0, eliteCount: 0, aboveMeta: 0 };

        let totalWeight = 0;
        let sumGdm = 0;
        let validGdmCount = 0;
        let sumScore = 0;
        let eliteCount = 0;
        let aboveMeta = 0;

        activeAnimals.forEach(a => {
            totalWeight += a.currentWeight || 0;
            if (a.currentGdm !== null) {
                sumGdm += a.currentGdm;
                validGdmCount++;
            }
            sumScore += a.scoreTotal;
            if (a.scoreTotal >= 80) eliteCount++;
            if ((a.currentWeight || 0) >= 300) aboveMeta++;
        });

        return {
            total: activeAnimals.length,
            avgWeight: Math.round(totalWeight / activeAnimals.length),
            avgGdm: validGdmCount > 0 ? (sumGdm / validGdmCount) : 0,
            avgScore: Math.round(sumScore / activeAnimals.length),
            eliteCount,
            aboveMeta
        };
    }, [activeAnimals]);

    const gdmPositive = stats.avgGdm >= 0;
    const aboveMetaPct = activeAnimals.length > 0
        ? Math.round((stats.aboveMeta / activeAnimals.length) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Top Row: Alerts + Date filter */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start gap-3">
                <div className="w-full xl:flex-1">
                    {currentView === 'dashboard' && <AlertsRegion onViewChange={onViewChange} />}
                </div>
                {/* Date Filter */}
                <div className="flex justify-end shrink-0 w-full xl:w-auto">
                    <div className="flex items-center gap-3 w-full md:w-auto bg-white/60 p-2.5 rounded-2xl border border-slate-200/60 backdrop-blur-md shadow-sm">
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
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    <KpiCard
                        label="Cabezas Activas"
                        value={<h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight tabular-nums">{stats.total.toLocaleString('es-AR')}</h3>}
                        icon={<Users className="w-5 h-5" />}
                        accentColor="bg-emerald-100"
                        iconColor="text-emerald-600"
                        accentBar="bg-emerald-500"
                        sub={`${stats.aboveMeta} sobre meta (${aboveMetaPct}%)`}
                    />

                    <KpiCard
                        label="Peso Promedio"
                        value={<h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight tabular-nums">{stats.avgWeight} <span className="text-lg sm:text-xl font-medium text-slate-400">kg</span></h3>}
                        icon={<Scale className="w-5 h-5" />}
                        accentColor="bg-sky-100"
                        iconColor="text-sky-600"
                        accentBar="bg-sky-500"
                        sub="Peso actual del inventario activo"
                    />

                    <KpiCard
                        label="GDM Promedio"
                        value={
                            <h3 className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums flex items-end gap-1.5 ${gdmPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stats.avgGdm > 0 ? '+' : ''}{stats.avgGdm.toFixed(3)}
                                <span className="text-lg sm:text-xl font-medium opacity-60">kg/día</span>
                                {gdmPositive
                                    ? <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
                                    : <TrendingDown className="w-5 h-5 text-rose-500 mb-1" />}
                            </h3>
                        }
                        icon={<TrendingUp className="w-5 h-5" />}
                        accentColor={gdmPositive ? 'bg-emerald-100' : 'bg-rose-100'}
                        iconColor={gdmPositive ? 'text-emerald-600' : 'text-rose-600'}
                        accentBar={gdmPositive ? 'bg-emerald-500' : 'bg-rose-500'}
                        sub="Ganancia diaria de masa actual"
                    />

                    <KpiCard
                        label="Score Promedio"
                        value={<h3 className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight tabular-nums">{stats.avgScore} <span className="text-lg sm:text-xl font-medium text-indigo-600/60">pts</span></h3>}
                        icon={<Activity className="w-5 h-5" />}
                        accentColor="bg-indigo-100"
                        iconColor="text-indigo-600"
                        accentBar="bg-indigo-500"
                        sub={`${stats.eliteCount} cabezas en categoría Élite`}
                    />
                </motion.div>
            )}
        </div>
    );
}
