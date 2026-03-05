import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import RecoveryFunnel from './RecoveryFunnel';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import GlobalReproductiveCard from './GlobalReproductiveCard';

interface ViewProps {
    onViewChange?: (view: string) => void;
}

export default function ReproductiveDataView({ onViewChange }: ViewProps = {}) {
    const { animals } = useDashboard();

    return (
        <div className="animate-in fade-in duration-700 max-w-[1400px] mx-auto flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Datos Reproductivos</h2>
                <p className="text-slate-500 mt-1">Monitoreo global del rendimiento y efectividad de tratamientos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 align-top">
                {/* Global Overview Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-1"
                >
                    <GlobalReproductiveCard />
                </motion.div>

                {/* Evolutionary Funnel (2/3 width) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 md:col-span-2 h-full"
                >
                    <RecoveryFunnel onViewChange={onViewChange} />
                </motion.div>

            </div>
        </div>
    );
}
