'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import { AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';

interface AlertsRegionProps {
    onViewChange?: (view: string) => void;
}

export default function AlertsRegion({ onViewChange }: AlertsRegionProps) {
    const { animals } = useDashboard();

    const activeAnimals = animals.filter(a => a.isActive);
    const redAlerts = activeAnimals.filter(a => a.alertRed).length;
    const yellowAlerts = activeAnimals.filter(a => a.alertYellow).length;

    if (redAlerts === 0 && yellowAlerts === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redAlerts > 0 && (
                <button
                    onClick={() => onViewChange && onViewChange('alertas')}
                    className="group flex items-center gap-4 bg-rose-50/70 backdrop-blur border border-rose-200/80 border-l-4 border-l-rose-500 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:bg-rose-50 transition-all text-left w-full"
                >
                    <div className="shrink-0 p-2 bg-rose-100 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-rose-900 truncate">Atención Crítica ({redAlerts})</p>
                        <p className="text-xs font-medium text-rose-700/80 truncate mt-0.5">
                            GDM negativo · GDM bajo mínimo · Anestro con peso alcanzado
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {yellowAlerts > 0 && (
                <button
                    onClick={() => onViewChange && onViewChange('alertas')}
                    className="group flex items-center gap-4 bg-amber-50/70 backdrop-blur border border-amber-200/80 border-l-4 border-l-amber-500 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:bg-amber-50 transition-all text-left w-full"
                >
                    <div className="shrink-0 p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-amber-900 truncate">Retraso Proyectado ({yellowAlerts})</p>
                        <p className="text-xs font-medium text-amber-700/80 truncate mt-0.5">
                            No alcanzará el peso objetivo antes del IATF
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
}
