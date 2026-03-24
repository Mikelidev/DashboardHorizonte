import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import { calculateReproductiveForecast } from '@/lib/analytics-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Target, AlertTriangle, Info, ZoomOut, MousePointer2, Move, FileText, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ReproductiveForecast() {
    const { animals, settings, selectedSnapshot, availableSnapshots, setActiveProfileIde, dataMaxDate } = useDashboard();
    
    // Advanced Zoom & Pan State
    const [xDomain, setXDomain] = useState<[number | 'dataMin', number | 'dataMax']>(['dataMin', 'dataMax']);
    const [isPanning, setIsPanning] = useState(false);
    
    // IDE List Sidebar State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [activeDetailType, setActiveDetailType] = useState<'MODERADO' | 'SEVERO' | null>(null);
    const lastMouseMoveValue = useRef<number | null>(null);

    const activeSnapshotDate = useMemo(() => {
        return availableSnapshots.find(s => s.id === selectedSnapshot)?.date || null;
    }, [availableSnapshots, selectedSnapshot]);

    const forecast = useMemo(() => {
        // Use dataMaxDate as the "today" reference if we are in 'Actualidad'
        const referenceDate = activeSnapshotDate || dataMaxDate;
        return calculateReproductiveForecast(
            animals,
            settings.iatfWindowStart,
            settings.targetWeight,
            referenceDate
        );
    }, [animals, settings, activeSnapshotDate, dataMaxDate]);

    const isPostService = useMemo(() => {
        if (!settings.iatfWindowStart) return false;
        const refDate = activeSnapshotDate || dataMaxDate || new Date();
        const basePost = refDate.getTime() > settings.iatfWindowStart.getTime();

        // Smart check: If the data already contains historical IATF results, 
        // it's post-service even if the user hasn't updated the settings date to the current year.
        const containsResults = animals.some(an => 
            an.eventos.some(e => e.type.toUpperCase().includes('TACTO IATF') || e.type.toUpperCase().includes('SERVICIO'))
        );
        
        return basePost || containsResults;
    }, [settings.iatfWindowStart, activeSnapshotDate, dataMaxDate, animals]);

    // Calculate initial data range for reset and bounds
    const dataRange = useMemo(() => {
        if (forecast.scatterData.length === 0) return { min: 200, max: 500 };
        const weights = forecast.scatterData.map(d => d.weight);
        return {
            min: Math.min(...weights) - 20,
            max: Math.max(...weights) + 20
        };
    }, [forecast.scatterData]);

    if (!settings.iatfWindowStart) {
        return (
            <div className="glass rounded-2xl p-8 border border-slate-200/50 flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Configuración Faltante</h3>
                <p>Debe configurar la "Fecha de Inicio IATF" en el panel de Configuración para ver las proyecciones.</p>
            </div>
        );
    }

    const { targetWeight } = settings;
    const readyRate = forecast.totalEligible > 0 ? (forecast.projectedReady / forecast.totalEligible) * 100 : 0;

    // --- Interactive Logic ---
    const chartContainerRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = chartContainerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Stop page from scrolling
            const zoomIn = e.deltaY < 0;
            const zoomFactor = zoomIn ? 0.85 : 1.15;
            
            // Estimate mouse position ratio across the chart
            const rect = el.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, mouseX / rect.width));

            setXDomain(prev => {
                const [currMin, currMax] = prev[0] === 'dataMin' 
                    ? [dataRange.min, dataRange.max] 
                    : [prev[0] as number, prev[1] as number];

                const currentX = currMin + (currMax - currMin) * ratio;
                const newRange = (currMax - currMin) * zoomFactor;
                
                // Limit zoom levels
                if (newRange < 5 && zoomIn) return prev;
                if (newRange > (dataRange.max - dataRange.min) * 5 && !zoomIn) return prev;

                const newMin = currentX - (newRange * ratio);
                const newMax = newMin + newRange;

                return [newMin, newMax];
            });
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [dataRange.min, dataRange.max]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsPanning(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        
        const el = chartContainerRef.current;
        if (!el) return;

        const pixelDeltaX = e.movementX;
        
        setXDomain(prev => {
            const [currMin, currMax] = prev[0] === 'dataMin'
                ? [dataRange.min, dataRange.max]
                : [prev[0] as number, prev[1] as number];
                
            const domainWidth = currMax - currMin;
            const pixelWidth = el.clientWidth;
            
            const dxDomain = (pixelDeltaX / pixelWidth) * domainWidth;
            return [currMin - dxDomain, currMax - dxDomain];
        });
    }, [isPanning, dataRange]);

    const handleMouseUp = () => setIsPanning(false);
    const handleDoubleClick = () => setXDomain(['dataMin', 'dataMax']);

    const renderTooltip = (props: any) => {
        const { active, payload } = props;
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 pointer-events-none">
                    <p className="font-bold text-slate-800 mb-1">IDE: {data.ide}</p>
                    <p className="text-sm text-slate-600">Peso al Servicio: <span className="font-bold">{data.weight} kg</span></p>
                    <p className="text-sm text-slate-600">GDM Contemporáneo: <span className="font-bold">{data.gdm} kg/d</span></p>
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-md inline-block ${data.preñada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {data.preñada ? 'PREÑADA' : 'VACÍA'}
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleOpenDetails = (type: 'MODERADO' | 'SEVERO') => {
        setActiveDetailType(type);
        setIsSheetOpen(true);
    };

    const getSheetData = () => {
        if (!activeDetailType) return { title: '', desc: '', list: [] };
        if (activeDetailType === 'MODERADO') return { 
            title: 'Retraso Moderado', 
            desc: 'Vaquillonas que no llegarán al objetivo actual pero requieren 1.5kg/día o menos de GDM.', 
            list: forecast.delayedList 
        };
        if (activeDetailType === 'SEVERO') return { 
            title: 'Retraso Severo', 
            desc: 'Vaquillonas que requieren más de 1.5kg/día de GDM para llegar al objetivo a tiempo.', 
            list: forecast.dangerList 
        };
        return { title: '', desc: '', list: [] };
    };

    const sheetData = getSheetData();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Proyección y Éxito Reproductivo</h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        Simulación a IATF y correlación empírica en campo.
                        {selectedSnapshot && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Modo Time Machine</span>}
                    </p>
                </div>
            </div>

            {/* Projection KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">{isPostService ? 'Rodeo Apto Final' : 'Rodeo Apto Proyectado'}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-emerald-600">{forecast.projectedReady}</h3>
                        <span className="text-sm text-slate-400 mb-1">cabezas</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 border border-slate-200/50">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Dosis Semen Sugeridas</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-blue-600">{isPostService ? 0 : Math.ceil(forecast.projectedReady + forecast.projectedDelayed + (forecast.projectedDanger * 0.1))}</h3>
                        <span className="text-sm text-slate-400 mb-1.5 flex items-center gap-1 cursor-help" title="Calculado sumando el rodeo apto, el rodeo con retraso moderado y un 10% del rodeo con retraso severo."><Info className="w-3 h-3" /> dosis</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2 }} 
                    onClick={() => handleOpenDetails('MODERADO')}
                    className="glass rounded-2xl p-5 border border-slate-200/50 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group"
                >
                    <p className="text-xs font-semibold text-slate-500 mb-1 flex justify-between items-center">
                        {isPostService ? 'No alcanzó (Moderado)' : 'Rodeo con retraso moderado'}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                    </p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-amber-500">{forecast.projectedDelayed}</h3>
                        <span className="text-sm text-slate-400 mb-1.5">cabezas</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }} 
                    onClick={() => handleOpenDetails('SEVERO')}
                    className="glass rounded-2xl p-5 border border-slate-200/50 bg-rose-50/30 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
                >
                    <p className="text-xs font-semibold text-rose-500 mb-1 flex justify-between items-center">
                        {isPostService ? 'No alcanzó (Severo)' : 'Rodeo con retraso severo'}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500" />
                    </p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-extrabold text-rose-600">{forecast.projectedDanger}</h3>
                        <span className="text-sm text-rose-400 mb-1.5">cabezas</span>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6 border border-slate-200/50 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Tasa de Aptitud IATF
                    </h3>

                    <div className="relative h-48 w-48 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="88" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                            <circle
                                cx="96" cy="96" r="88"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="16"
                                strokeDasharray={2 * Math.PI * 88}
                                strokeDashoffset={(2 * Math.PI * 88) * (1 - (readyRate / 100))}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-800">{readyRate.toFixed(1)}%</span>
                            <span className="text-xs font-medium text-slate-500 mt-1">{isPostService ? 'Cumplieron Objetivo' : 'Llegan al Objetivo'}</span>
                        </div>
                    </div>
                    <p className="text-sm text-center text-slate-500 mt-6">
                        {isPostService 
                            ? 'Resultado histórico basado en el peso real al momento del servicio comparado con el objetivo.' 
                            : 'Basado en la Velocidad de Caja (GDM) individual actualizando diáriamente la proyección hasta la fecha IATF.'}
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6 border border-slate-200/50 lg:col-span-2 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Tasa de Preñez Empírica vs Peso al Servicio
                            </h3>
                            <p className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-3">
                                <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Scroll: Zoom</span>
                                <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Drag: Pan</span>
                                <span className="flex items-center gap-1">Double Click: Reset</span>
                            </p>
                        </div>
                        
                        <AnimatePresence>
                            {xDomain[0] !== 'dataMin' && (
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={handleDoubleClick}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition-colors shadow-sm"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                    Restablecer
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    <div 
                        ref={chartContainerRef}
                        className={`h-72 w-full select-none ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onDoubleClick={handleDoubleClick}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart 
                                margin={{ top: 35, right: 30, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    type="number"
                                    dataKey="weight"
                                    name="Peso"
                                    unit="kg"
                                    domain={xDomain}
                                    tickFormatter={(val) => Math.round(val).toString()}
                                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                                    stroke="#cbd5e1"
                                    allowDataOverflow={true}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="yPos"
                                    name="Resultado"
                                    domain={[-0.5, 1.5]}
                                    ticks={[0, 1]}
                                    tickFormatter={(v) => v === 1 ? 'Preñada' : 'Vacía'}
                                    tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }}
                                    width={80}
                                    stroke="transparent"
                                />
                                <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />

                                <ReferenceLine 
                                    x={targetWeight} 
                                    stroke="#10b981" 
                                    strokeDasharray="4 4" 
                                    strokeWidth={2}
                                    label={{ 
                                        position: 'top', 
                                        value: 'OBJETIVO DE PESO', 
                                        fill: '#059669', 
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        offset: 15
                                    }} 
                                />

                                <Scatter 
                                    name="Rodeo" 
                                    data={forecast.scatterData.map(d => ({ ...d, yPos: (d.preñada ? 1 : 0) + (Math.random() * 0.3 - 0.15) }))}
                                    isAnimationActive={false} // Disable animation for smoother panning/zooming
                                >
                                    {forecast.scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.preñada ? '#10b981' : '#f43f5e'} fillOpacity={0.6} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Slide-over UI (Sheet) for displaying exact IDEs */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col bg-slate-50">
                    <SheetHeader className="pb-4 border-b border-slate-200">
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            <FileText className="w-6 h-6 text-indigo-500" />
                            {sheetData.title}
                        </SheetTitle>
                        <SheetDescription>
                            {sheetData.desc} Total: <strong>{sheetData.list?.length || 0}</strong> vaquillonas.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 min-h-0 -mx-6">
                        <ScrollArea className="h-full px-6 py-4">
                            {sheetData.list?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <Target className="w-12 h-12 mb-4 text-slate-200" />
                                    <p>No hay vaquillonas en esta categoría.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sheetData.list?.map((item: any, idx: number) => (
                                        <button
                                            key={item.ide + idx}
                                            onClick={() => {
                                                if (setActiveProfileIde) setActiveProfileIde(item.ide);
                                                setIsSheetOpen(false);
                                            }}
                                            className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.ide}</span>
                                                <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Ficha</span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm mt-1">
                                                <div className="flex flex-col flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Peso Actual</span>
                                                    <span className="text-xs font-semibold text-slate-700">{item.currentWeight} kg</span>
                                                </div>
                                                <div className="flex flex-col flex-1 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">GDM Req. para Objetivo</span>
                                                    <span className={`text-xs font-semibold ${activeDetailType === 'MODERADO' ? 'text-amber-600' : 'text-rose-600'}`}>{item.neededGdm} kg/d</span>
                                                </div>
                                            </div>

                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeDetailType === 'MODERADO' ? 'bg-amber-500' : 'bg-rose-500'}`} />
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
