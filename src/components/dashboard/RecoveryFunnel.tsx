import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateEvolution, EvolutionMetrics } from '@/lib/analytics-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, HeartPulse } from 'lucide-react';

type TimeFilter = 'T1_T2' | 'T2_FINAL' | 'T1_FINAL';

export default function RecoveryFunnel() {
    const { animals } = useDashboard();
    const [filter, setFilter] = useState<TimeFilter>('T1_T2');

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
        'T1_T2': 'Tacto 1 a Tacto 2',
        'T2_FINAL': 'Tacto 2 a Diagnóstico Final',
        'T1_FINAL': 'Tacto 1 a Diagnóstico Final (Ciclo Completo)',
    };

    const hasData = stats.totalAnalyzed > 0;

    // Temporal Availability Logic
    const [hasT2Event, setHasT2Event] = useState(false);
    const [hasFinalEvent, setHasFinalEvent] = useState(false);

    useEffect(() => {
        let foundT2 = false;
        let foundFinal = false;

        for (const an of animals) {
            for (const ev of an.eventos) {
                const typeStr = ev.type.toUpperCase();
                // Check if this specific snapshot includes Tacto 2
                if (typeStr.includes('TACTO 2') || (typeStr.includes('TACTO ANESTRO') && ev.eventNumber === 2)) foundT2 = true;
                // Check if this specific snapshot includes Final/IATF metrics
                if (typeStr.includes('IATF') || typeStr.includes('SERVICIO')) foundFinal = true;

                if (foundT2 && foundFinal) break;
            }
            if (foundT2 && foundFinal) break;
        }

        setHasT2Event(foundT2);
        setHasFinalEvent(foundFinal);

        // Fallback logic if the temporal machine rewinds and disables the active tab
        if (!foundT2 && !foundFinal) {
            // Nothing is really available yet to show evolution
            if (filter !== 'T1_T2') setFilter('T1_T2'); // Reset to default
        } else if (foundT2 && !foundFinal) {
            // Only T1->T2 is allowed
            if (filter === 'T2_FINAL' || filter === 'T1_FINAL') setFilter('T1_T2');
        }

    }, [animals, filter]);

    return (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-sm col-span-1 md:col-span-2 flex flex-col gap-6">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <HeartPulse className="w-6 h-6 text-indigo-500" />
                        Evolución y Recuperación Reproductiva
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Rastreo temporal de la efectividad de las terapias e inseminaciones.</p>
                </div>

                {/* Tab Filters */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-xl self-start overflow-x-auto max-w-full">
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
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                                    ${isDisabled
                                        ? 'text-slate-300 cursor-not-allowed opacity-60'
                                        : filter === key
                                            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                {key === 'T1_T2' ? 'T1 ➔ T2' : key === 'T2_FINAL' ? 'T2 ➔ Final' : 'T1 ➔ Final'}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest text-center">
                {filterLabels[filter]}
            </div>

            {(!hasT2Event && !hasFinalEvent) ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-3">
                    <HeartPulse className="w-8 h-8 text-slate-300" />
                    <div className="max-w-md">
                        <p className="text-slate-500 font-medium">Cronología demasiado temprana</p>
                        <p className="text-xs text-slate-400 mt-1">El rodeo seleccionado aún no ha registrado el Segundo Tacto o fechas de Inseminación Artificial para calcular evoluciones.</p>
                    </div>
                </div>
            ) : !hasData ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                    No hay suficientes datos secuenciales para analizar la evolución en este período específico.
                </div>
            ) : (
                <div className="relative pt-4 pb-8 px-4 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 overflow-hidden">

                    {/* LEFT BUBBLE (Initial Anestro) */}
                    <div className="flex-1 w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center relative group">
                        <span className="text-slate-500 font-medium mb-1">En Anestro</span>
                        <span className="text-3xl font-black text-slate-800">{stats.maintainedBad + stats.recoveredCount}</span>

                        {/* Initial Granularity Added */}
                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{stats.initialDetails.as}</span>
                                <span>AS</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{stats.initialDetails.ap}</span>
                                <span>AP</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{stats.initialDetails.noApta}</span>
                                <span>No Apta</span>
                            </div>
                        </div>

                        {/* Bad Maintained Tooltip Hook */}
                        <div className="absolute -bottom-8 left-[-10%] md:-left-8 top-auto md:top-1/2 md:-translate-y-1/2 z-10 hidden group-hover:block transition-all animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl w-48 text-center relative">
                                <XCircle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                                <strong>{stats.maintainedBad} vacas</strong> permanecieron en Anestro/Vacías sin responder al tratamiento.
                            </div>
                        </div>
                    </div>

                    {/* TRANSITIONS (Arrows) */}
                    <div className="flex flex-row md:flex-col items-center justify-center gap-4">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors group relative">
                            <span className="font-bold">{stats.recoveredCount} Recuperadas</span>
                            <ArrowRight className="w-5 h-5 hidden md:block" />

                            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-56">
                                <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl text-center">
                                    <strong>{stats.recoveredCount} vaquillonas</strong> pasaron de Anestro a Ciclando/Preñada ({stats.recoveryRate.toFixed(1)}% de efectividad de tratamiento).
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-full border border-rose-100 cursor-pointer hover:bg-rose-100 transition-colors group relative">
                            <ArrowLeft className="w-5 h-5 hidden md:block" />
                            <span className="font-bold">{stats.lostCount} Caídas</span>
                        </div>
                    </div>

                    {/* RIGHT BUBBLE (Initial Sanity) */}
                    <div className="flex-1 w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center relative group">
                        <span className="text-slate-500 font-medium mb-1">Ciclantes / Preñadas</span>
                        <span className="text-3xl font-black text-slate-800">{stats.maintainedGood + stats.lostCount}</span>

                        {/* Initial Granularity Added */}
                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{stats.initialDetails.ciclando}</span>
                                <span>Ciclando</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{stats.initialDetails.prenadas}</span>
                                <span>Preñadas</span>
                            </div>
                        </div>

                        {/* Lost Flow Tooltip Hook */}
                        <div className="absolute -bottom-8 right-[-10%] md:-right-8 top-auto md:top-1/2 md:-translate-y-1/2 z-10 hidden group-hover:block transition-all animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl w-48 text-center relative">
                                <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                                <strong>{stats.lostCount} vacas</strong> cayeron de un estado saludable a Anestro/Vacia.
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800"></div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}
