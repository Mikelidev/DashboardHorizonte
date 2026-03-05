import React, { useState, useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Activity, HeartPulse, Scale, Dna, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';
import { ProcessedAnimal } from '@/types';
import { ScrollArea } from '../ui/scroll-area';

export default function SireProfile({ onViewChange }: { onViewChange?: (view: string) => void }) {
    const { animals, settings, activeSireId, setActiveSireId, setActiveProfileIde } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSire, setSelectedSire] = useState<string | null>(activeSireId || null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Sync with global context if it changes from outside
    React.useEffect(() => {
        if (activeSireId) {
            setSelectedSire(activeSireId);
            setSearchTerm(activeSireId);
        }
    }, [activeSireId]);

    // Unique sires for search
    const allSires = useMemo(() => {
        const active = animals.filter(a => a.isActive);
        const sires = new Set(active.map(a => a.padre).filter(Boolean));
        return Array.from(sires).sort();
    }, [animals]);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return allSires
            .filter(sire => sire.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 10);
    }, [allSires, searchTerm]);

    const handleSelectSire = (sire: string) => {
        setSelectedSire(sire);
        setActiveSireId(sire);
        setSearchTerm(sire);
        setIsDropdownOpen(false);
    };

    // Calculate aggregated metrics for the selected sire
    const sireData = useMemo(() => {
        if (!selectedSire) return null;

        const offspring = animals.filter(a => a.isActive && a.padre === selectedSire);
        if (offspring.length === 0) return null;

        let sumGdm = 0, countGdm = 0;
        let sumScore = 0;
        let preñadas = 0, ciclando = 0, anestro = 0;

        offspring.forEach(a => {
            if (a.currentGdm !== null) {
                sumGdm += a.currentGdm;
                countGdm++;
            }
            sumScore += a.scoreTotal;

            const state = a.reproductiveState?.toUpperCase() || '';
            if (state.includes('PREÑADA')) preñadas++;
            else if (state.includes('CICLANDO')) ciclando++;
            else if (state.includes('ANESTRO')) anestro++;
        });

        const avgGdm = countGdm > 0 ? sumGdm / countGdm : null;
        const avgScore = Math.round(sumScore / offspring.length);

        return {
            offspring,
            avgGdm,
            avgScore,
            preñadas,
            ciclando,
            anestro,
            total: offspring.length
        };
    }, [animals, selectedSire]);

    // Global averages for comparison
    const globalAverages = useMemo(() => {
        const active = animals.filter(a => a.isActive);
        let sumGdm = 0, countGdm = 0, sumScore = 0;

        active.forEach(a => {
            if (a.currentGdm !== null) {
                sumGdm += a.currentGdm;
                countGdm++;
            }
            sumScore += a.scoreTotal;
        });

        return {
            avgGdm: countGdm > 0 ? sumGdm / countGdm : 0,
            avgScore: active.length > 0 ? sumScore / active.length : 0
        };
    }, [animals]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Ficha Médica del Padre</h2>
                    <p className="text-slate-500 mt-1">
                        Rendimiento productivo y reproductivo consolidado de la progenie.
                    </p>
                </div>

                <div className="relative w-full md:w-80 z-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar nombre del Padre..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                                if (e.target.value === '') {
                                    setSelectedSire(null);
                                    setActiveSireId(null);
                                }
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-slate-700 font-medium placeholder:font-normal"
                        />
                    </div>

                    <AnimatePresence>
                        {isDropdownOpen && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-xl overflow-hidden"
                            >
                                <ul className="max-h-60 overflow-y-auto py-1">
                                    {searchResults.map(sire => (
                                        <li
                                            key={sire}
                                            onClick={() => handleSelectSire(sire)}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div className="font-semibold text-slate-700 flex items-center gap-2">
                                                <Dna className="w-4 h-4 text-indigo-400" />
                                                {sire}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {!sireData && (
                <div className="glass rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <Dna className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Buscador de Progenie</h3>
                    <p className="text-slate-500 max-w-sm">
                        Busca y selecciona un Padre para desplegar el rendimiento heredado de todas sus hijas en el establecimiento.
                    </p>
                </div>
            )}

            {sireData && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">

                    {/* Header Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass rounded-2xl p-5 border border-indigo-200/60 bg-indigo-50/30 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Identidad Genética</span>
                            <div>
                                <h3 className="text-3xl font-extrabold text-indigo-900 tracking-tight">{selectedSire}</h3>
                                <p className="text-sm font-medium text-indigo-600/80 flex items-center gap-1 mt-1">
                                    <Users className="w-4 h-4" /> {sireData.total} cabezas hijas activas
                                </p>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                                Impacto Reproductivo
                            </span>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Preñadas</p>
                                    <p className="font-bold text-xl text-emerald-600">{sireData.preñadas}</p>
                                </div>
                                <div className="w-px bg-slate-200"></div>
                                <div>
                                    <p className="text-xs text-slate-500">Ciclando</p>
                                    <p className="font-bold text-xl text-teal-600">{sireData.ciclando}</p>
                                </div>
                                <div className="w-px bg-slate-200"></div>
                                <div>
                                    <p className="text-xs text-slate-500">Anestro</p>
                                    <p className="font-bold text-xl text-rose-600">{sireData.anestro}</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between relative overflow-hidden">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">GDM Promedio (Hijas)</span>
                            <div className="z-10 relative">
                                <h3 className={`text-3xl font-extrabold tracking-tight ${sireData.avgGdm && sireData.avgGdm >= settings.gdmOpt ? 'text-emerald-600' : sireData.avgGdm && sireData.avgGdm >= settings.gdmMin ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {sireData.avgGdm !== null ? `${sireData.avgGdm > 0 ? '+' : ''}${sireData.avgGdm.toFixed(3)}` : 'N/A'} <span className="text-sm font-semibold opacity-70">kg/d</span>
                                </h3>
                                <div className="flex items-center gap-1 mt-1 text-sm font-medium">
                                    {sireData.avgGdm !== null && sireData.avgGdm > globalAverages.avgGdm ? (
                                        <><ArrowUpRight className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-600">Sobre rodeo</span></>
                                    ) : (
                                        <><ArrowDownRight className="w-4 h-4 text-rose-500" /> <span className="text-rose-600">Bajo rodeo</span></>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Score Horizon Promedio</span>
                            <div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {sireData.avgScore} <span className="text-sm font-semibold text-slate-500">/ 100 pt</span>
                                </h3>
                                <div className="flex items-center gap-1 mt-1 text-sm font-medium">
                                    {sireData.avgScore > globalAverages.avgScore ? (
                                        <><ArrowUpRight className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-600">Sobre rodeo</span></>
                                    ) : (
                                        <><ArrowDownRight className="w-4 h-4 text-rose-500" /> <span className="text-rose-600">Bajo rodeo</span></>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Offspring List */}
                    <div className="mt-8 glass rounded-2xl p-6 border border-slate-200/60 bg-white/50">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <Dna className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-xl font-bold text-slate-800">Inventario de Progenie</h3>
                        </div>

                        <ScrollArea className="h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IDE</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Raza</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Peso Actual</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">GDM</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reproductivo</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {sireData.offspring.sort((a, b) => b.scoreTotal - a.scoreTotal).map((animal) => (
                                        <tr key={animal.ide} className="hover:bg-indigo-50/50 transition-colors">
                                            <td
                                                className="py-3 px-4 font-mono font-bold text-indigo-600 cursor-pointer hover:underline"
                                                onClick={() => {
                                                    setActiveProfileIde(animal.ide);
                                                    if (onViewChange) onViewChange('profile');
                                                }}
                                            >
                                                {animal.ide}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">{animal.raza}</td>
                                            <td className="py-3 px-4 text-slate-800 font-medium">{animal.currentWeight} kg</td>
                                            <td className="py-3 px-4 font-semibold">
                                                <span className={animal.currentGdm !== null && animal.currentGdm < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                    {animal.currentGdm?.toFixed(3) || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${animal.reproductiveState?.toUpperCase().includes('PREÑADA') ? 'bg-emerald-100 text-emerald-700' :
                                                        animal.reproductiveState?.toUpperCase().includes('ANESTRO') ? 'bg-rose-100 text-rose-700' :
                                                            animal.reproductiveState?.toUpperCase().includes('CICLANDO') ? 'bg-teal-100 text-teal-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {animal.reproductiveState || 'Sin Tacto'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-slate-800">{animal.scoreTotal}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>
                    </div>

                </motion.div>
            )}
        </div>
    );
}
