import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowDown, ArrowUp, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { ProcessedAnimal } from '@/types';

export default function ExceptionManagement() {
    const { animals, settings } = useDashboard();

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

    const renderCowRow = (cow: ProcessedAnimal, index: number, isTop: boolean) => (
        <div key={cow.ide} className={`flex items-center justify-between p-3 rounded-lg border mb-2 ${isTop ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isTop ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    #{index + 1}
                </div>
                <div>
                    <p className="font-bold text-slate-800">{cow.ide}</p>
                    <p className="text-xs text-slate-500">{cow.reproductiveState || 'Sin Tacto'}</p>
                </div>
            </div>

            <div className="flex space-x-4 text-right">
                <div>
                    <p className="text-xs text-slate-500">GDM</p>
                    <p className={`font-semibold text-sm ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.currentGdm?.toFixed(3)}</p>
                </div>
                {cow.pde !== null && (
                    <div>
                        <p className="text-xs text-slate-500">PDE</p>
                        <p className={`font-semibold text-sm ${isTop ? 'text-emerald-600' : 'text-rose-600'}`}>{cow.pde.toFixed(3)}</p>
                    </div>
                )}
                <div className="w-16">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="font-black text-sm text-slate-700">{cow.scoreTotal}</p>
                </div>
            </div>
        </div>
    );

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-5 border border-rose-200/60 bg-rose-50/30">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <h3 className="font-bold text-rose-800">Alertas Críticas (Z-Score)</h3>
                    </div>
                    <p className="text-3xl font-black text-rose-600">{alerts.criticalCows.length}</p>
                    <p className="text-xs text-rose-500 mt-1 font-medium">Animales perdiendo peso atípicamente o anestro profundo terminal.</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 border border-amber-200/60 bg-amber-50/30">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-amber-800">Rodeo Retrasado</h3>
                    </div>
                    <p className="text-3xl font-black text-amber-600">{alerts.delayedCows.length}</p>
                    <p className="text-xs text-amber-600 mt-1 font-medium">Proyectan no llegar al objetivo IATF sin intervención forrajera.</p>
                </motion.div>

                {/* Visual Filler for alignment */}
                <div className="hidden lg:block lg:col-span-2"></div>
            </div>

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

                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {alerts.top20.length > 0 ? (
                            alerts.top20.map((cow, idx) => renderCowRow(cow, idx, true))
                        ) : (
                            <p className="text-slate-500 text-center py-8">No hay suficientes datos procesados.</p>
                        )}
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

                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {alerts.bottom20.length > 0 ? (
                            alerts.bottom20.map((cow, idx) => renderCowRow(cow, idx, false))
                        ) : (
                            <p className="text-slate-500 text-center py-8">No hay suficientes datos procesados.</p>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
