'use client';

import React, { useState } from 'react';
import { useDashboard } from './DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ArrowDown, ArrowUp, Minus, Dna } from 'lucide-react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { key: string, direction: SortDirection };

export default function InventoryTable({ onViewChange }: { onViewChange?: (view: string) => void }) {
    const { animals, setActiveProfileIde, setActiveSireId } = useDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    const activeAnimals = animals.filter(a => a.isActive);

    const padresActivos = React.useMemo(() => {
        const counts: Record<string, number> = {};
        activeAnimals.forEach(a => {
            if (a.padre) {
                counts[a.padre] = (counts[a.padre] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([padre, count]) => ({ padre, count }))
            .sort((a, b) => b.count - a.count); // Sort by most offspring
    }, [activeAnimals]);

    const filtered = activeAnimals.filter(a =>
        a.ide.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.padre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedAnimals = React.useMemo(() => {
        let sortableItems = [...filtered];
        if (sortConfig.direction !== null && sortConfig.key !== '') {
            sortableItems.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof typeof a];
                let bVal: any = b[sortConfig.key as keyof typeof b];

                if (aVal === null) aVal = -Infinity;
                if (bVal === null) bVal = -Infinity;

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filtered, sortConfig]);

    const handleSort = (key: string) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null; // Neutral state
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey: string) => {
        if (sortConfig.key !== columnKey) return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-500 ml-1 inline" />;
        if (sortConfig.direction === 'desc') return <ArrowDown className="w-3 h-3 text-rose-500 ml-1 inline" />;
        return <Minus className="w-3 h-3 text-slate-300 ml-1 inline" />;
    };

    return (
        <Card className="glass border-transparent text-slate-800 min-h-[600px] shadow-sm">
            <CardHeader className="pb-6 border-b border-slate-200/50 mb-0">
                <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-800">Inventario Pro (Cabezas Activas)</CardTitle>
                <div className="mt-4">
                    <Input
                        placeholder="Buscar por IDE o Padre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-50 border-slate-200/80 max-w-sm text-slate-800 placeholder:text-slate-400 focus-visible:ring-emerald-500/50"
                    />
                </div>
            </CardHeader>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/50">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Dna className="w-4 h-4 text-indigo-400" />
                    Padres Activos
                </h4>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex w-max space-x-4">
                        {padresActivos.map((p) => (
                            <div
                                key={p.padre}
                                onClick={() => {
                                    setActiveSireId(p.padre);
                                    if (onViewChange) onViewChange('sire-profile');
                                }}
                                className="inline-flex items-center gap-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all rounded-xl p-3 px-5 group"
                            >
                                <div className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Dna className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-extrabold text-slate-800 group-hover:text-indigo-700 transition-colors">{p.padre}</p>
                                    <p className="text-xs font-semibold text-slate-400">{p.count} crías hijas</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
            <CardContent className="pt-6">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white/50 h-[650px] overflow-y-auto relative outline-none rounded-t-xl">
                    <table className="w-full caption-bottom text-sm relative">
                        <thead className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm [&_tr]:border-b-0">
                            <TableRow className="hover:bg-transparent">
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('ide')}>
                                    IDE {getSortIcon('ide')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('raza')}>
                                    Raza {getSortIcon('raza')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('padre')}>
                                    Padre {getSortIcon('padre')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('currentWeight')}>
                                    Peso Actual {getSortIcon('currentWeight')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('currentGdm')}>
                                    GDM Acum. {getSortIcon('currentGdm')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('reproductiveState')}>
                                    Reproductivo {getSortIcon('reproductiveState')}
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none" onClick={() => handleSort('daysToTarget')}>
                                    Dias P/Obj. {getSortIcon('daysToTarget')}
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-semibold whitespace-nowrap text-slate-500 cursor-pointer select-none pr-6" onClick={() => handleSort('scoreTotal')}>
                                    Score {getSortIcon('scoreTotal')}
                                </th>
                            </TableRow>
                        </thead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-32 text-slate-500 bg-white">
                                        No se encontraron animales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedAnimals.map(animal => (
                                    <TableRow key={animal.ide} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors bg-white">
                                        <TableCell
                                            className="font-bold text-indigo-600 cursor-pointer hover:underline px-4"
                                            onClick={() => {
                                                setActiveProfileIde(animal.ide);
                                                if (onViewChange) onViewChange('profile');
                                            }}
                                        >
                                            {animal.ide}
                                        </TableCell>
                                        <TableCell className="text-slate-600 px-4">{animal.raza}</TableCell>
                                        <TableCell className="text-slate-600 font-medium px-4">{animal.padre}</TableCell>
                                        <TableCell className="text-slate-600 px-4">{animal.currentWeight} <span className="text-slate-400 text-xs">kg</span></TableCell>
                                        <TableCell className="px-4">
                                            <span className={`font-semibold ${animal.currentGdm !== null && animal.currentGdm < 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                {animal.currentGdm?.toFixed(3) || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4">
                                            {animal.reproductiveState ? (
                                                <Badge variant="outline" className={`font-medium border-transparent
                          ${animal.reproductiveState.includes('PREÑADA') ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}
                          ${animal.reproductiveState.includes('SUPERFICIAL') ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}
                          ${animal.reproductiveState.includes('PROFUNDO') ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : ''}
                        `}>
                                                    {animal.reproductiveState}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="px-4">
                                            {animal.daysToTarget !== null ? (
                                                <span className={`${animal.alertYellow ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                                                    {animal.daysToTarget} <span className="text-xs text-slate-400 font-normal">días</span>
                                                </span>
                                            ) : <span className="text-slate-400">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right px-4 pr-6">
                                            <div className="flex items-center justify-end gap-2 text-slate-800">
                                                {animal.alertRed && <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" title="Alerta Crítica"></span>}
                                                {animal.alertYellow && !animal.alertRed && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" title="Alerta Retraso IATF"></span>}
                                                <span className="font-bold text-lg">{animal.scoreTotal}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
                <div className="mt-4 text-sm font-medium text-slate-500 text-right pr-2">Mostrando {sortedAnimals.length} animales activos</div>
            </CardContent>
        </Card>
    );
}
