"use client";
import React, { useState } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronRight, CheckCircle2, XCircle, Search } from 'lucide-react';
import ReconciliationModal from './ReconciliationModal';

export default function ReconciliationAlert() {
    const { animals } = useDashboard();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Find animals that are currently "unregistered"
    const unregisteredAnimals = animals.filter(a => a.inventoryStatus === 'unregistered');

    if (unregisteredAnimals.length === 0) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-1 md:col-span-2 lg:col-span-4 cursor-pointer"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-200 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Reconciliación de Inventario Requerida</h3>
                            <p className="text-sm text-slate-600 font-medium mt-0.5">
                                Existen <span className="font-black text-rose-600">{unregisteredAnimals.length} animales</span> que no han sido registrados en la última sesión de campo.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600 font-bold group-hover:translate-x-1 transition-transform duration-300">
                        <span>Revisar Discrepancias</span>
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isModalOpen && (
                    <ReconciliationModal
                        unregisteredAnimals={unregisteredAnimals}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
