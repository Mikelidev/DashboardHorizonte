'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function ConfigPanel() {
    const { settings, setSettings } = useDashboard();

    const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, targetWeight: Number(e.target.value) });
    };

    const handleGdmMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, gdmMin: Number(e.target.value) });
    };

    const handleGdmOptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, gdmOpt: Number(e.target.value) });
    };

    const handleIatfStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, iatfWindowStart: new Date(e.target.value) });
    };

    const handleIatfEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, iatfWindowEnd: new Date(e.target.value) });
    };

    const toDateString = (date: Date | null) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

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
                        value={settings.targetWeight}
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
                            value={settings.gdmMin}
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
                            value={settings.gdmOpt}
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
                            value={toDateString(settings.iatfWindowStart)}
                            onChange={handleIatfStartChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="iatfEnd">Fin Ventana IATF</Label>
                        <Input
                            id="iatfEnd"
                            type="date"
                            value={toDateString(settings.iatfWindowEnd)}
                            onChange={handleIatfEndChange}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
