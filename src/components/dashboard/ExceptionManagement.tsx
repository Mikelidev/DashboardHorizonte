import React, { useMemo, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Minus, Activity, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessedAnimal } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import AlertCards from './AlertCards';

function AnomalyCategoryGroup({ category, items, setActiveProfileIde, onViewChange }: { category: string, items: any[], setActiveProfileIde: (ide: string) => void, onViewChange?: (view: string) => void }) {
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
                                                onClick={() => {
                                                    setActiveProfileIde(ano.ide);
                                                    if (onViewChange) onViewChange('profile');
                                                }}
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
    
    // Filters for new side-by-side tables
    const [redAlertFilter, setRedAlertFilter] = useState<string>('Todas');
    const [yellowAlertFilter, setYellowAlertFilter] = useState<string>('Todas');

    // Removing Sort states for Top and Bottom lists as they are moved.

    const alerts = useMemo(() => {
        const active = animals.filter(a => a.isActive);

        // Z-Score Critical Alerts (Red) 
        // We defined Z-score < -2 as critical in data-processor.ts (alertRed incorporates it implicitly if we configured it, 
        // but let's strictly count the lowest category from our Horizon Score mapped matrix).
        const criticalCows = active.filter(a => a.scoreCategory === 'DESCARTE' || a.alertRed);

        // At-risk Cows (Yellow)
        const delayedCows = active.filter(a => a.alertYellow && !a.alertRed);

        const criticalCowsWithReason = criticalCows.map(ano => {
            let reason = 'Alerta Crítica Detectada';
            if (ano.currentGdm !== null && ano.currentGdm < 0) reason = 'GDM Negativo (Pérdida de Peso Histórica)';
            else if (ano.currentGdm !== null && ano.currentGdm > 0 && ano.currentGdm < settings.gdmMin) reason = `GDM por debajo del mínimo permitido (< ${settings.gdmMin} kg/d)`;
            else if (ano.reproductiveState?.toUpperCase().includes('ANESTRO') && ano.currentWeight !== null && ano.currentWeight >= settings.targetWeight) reason = 'En Anestro habiendo superado el peso objetivo';
            else if (ano.scoreCategory === 'DESCARTE') reason = 'Score Global Categoría Descarte';
            return { ...ano, alertReason: reason };
        });

        const delayedCowsWithReason = delayedCows.map(ano => ({
            ...ano,
            alertReason: 'No alcanzará el peso objetivo para el IATF'
        }));

        return {
            totalActive: active.length,
            criticalCows: criticalCowsWithReason,
            delayedCows: delayedCowsWithReason
        };
    }, [animals, settings]);

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
            </div>

            {/* Alert Summary Cards */}
            <AlertCards />

            {/* Side-by-side Alert Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                
                {/* Tabla 1: Atención Crítica (Red Alerts) */}
                <div className="bg-white/40 rounded-2xl overflow-hidden shadow-sm border border-rose-200/60 opacity-95 flex flex-col">
                    <div className="bg-rose-50/80 px-5 py-4 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                            <h3 className="font-extrabold text-rose-900">Atención Crítica</h3>
                            <span className="text-xs font-bold bg-rose-200 text-rose-800 px-2 py-1 rounded-full">{alerts.criticalCows.length}</span>
                        </div>
                        <select 
                            aria-label="Filtrar por tipo de atención crítica"
                            title="Filtrar Alertas Rojas"
                            className="bg-white border border-rose-200 text-rose-900 text-xs rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2 shadow-sm truncate max-w-[200px]"
                            value={redAlertFilter}
                            onChange={(e) => setRedAlertFilter(e.target.value)}
                        >
                            <option value="Todas">Todas las Alertas</option>
                            {Array.from(new Set(alerts.criticalCows.map(c => c.alertReason))).map(reason => (
                                <option key={reason} value={reason}>{reason}</option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-y-auto max-h-[280px] w-full">
                        {alerts.criticalCows.filter(c => redAlertFilter === 'Todas' || c.alertReason === redAlertFilter).length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-rose-50/95 backdrop-blur-sm z-10 border-b border-rose-100 shadow-sm">
                                    <tr className="text-rose-900 uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-5 font-bold w-32">IDE</th>
                                        <th className="py-3 px-5 font-bold">Diagnóstico Biológico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm divide-rose-50">
                                    {alerts.criticalCows
                                        .filter(c => redAlertFilter === 'Todas' || c.alertReason === redAlertFilter)
                                        .map(ano => (
                                            <tr key={ano.ide} className="hover:bg-rose-50/50 transition-colors group">
                                                <td 
                                                    className="py-3 px-5 font-mono font-bold text-rose-600 whitespace-nowrap cursor-pointer group-hover:underline"
                                                    onClick={() => {
                                                        setActiveProfileIde(ano.ide);
                                                        if (onViewChange) onViewChange('profile');
                                                    }}
                                                >
                                                    {ano.ide}
                                                </td>
                                                <td className="py-3 px-5 text-slate-700">{ano.alertReason}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400">
                                <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-400 opacity-50" />
                                <p className="font-medium text-center text-sm">No se detectaron animales en estado crítico.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabla 2: Retraso Proyectado (Yellow Alerts) */}
                <div className="bg-white/40 rounded-2xl overflow-hidden shadow-sm border border-amber-200/60 opacity-95 flex flex-col">
                    <div className="bg-amber-50/80 px-5 py-4 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h3 className="font-extrabold text-amber-900">Retraso Proyectado</h3>
                            <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{alerts.delayedCows.length}</span>
                        </div>
                        <select 
                            aria-label="Filtrar por motivo de retraso proyectado"
                            title="Filtrar Alertas Amarillas"
                            className="bg-white border border-amber-200 text-amber-900 text-xs rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2 shadow-sm truncate max-w-[200px]"
                            value={yellowAlertFilter}
                            onChange={(e) => setYellowAlertFilter(e.target.value)}
                        >
                            <option value="Todas">Todas las Alertas</option>
                            {Array.from(new Set(alerts.delayedCows.map(c => c.alertReason))).map(reason => (
                                <option key={reason} value={reason}>{reason}</option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-y-auto max-h-[280px] w-full">
                        {alerts.delayedCows.filter(c => yellowAlertFilter === 'Todas' || c.alertReason === yellowAlertFilter).length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-amber-50/95 backdrop-blur-sm z-10 border-b border-amber-100 shadow-sm">
                                    <tr className="text-amber-900 uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-5 font-bold w-32">IDE</th>
                                        <th className="py-3 px-5 font-bold">Pronóstico Productivo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm divide-amber-50">
                                    {alerts.delayedCows
                                        .filter(c => yellowAlertFilter === 'Todas' || c.alertReason === yellowAlertFilter)
                                        .map(ano => (
                                        <tr key={ano.ide} className="hover:bg-amber-50/50 transition-colors group">
                                            <td 
                                                className="py-3 px-5 font-mono font-bold text-amber-600 whitespace-nowrap cursor-pointer group-hover:underline"
                                                onClick={() => {
                                                    setActiveProfileIde(ano.ide);
                                                    if (onViewChange) onViewChange('profile');
                                                }}
                                            >
                                                {ano.ide}
                                            </td>
                                            <td className="py-3 px-5 text-slate-700">{ano.alertReason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400">
                                <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-400 opacity-50" />
                                <p className="font-medium text-center text-sm">Todos los animales en seguimiento están dentro de la ventana de tiempo.</p>
                            </div>
                        )}
                    </div>
                </div>

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
                                    <AnomalyCategoryGroup key={category} category={category} items={items} setActiveProfileIde={setActiveProfileIde} onViewChange={onViewChange} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
