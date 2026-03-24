"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateEvolution, EvolutionMetrics } from '@/lib/analytics-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle, HeartPulse, FileText, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EvolutionTransition } from '@/lib/analytics-engine';

type TimeFilter = 'T1_T2' | 'T2_FINAL' | 'T1_FINAL';

interface FunnelProps {
    onViewChange?: (view: string) => void;
}

export default function RecoveryFunnel({ onViewChange }: FunnelProps = {}) {
    const { animals, setActiveProfileIde } = useDashboard();
    const [filter, setFilter] = useState<TimeFilter>('T1_T2');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [activeDetailType, setActiveDetailType] = useState<'RECOVERED' | 'LOST' | 'MAINTAINED_GOOD' | 'MAINTAINED_BAD' | 'FINAL_ANESTRO' | 'FINAL_SANAS' | 'AS_TO_PRENADA' | 'AP_TO_PRENADA' | 'CICLANDO_TO_ANESTRO' | 'AS_TO_CICLANDO' | 'AP_TO_CICLANDO' | null>(null);

    const stats = useMemo<EvolutionMetrics>(() => {
        switch (filter) {
            case 'T1_T2':
                return calculateEvolution(animals, { keyword: 'TACTO ANESTRO', eventNumber: 1 }, { keyword: 'TACTO ANESTRO', eventNumber: 2 });
            case 'T2_FINAL':
                return calculateEvolution(animals, { keyword: 'TACTO ANESTRO', eventNumber: 2 }, 'FINAL');
            case 'T1_FINAL':
                return calculateEvolution(animals, { keyword: 'TACTO ANESTRO', eventNumber: 1 }, 'FINAL');
            default:
                return calculateEvolution(animals, { keyword: 'TACTO ANESTRO', eventNumber: 1 }, { keyword: 'TACTO ANESTRO', eventNumber: 2 });
        }
    }, [animals, filter]);

    const filterLabels: Record<TimeFilter, string> = {
        'T1_T2': 'Tacto 1 ➔ Tacto 2',
        'T2_FINAL': 'Tacto 2 ➔ Final',
        'T1_FINAL': 'T1 ➔ Final (Ciclo Completo)',
    };

    const hasData = stats.totalAnalyzed > 0;
    const [hasT2Event, setHasT2Event] = useState(false);
    const [hasFinalEvent, setHasFinalEvent] = useState(false);

    useEffect(() => {
        let foundT2 = false;
        let foundFinal = false;
        for (const an of animals) {
            for (const ev of an.eventos) {
                const typeStr = ev.type.toUpperCase();
                if (typeStr.includes('TACTO 2') || (typeStr.includes('TACTO ANESTRO') && ev.eventNumber === 2)) foundT2 = true;
                if (typeStr.includes('IATF') || typeStr.includes('SERVICIO')) foundFinal = true;
                if (foundT2 && foundFinal) break;
            }
            if (foundT2 && foundFinal) break;
        }
        setHasT2Event(foundT2);
        setHasFinalEvent(foundFinal);
        if (!foundT2 && !foundFinal) {
            if (filter !== 'T1_T2') setFilter('T1_T2');
        } else if (foundT2 && !foundFinal) {
            if (filter === 'T2_FINAL' || filter === 'T1_FINAL') setFilter('T1_T2');
        }
    }, [animals, filter]);

    const handleOpenDetails = (type: 'RECOVERED' | 'LOST' | 'MAINTAINED_GOOD' | 'MAINTAINED_BAD' | 'FINAL_ANESTRO' | 'FINAL_SANAS' | 'AS_TO_PRENADA' | 'AP_TO_PRENADA' | 'CICLANDO_TO_ANESTRO' | 'AS_TO_CICLANDO' | 'AP_TO_CICLANDO') => {
        setActiveDetailType(type);
        setIsSheetOpen(true);
    };

    const getSheetData = () => {
        if (!activeDetailType || !stats?.details) return { title: '', desc: '', list: [] as EvolutionTransition[] };
        switch (activeDetailType) {
            case 'RECOVERED': return { title: 'Vaquillonas Recuperadas', desc: 'Pasaron de Anestro a un estado saludable (Ciclando/Preñada).', list: stats.details.recovered };
            case 'LOST': return { title: 'Vaquillonas Caídas', desc: 'Cayeron de un estado saludable a Anestro/Vacía.', list: stats.details.lost };
            case 'MAINTAINED_GOOD': return { title: 'Mantuvieron Sanidad', desc: 'Permanecieron Ciclantes o resultaron Preñadas.', list: stats.details.maintainedGood };
            case 'MAINTAINED_BAD': return { title: 'Permanecieron en Anestro', desc: 'No respondieron al tratamiento.', list: stats.details.maintainedBad };
            case 'FINAL_ANESTRO': return { title: 'En Anestro / Vacías (Final)', desc: 'Animales que terminaron el período en anestro o vacías (mantuvieron + cayeron).', list: [...stats.details.maintainedBad, ...stats.details.lost] };
            case 'FINAL_SANAS': return { title: filter === 'T2_FINAL' || filter === 'T1_FINAL' ? 'Preñadas (Final)' : 'Ciclando / Preñadas (Final)', desc: 'Animales que terminaron el período sanas (mantuvieron + recuperadas).', list: [...stats.details.maintainedGood, ...stats.details.recovered] };
            case 'AS_TO_PRENADA': return { title: 'AS ➔ Preñada', desc: 'Pasaron de Anestro Superficial a Preñadas.', list: stats.specificTransitions.asToPrenada_list };
            case 'AP_TO_PRENADA': return { title: 'AP ➔ Preñada', desc: 'Pasaron de Anestro Profundo a Preñadas.', list: stats.specificTransitions.apToPrenada_list };
            case 'CICLANDO_TO_ANESTRO': return { title: 'Ciclando ➔ Anestro', desc: 'Regresaron de un estado ciclante a Anestro.', list: stats.specificTransitions.ciclandoToAnestro_list };
            case 'AS_TO_CICLANDO': return { title: 'AS ➔ Ciclando', desc: 'Pasaron de Anestro Superficial a Ciclando.', list: stats.specificTransitions.asToCiclando_list };
            case 'AP_TO_CICLANDO': return { title: 'AP ➔ Ciclando', desc: 'Pasaron de Anestro Profundo a Ciclando.', list: stats.specificTransitions.apToCiclando_list };
        }
    };

    const sheetData = getSheetData();

    // Derived metrics
    const totalAnestro = stats.maintainedBad + stats.recoveredCount;
    const totalSanas = stats.maintainedGood + stats.lostCount;
    const recoveryPct = totalAnestro > 0 ? Math.round((stats.recoveredCount / totalAnestro) * 100) : 0;
    const lostPct = totalSanas > 0 ? Math.round((stats.lostCount / totalSanas) * 100) : 0;

    type StatCardProps = {
        label: string;
        value: number;
        sub?: string;
        color: string;
        bgColor: string;
        borderColor: string;
        icon: React.ReactNode;
        badge?: string;
        badgeColor?: string;
        onClick?: () => void;
        clickable?: boolean;
    };

    const StatCard = ({ label, value, sub, color, bgColor, borderColor, icon, badge, badgeColor, onClick, clickable }: StatCardProps) => (
        <motion.div
            whileHover={clickable ? { scale: 1.02 } : {}}
            onClick={onClick}
            className={`flex-1 min-w-[140px] ${bgColor} border ${borderColor} rounded-2xl p-4 flex flex-col gap-2 ${clickable ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}
        >
            <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${color} opacity-80`}>{label}</span>
                <span className={`${color} opacity-60`}>{icon}</span>
            </div>
            <div className="flex items-end gap-2">
                <span className={`text-4xl font-black ${color} tabular-nums leading-none`}>{value}</span>
                {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${badgeColor}`}>{badge}</span>}
            </div>
            {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
        </motion.div>
    );

    return (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm col-span-1 md:col-span-2 flex flex-col gap-5">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <HeartPulse className="w-6 h-6 text-indigo-500" />
                        Evolución y Recuperación Reproductiva
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">Rastreo de la efectividad de terapias e inseminaciones entre tactos.</p>
                </div>
                {/* Tab Filters */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-xl self-start gap-1">
                    {(Object.keys(filterLabels) as TimeFilter[]).map((key) => {
                        const isDisabled =
                            (!hasT2Event && !hasFinalEvent) ||
                            (key === 'T2_FINAL' && !hasFinalEvent) ||
                            (key === 'T1_FINAL' && !hasFinalEvent);
                        return (
                            <button
                                key={key}
                                onClick={() => !isDisabled && setFilter(key)}
                                disabled={isDisabled}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap
                                    ${isDisabled
                                        ? 'text-slate-300 cursor-not-allowed opacity-50'
                                        : filter === key
                                            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                {filterLabels[key]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Empty States */}
            {(!hasT2Event && !hasFinalEvent) ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
                    <HeartPulse className="w-8 h-8 text-slate-300" />
                    <div className="max-w-md">
                        <p className="text-slate-500 font-medium">Cronología demasiado temprana</p>
                        <p className="text-xs text-slate-400 mt-1">El rodeo seleccionado aún no ha registrado el Segundo Tacto o fechas de Inseminación.</p>
                    </div>
                </div>
            ) : !hasData ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                    No hay suficientes datos para analizar la evolución en este período.
                </div>
            ) : (
                <>
                    {/* ── 5-METRIC SCOREBOARD ── */}
                    <div className="flex flex-wrap gap-3">

                        {/* 1. Total Analizadas */}
                        <StatCard
                            label="Total Analizadas"
                            value={stats.totalAnalyzed}
                            sub="vaquillonas en el período"
                            color="text-slate-700"
                            bgColor="bg-slate-50"
                            borderColor="border-slate-200"
                            icon={<Users className="w-4 h-4" />}
                        />

                        {/* 2. En Anestro (initial) */}
                        <motion.div
                            className="flex-1 min-w-[160px] bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleOpenDetails('MAINTAINED_BAD')}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 opacity-80">En Anestro</span>
                                <AlertCircle className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-orange-700 tabular-nums leading-none">{totalAnestro}</span>
                            </div>
                            <div className="flex gap-3 mt-1">
                                <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">AS: {stats.initialDetails.as}</span>
                                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">AP: {stats.initialDetails.ap}</span>
                            </div>
                            <p className="text-xs text-orange-400 font-medium mt-1 italic">Estado inicial en {filter === 'T1_FINAL' || filter === 'T1_T2' ? 'T1' : 'T2'}</p>
                        </motion.div>

                        {/* 3. Ciclando / Preñadas (initial) */}
                        <motion.div
                            className="flex-1 min-w-[160px] bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleOpenDetails('MAINTAINED_GOOD')}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 opacity-80">Ciclando / Preñadas</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-emerald-700 tabular-nums leading-none">{totalSanas}</span>
                            </div>
                            <div className="flex gap-3 mt-1">
                                <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Cic: {stats.initialDetails.ciclando}</span>
                                <span className="text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">Preñ: {stats.initialDetails.prenadas}</span>
                            </div>
                        </motion.div>

                        {/* 4+5. Recuperadas + Caídas side by side */}
                        <div className="flex-1 min-w-[280px] flex flex-row gap-2">

                            {/* Recuperadas */}
                            <motion.div
                                className="flex-1 bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('RECOVERED')}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 opacity-80">Recuperadas</span>
                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black text-indigo-700 tabular-nums leading-none">{stats.recoveredCount}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-0.5 bg-indigo-100 text-indigo-700">{recoveryPct}%</span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">De anestro a estado saludable</p>
                            </motion.div>

                            {/* Caídas */}
                            <motion.div
                                className="flex-1 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('LOST')}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 opacity-80">Caídas</span>
                                    <TrendingDown className="w-4 h-4 text-rose-400" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black text-rose-700 tabular-nums leading-none">{stats.lostCount}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-0.5 bg-rose-100 text-rose-700">{lostPct}%</span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">De saludable a anestro/vacía</p>
                            </motion.div>

                        </div>
                    </div>

                    {/* ── ESTADO FINAL ── */}
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Estado Final del Período</p>
                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Anestro Final */}
                            <motion.div
                                className="flex-1 bg-orange-50/60 border border-orange-100 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-orange-200 transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('FINAL_ANESTRO')}
                            >
                                <div>
                                    <p className="text-xs font-semibold text-orange-700">En Anestro / Vacías <span className="font-normal text-orange-400">(final)</span></p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.maintainedBad} mantuvieron + {stats.lostCount} cayeron</p>
                                </div>
                                <span className="text-2xl font-black text-orange-700 tabular-nums">{stats.maintainedBad + stats.lostCount}</span>
                            </motion.div>
                            {/* Sanas Final */}
                            <motion.div
                                className="flex-1 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('FINAL_SANAS')}
                            >
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700">{filter === 'T2_FINAL' || filter === 'T1_FINAL' ? 'Preñadas' : 'Ciclando / Preñadas'} <span className="font-normal text-emerald-400">(final)</span></p>
                                    <p className="text-xs text-slate-400 mt-0.5">{stats.maintainedGood} mantuvieron + {stats.recoveredCount} recuperadas</p>
                                </div>
                                <span className="text-2xl font-black text-emerald-700 tabular-nums">{stats.maintainedGood + stats.recoveredCount}</span>
                            </motion.div>
                        </div>
                    </div>

                    {/* ── SPECIFIC TRANSITIONS ── */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                        <motion.div
                            className="flex-1 bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleOpenDetails('AS_TO_PRENADA')}
                        >
                            <p className="text-xs font-semibold text-emerald-700">AS ➔ Preñada</p>
                            <span className="text-lg font-black text-emerald-700">{stats.specificTransitions.asToPrenada}</span>
                        </motion.div>
                        <motion.div
                            className="flex-1 bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleOpenDetails('AP_TO_PRENADA')}
                        >
                            <p className="text-xs font-semibold text-emerald-700">AP ➔ Preñada</p>
                            <span className="text-lg font-black text-emerald-700">{stats.specificTransitions.apToPrenada}</span>
                        </motion.div>
                        <motion.div
                            className="flex-1 bg-rose-50/70 border border-rose-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-200 transition-all"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleOpenDetails('CICLANDO_TO_ANESTRO')}
                        >
                            <p className="text-xs font-semibold text-rose-700">Ciclando ➔ Anestro</p>
                            <span className="text-lg font-black text-rose-700">{stats.specificTransitions.ciclandoToAnestro}</span>
                        </motion.div>
                        {filter === 'T1_T2' && stats.specificTransitions.asToCiclando > 0 && (
                            <motion.div
                                className="flex-1 bg-sky-50/70 border border-sky-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-sky-200 transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('AS_TO_CICLANDO')}
                            >
                                <p className="text-xs font-semibold text-sky-700">AS ➔ Ciclando</p>
                                <span className="text-lg font-black text-sky-700">{stats.specificTransitions.asToCiclando}</span>
                            </motion.div>
                        )}
                        {filter === 'T1_T2' && stats.specificTransitions.apToCiclando > 0 && (
                            <motion.div
                                className="flex-1 bg-sky-50/70 border border-sky-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-sky-200 transition-all"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleOpenDetails('AP_TO_CICLANDO')}
                            >
                                <p className="text-xs font-semibold text-sky-700">AP ➔ Ciclando</p>
                                <span className="text-lg font-black text-sky-700">{stats.specificTransitions.apToCiclando}</span>
                            </motion.div>
                        )}
                    </div>
                </>
            )}

            {/* Slide-over Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col bg-slate-50">
                    <SheetHeader className="pb-4 border-b border-slate-200">
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            <FileText className="w-6 h-6 text-indigo-500" />
                            {sheetData.title}
                        </SheetTitle>
                        <SheetDescription>
                            {sheetData.desc} Total: <strong>{sheetData.list.length}</strong> vaquillonas.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 min-h-0 -mx-6">
                        <ScrollArea className="h-full px-6 py-4">
                            {sheetData.list.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <HeartPulse className="w-12 h-12 mb-4 text-slate-200" />
                                    <p>No hay vaquillonas en esta categoría para el rango seleccionado.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sheetData.list.map((item, idx) => (
                                        <button
                                            key={item.ide + idx}
                                            onClick={() => {
                                                setActiveProfileIde(item.ide);
                                                setIsSheetOpen(false);
                                                if (onViewChange) onViewChange('profile');
                                            }}
                                            className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.ide}</span>
                                                <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Ficha</span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm mt-1">
                                                <div className="flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium truncate">
                                                    {item.startState}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-indigo-300 transition-colors" />
                                                <div className="flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 flex items-center justify-center text-slate-700 text-xs font-semibold truncate">
                                                    {item.endState}
                                                </div>
                                            </div>

                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeDetailType === 'RECOVERED' ? 'bg-emerald-500' :
                                                activeDetailType === 'LOST' ? 'bg-rose-500' : 'bg-slate-300'
                                            }`} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}
