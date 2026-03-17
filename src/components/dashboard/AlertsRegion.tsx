'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {redAlerts > 0 && (
                <Alert 
                    variant="destructive" 
                    className="bg-orange-50/80 backdrop-blur-md border-orange-200 text-orange-800 shadow-sm cursor-pointer hover:shadow-md hover:bg-orange-100/90 transition-all"
                    onClick={() => onViewChange && onViewChange('alertas')}
                >
                    <AlertCircle className="h-5 w-5 !text-orange-600" />
                    <AlertTitle className="text-orange-900 font-extrabold tracking-tight">Atención Crítica ({redAlerts})</AlertTitle>
                    <AlertDescription className="text-orange-800/80 font-medium mt-1">
                        Existen {redAlerts} animales con GDM negativo, GDM por debajo del mínimo, o en Anestro habiendo alcanzado el peso.
                    </AlertDescription>
                </Alert>
            )}

            {yellowAlerts > 0 && (
                <Alert 
                    className="bg-amber-50/80 backdrop-blur-md border-amber-200 text-amber-800 shadow-sm cursor-pointer hover:shadow-md hover:bg-amber-100/90 transition-all"
                    onClick={() => onViewChange && onViewChange('alertas')}
                >
                    <AlertTriangle className="h-5 w-5 !text-amber-600" />
                    <AlertTitle className="text-amber-900 font-extrabold tracking-tight">Retraso Proyectado ({yellowAlerts})</AlertTitle>
                    <AlertDescription className="text-amber-800/80 font-medium mt-1">
                        Existen {yellowAlerts} animales que, según su GDM actual, no alcanzarán el peso objetivo antes de la ventana IATF.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
