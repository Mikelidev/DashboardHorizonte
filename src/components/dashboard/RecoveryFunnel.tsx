import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateEvolution, EvolutionMetrics } from '@/lib/analytics-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, HeartPulse, MinusCircle, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EvolutionTransition } from '@/lib/analytics-engine';

type TimeFilter = 'T1_T2' | 'T2_FINAL' | 'T1_FINAL';

export default function RecoveryFunnel() {
    const { animals, setActiveProfileIde } = useDashboard();
    const [filter, setFilter] = useState<TimeFilter>('T1_T2');

    // UI State for Details Sheet
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [activeDetailType, setActiveDetailType] = useState<'RECOVERED' | 'LOST' | 'MAINTAINED_GOOD' | 'MAINTAINED_BAD' | null>(null);

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

    // Helpers for Sheet UI
    const handleOpenDetails = (type: 'RECOVERED' | 'LOST' | 'MAINTAINED_GOOD' | 'MAINTAINED_BAD') => {
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
        }
    };

    const sheetData = getSheetData();

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

                        {/* Interactive Maintained Bad Button */}
                        <button
                            onClick={() => handleOpenDetails('MAINTAINED_BAD')}
                            className="mt-6 flex items-center gap-2 text-slate-500 bg-slate-200/50 px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <MinusCircle className="w-4 h-4" />
                            <span className="font-semibold text-sm">{stats.maintainedBad} Mantuvieron</span>
                        </button>

                    </div>

                    {/* TRANSITIONS (Arrows) */}
                    <div className="flex flex-row md:flex-col items-center justify-center gap-4">
                        <button
                            onClick={() => handleOpenDetails('RECOVERED')}
                            className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:scale-105 transition-all group relative"
                        >
                            <span className="font-bold">{stats.recoveredCount} Recuperadas</span>
                            <ArrowRight className="w-5 h-5 hidden md:block" />

                            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-56">
                                <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl text-center">
                                    <strong>{stats.recoveredCount} vaquillonas</strong> pasaron de Anestro a Ciclando/Preñada ({stats.recoveryRate.toFixed(1)}% de efectividad de tratamiento).
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleOpenDetails('LOST')}
                            className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-full border border-rose-100 cursor-pointer hover:bg-rose-100 hover:scale-105 transition-all group relative"
                        >
                            <ArrowLeft className="w-5 h-5 hidden md:block" />
                            <span className="font-bold">{stats.lostCount} Caídas</span>
                        </button>
                    </div>

                    {/* RIGHT BUBBLE (Initial Sanity) */}
                    <div className="flex-1 w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center relative group">
                        <span className="text-slate-500 font-medium mb-1">Ciclantes / Preñadas</span>

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

                        {/* Interactive Maintained Good Button */}
                        <button
                            onClick={() => handleOpenDetails('MAINTAINED_GOOD')}
                            className="mt-6 flex items-center gap-2 text-slate-500 bg-slate-200/50 px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <MinusCircle className="w-4 h-4" />
                            <span className="font-semibold text-sm">{stats.maintainedGood} Mantuvieron</span>
                        </button>

                    </div>

                </div>
            )}

            {/* SECONDARY SPECIFIC METRICS */}
            {hasData && (hasT2Event || hasFinalEvent) && (
                <div className="mt-2 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between">

                    <div className="flex-1 bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl flex items-center justify-between group">
                        <div>
                            <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">De AS a Preñada</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-700">{stats.specificTransitions.asToPrenada}</span>
                                <span className="text-sm text-emerald-600/60 font-medium">vaquillonas</span>
                            </div>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-300 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex-1 bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl flex items-center justify-between group">
                        <div>
                            <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">De AP a Preñada</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-700">{stats.specificTransitions.apToPrenada}</span>
                                <span className="text-sm text-emerald-600/60 font-medium">vaquillonas</span>
                            </div>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-300 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="flex-1 bg-rose-50/50 border border-rose-100/50 p-4 rounded-2xl flex items-center justify-between group">
                        <div>
                            <p className="text-xs font-semibold text-rose-600/80 uppercase tracking-wider mb-1">De Ciclando a Anestro</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-rose-700">{stats.specificTransitions.ciclandoToAnestro}</span>
                                <span className="text-sm text-rose-600/60 font-medium">vaquillonas</span>
                            </div>
                        </div>
                        <TrendingDown className="w-8 h-8 text-rose-300 opacity-50 group-hover:scale-110 transition-transform" />
                    </div>

                </div>
            )}

            {/* Slide-over UI (Sheet) for displaying exact IDEs */}
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
                                                // Assuming setActiveProfileIde is available in this component's scope
                                                // If this component is a child, it would be passed as a prop.
                                                // If this component is the dashboard itself, it would be destructured from useDashboard().
                                                setActiveProfileIde(item.ide);
                                                setIsSheetOpen(false);
                                            }}
                                            className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.ide}</span>
                                                <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Ficha</span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm mt-1">
                                                <div className="flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium truncate group-hover:bg-indigo-50/30 transition-colors">
                                                    {item.startState}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-indigo-300 transition-colors" />
                                                <div className="flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 flex items-center justify-center text-slate-700 text-xs font-semibold truncate group-hover:bg-indigo-50 transition-colors">
                                                    {item.endState}
                                                </div>
                                            </div>

                                            {/* Colored Accent Bar depending on transition type */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeDetailType === 'RECOVERED' ? 'bg-emerald-500' :
                                                activeDetailType === 'LOST' ? 'bg-rose-500' :
                                                    'bg-slate-300'
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
