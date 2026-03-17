'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save } from 'lucide-react';

export default function ConfigPanel() {
    const { settings, setSettings } = useDashboard();
    
    // Copy settings to local state
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings({ ...localSettings, targetWeight: Number(e.target.value) });
    };

    const handleGdmMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings({ ...localSettings, gdmMin: Number(e.target.value) });
    };

    const handleGdmOptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings({ ...localSettings, gdmOpt: Number(e.target.value) });
    };

    const handleIatfStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Prevent invalid dates from crashing
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setLocalSettings({ ...localSettings, iatfWindowStart: newDate });
        }
    };

    const handleIatfEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setLocalSettings({ ...localSettings, iatfWindowEnd: newDate });
        }
    };

    const toDateString = (date: Date | null) => {
        if (!date || isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const handleApplyChanges = () => {
        setSettings(localSettings);
    };

    // Quick deep equal for standard JSON-ifiable dates (converting to string) or direct comparison of values.
    const hasChanges = 
        localSettings.targetWeight !== settings.targetWeight ||
        localSettings.gdmMin !== settings.gdmMin ||
        localSettings.gdmOpt !== settings.gdmOpt ||
        localSettings.iatfWindowStart?.getTime() !== settings.iatfWindowStart?.getTime() ||
        localSettings.iatfWindowEnd?.getTime() !== settings.iatfWindowEnd?.getTime();

    return (
        <Card className="bg-slate-900 border-slate-800 text-white max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-bold">
                    Configuración de Umbrales
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="targetWeight">Peso Objetivo (kg)</Label>
                    <Input
                        id="targetWeight"
                        type="number"
                        value={localSettings.targetWeight}
                        onChange={handleWeightChange}
                        className="bg-slate-800 border-slate-700"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gdmMin">GDM Mínimo (kg/día)</Label>
                        <Input
                            id="gdmMin"
                            type="number"
                            step="0.01"
                            value={localSettings.gdmMin}
                            onChange={handleGdmMinChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gdmOpt">GDM Óptimo (kg/día)</Label>
                        <Input
                            id="gdmOpt"
                            type="number"
                            step="0.01"
                            value={localSettings.gdmOpt}
                            onChange={handleGdmOptChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="iatfStart">Inicio Ventana IATF</Label>
                        <Input
                            id="iatfStart"
                            type="date"
                            value={toDateString(localSettings.iatfWindowStart)}
                            onChange={handleIatfStartChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="iatfEnd">Fin Ventana IATF</Label>
                        <Input
                            id="iatfEnd"
                            type="date"
                            value={toDateString(localSettings.iatfWindowEnd)}
                            onChange={handleIatfEndChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                </div>
                
                <div className="pt-6 flex justify-end">
                    <button
                        onClick={handleApplyChanges}
                        disabled={!hasChanges}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold transition-colors ${
                            hasChanges 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                    >
                        <Save className="w-5 h-5" />
                        {hasChanges ? 'Aplicar Cambios' : 'Sin cambios pendientes'}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
