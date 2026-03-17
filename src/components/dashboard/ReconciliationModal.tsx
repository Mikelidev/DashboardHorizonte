"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, ShieldAlert, ArrowRight } from 'lucide-react';
import { ProcessedAnimal } from '@/types';
import { useDashboard } from './DashboardContext';

interface Props {
    unregisteredAnimals: ProcessedAnimal[];
    onClose: () => void;
}

export default function ReconciliationModal({ unregisteredAnimals, onClose }: Props) {
    const { setInventoryOverride } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAnimals = unregisteredAnimals.filter(a =>
        a.ide.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAction = (ide: string, action: 'active' | 'archived') => {
        setInventoryOverride(ide, action);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-rose-500/20 p-3 rounded-full text-rose-400">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Reconciliación de Inventario</h2>
                            <p className="text-slate-400 font-medium">
                                {unregisteredAnimals.length} animales faltantes en la última sesión
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-full transition-colors text-slate-300 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col flex-1 min-h-0 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <p className="text-slate-600 font-medium max-w-2xl">
                            Estos animales estaban activos en el rodeo pero no registraron eventos en la última sesión de campo masiva. Por favor, revisa el estado de cada uno.
                        </p>
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar IDE..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none w-64 bg-white transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IDE</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Último Peso</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Último Estado Reprod.</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Acción Inmediata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence>
                                    {filteredAnimals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                No se encontraron animales con ese IDE.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAnimals.map(animal => (
                                            <motion.tr
                                                key={animal.ide}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="hover:bg-slate-50/80 transition-colors group"
                                            >
                                                <td className="p-4 font-black text-slate-800">{animal.ide}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${animal.scoreCategory === 'ELITE' ? 'bg-amber-100 text-amber-800' :
                                                        animal.scoreCategory === 'DESCARTE' ? 'bg-rose-100 text-rose-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        {animal.scoreCategory || 'COMERCIAL'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-600 font-medium">
                                                    {animal.currentWeight ? `${animal.currentWeight} kg` : '-'}
                                                </td>
                                                <td className="p-4 text-slate-600 font-medium">
                                                    {animal.reproductiveState || '-'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleAction(animal.ide, 'active')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg transition-colors border border-emerald-200"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Sigue en rodeo
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(animal.ide, 'archived')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-lg transition-colors border border-rose-200"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Remover
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
                    >
                        Cerrar Panel
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
