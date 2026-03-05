import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion } from 'framer-motion';
import { AlertCircle, Activity } from 'lucide-react';

export default function AlertCards() {
    const { animals } = useDashboard();

    const alerts = useMemo(() => {
        const active = animals.filter(a => a.isActive);

        // Z-Score Critical Alerts (Red) 
        const criticalCows = active.filter(a => a.scoreCategory === 'DESCARTE' || a.alertRed);

        // At-risk Cows (Yellow)
        const delayedCows = active.filter(a => a.alertYellow && !a.alertRed);

        return {
            criticalCows,
            delayedCows,
        };
    }, [animals]);

    return (
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
    );
}
