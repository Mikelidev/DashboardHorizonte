import React, { useMemo } from 'react';
import { useDashboard } from './DashboardContext';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export default function GlobalReproductiveCard() {
    const { animals } = useDashboard();

    const totalStats = useMemo(() => {
        let prenadas = 0;
        let vacias = 0;
        let activas = 0;

        let iaCount = 0;
        let teCount = 0;
        let natCount = 0;

        animals.forEach(an => {
            if (!an.isActive) return;

            const s = an.reproductiveState?.toUpperCase() || '';
            if (s.includes('PREÑADA')) {
                prenadas++;
                activas++;

                // Find the actual service type string that got her pregnant
                let serviceStr = '';
                // Look for the latest event with a populated serviceType
                for (let i = 0; i < an.eventos.length; i++) {
                    const st = an.eventos[i].serviceType;
                    if (st && st.trim() !== '') {
                        serviceStr = st.trim().toUpperCase();
                        break;
                    }
                }

                // Fallback to the master ficha if the event timeline was barren of service metadata
                if (serviceStr === '' && an.masterServiceType) {
                    serviceStr = an.masterServiceType.trim().toUpperCase();
                }

                // Normalize accents for robust matching
                const normalizedStr = serviceStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

                // Check TE FIRST to prevent the "IA" in "TransferencIA" from triggering a false positive
                if (normalizedStr.includes('TE') || normalizedStr.includes('EMBRION') || normalizedStr.includes('EMBRI')) teCount++;
                // Use regex with word boundaries for pure 'IA' to prevent substring collisions, or broad sweeps for Insemination keywords
                else if (/\bIA\b/.test(normalizedStr) || normalizedStr.includes('IATF') || normalizedStr.includes('INSEMINA')) iaCount++;
                else if (normalizedStr.includes('REPASO') || normalizedStr.includes('TORO') || normalizedStr.includes('NATURAL') || normalizedStr.includes('MN')) natCount++;

            } else if (s.includes('VACIA') || s.includes('ANESTRO') || s.includes('CICLANDO')) {
                vacias++;
                activas++;
            }
        });

        return {
            prenadas,
            vacias,
            iaCount,
            teCount,
            natCount,
            total: activas,
            rate: activas > 0 ? ((prenadas / activas) * 100).toFixed(1) : '0.0'
        };
    }, [animals]);

    const pieData = [
        { name: 'Preñadas', value: totalStats.prenadas, color: '#10b981' },
        { name: 'Vacías', value: totalStats.vacias, color: '#f43f5e' }
    ];

    if (totalStats.total === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm flex items-center justify-center min-h-[300px]">
                <span className="text-slate-500">Sincronizando el estado reproductivo...</span>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-700">Estado Global del Rodeo</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">Fotografía actual de la fertilidad de todo el inventario activo.</p>

            <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                            itemStyle={{ color: '#334155' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-800">{totalStats.rate}%</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Preñez</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-emerald-600">{totalStats.prenadas} Preñadas</span>
                    <span className="text-rose-600">{totalStats.vacias} Vacías</span>
                </div>

                <div className="flex justify-center gap-8 text-xs text-slate-500 mt-1 px-1">
                    <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-700">{totalStats.iaCount}</span>
                        <span>IATF</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-700">{totalStats.teCount}</span>
                        <span>TE</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-700">{totalStats.natCount}</span>
                        <span>Natural</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
