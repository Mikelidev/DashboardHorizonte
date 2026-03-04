'use client';

import React from 'react';
import { Home, Activity, Dna, Settings, List, HeartPulse, Target, AlertTriangle, ClipboardList } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    currentView: string;
    setCurrentView: (view: string) => void;
}

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
    const navItems = [
        { id: 'dashboard', label: 'Monitor Predictivo', icon: Home },
        { id: 'profile', label: 'Ficha Médica', icon: ClipboardList },
        { id: 'productividad', label: 'Crecimiento y Eficiencia', icon: Activity },
        { id: 'forecast', label: 'Proyección IATF', icon: Target },
        { id: 'alertas', label: 'Alertas y Excepciones', icon: AlertTriangle },
        { id: 'toros', label: 'Ranking Toros', icon: Dna },
        { id: 'reproduccion', label: 'Datos Reproductivos', icon: HeartPulse },
        { id: 'inventory', label: 'Inventario de Rodeo', icon: List },
        { id: 'config', label: 'Configuración de Semáforos', icon: Settings },
    ];

    return (
        <aside className="w-64 glass flex flex-col z-10 transition-all border-r border-slate-200/50">
            <div className="p-8 flex items-center gap-3 border-b border-slate-200/50">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-xl text-white shadow-md shadow-emerald-500/20">
                    H
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Horizonte<span className="text-emerald-500">Ag</span></h1>
            </div>

            <nav className="flex-1 py-8 flex flex-col gap-3 px-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                                isActive
                                    ? "bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100"
                                    : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
                            )}
                        >
                            <Icon className={clsx("w-5 h-5", isActive ? "text-emerald-600" : "text-slate-400")} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-6 mt-auto">
                <div className="bg-slate-50/80 rounded-xl p-4 text-xs text-slate-500 border border-slate-200/60 transition-colors shadow-sm">
                    <p className="font-semibold text-slate-600 text-[13px] mb-1">Motor Horizonte</p>
                    <p className="mb-2">v1.0.0 Pro</p>
                    <p className="mt-1 flex items-center gap-2 font-medium text-emerald-600">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        Sistema En Línea
                    </p>
                </div>
            </div>
        </aside>
    );
}
