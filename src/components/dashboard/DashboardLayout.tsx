'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import HeaderKPIs from './HeaderKPIs';
import AlertsRegion from './AlertsRegion';
import WeightDistributionChart from './WeightDistributionChart';
import HealthDonuts from './HealthDonuts';
import TorosView from './TorosView';
import ReproductiveDataView from './ReproductiveDataView';
import ProductivityView from './ProductivityView';
import ReproductiveForecast from './ReproductiveForecast';
import ExceptionManagement from './ExceptionManagement';
import AnimalProfile from './AnimalProfile';
import ConfigPanel from './ConfigPanel';
import InventoryTable from './InventoryTable';
import { useDashboard } from './DashboardContext';
import { CloudDownload, AlertCircle } from 'lucide-react';

export default function DashboardLayout() {
    const [currentView, setCurrentView] = useState('dashboard');
    const { animals, isLoading, loadDataFiles } = useDashboard();
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Auto-fetch from Google Sheets on mount
    React.useEffect(() => {
        const fetchSheets = async () => {
            const animalesUrl = process.env.NEXT_PUBLIC_SHEET_ANIMALES_URL;
            const eventosUrl = process.env.NEXT_PUBLIC_SHEET_EVENTOS_URL;

            if (!animalesUrl || !eventosUrl) {
                setFetchError("Faltan configurar las URLs de Google Sheets en el archivo .env.local");
                return;
            }

            try {
                // Fetch both CSVs in parallel via our local Next.js API Route proxy to avoid CORS/redirect issues.
                const [animalesRes, eventosRes] = await Promise.all([
                    fetch('/api/sync?type=animales'),
                    fetch('/api/sync?type=eventos')
                ]);

                if (!animalesRes.ok) throw new Error(`Error al descargar Ficha Animales: ${animalesRes.status}`);
                if (!eventosRes.ok) throw new Error(`Error al descargar Eventos: ${eventosRes.status}`);

                const animalesCsv = await animalesRes.text();
                const eventosCsv = await eventosRes.text();

                console.log("FETCHED ANIMALES LENGTH:", animalesCsv.length, "First 20 chars:", animalesCsv.substring(0, 20));
                console.log("FETCHED EVENTOS LENGTH:", eventosCsv.length, "First 20 chars:", eventosCsv.substring(0, 20));

                if (animalesCsv.trim() === '' || eventosCsv.trim() === '') {
                    throw new Error("Uno de los archivos CSV descargados está vacío.");
                }

                if (animalesCsv.includes('<html') || eventosCsv.includes('<html')) {
                    throw new Error("Google Sheets devolvió una página HTML (Redirección fallida o Enlace Privado).");
                }

                // Pass the raw CSV text to our data processor engine 
                loadDataFiles(animalesCsv, eventosCsv);
            } catch (err: any) {
                console.error("Dashboard Sync Error:", err);
                setFetchError(err.message || "Error desconocido al sincronizar los datos");
            }
        };

        fetchSheets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasData = animals.length > 0;

    return (
        <div className="flex min-h-screen bg-transparent text-slate-800 font-sans">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

            <main className="flex-1 p-10 overflow-y-auto">
                {fetchError ? (
                    <div className="flex flex-col items-center justify-center h-full border border-red-200 bg-red-50/50 rounded-3xl p-16">
                        <AlertCircle className="w-16 h-16 text-red-500 mb-6 drop-shadow-sm" />
                        <h2 className="text-2xl font-bold text-red-800 mb-2">Error de Conexión</h2>
                        <p className="text-red-600 text-center max-w-md">{fetchError}</p>
                    </div>
                ) : !hasData || isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-3xl p-16 glass">
                        <CloudDownload className="w-16 h-16 text-emerald-500 mb-6 drop-shadow-sm animate-bounce" />
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Sincronizando con Google Sheets</h2>
                        <p className="text-slate-500 mb-10 max-w-md text-center text-base">
                            Descargando y procesando la última versión del rodeo. Por favor espere unos segundos...
                        </p>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700 max-w-[1400px] mx-auto flex flex-col gap-8">
                        <HeaderKPIs />
                        {currentView === 'dashboard' && (
                            <>
                                <AlertsRegion />
                                <HealthDonuts />
                                <WeightDistributionChart />
                            </>
                        )}
                        {currentView === 'toros' && (
                            <TorosView />
                        )}
                        {currentView === 'reproduccion' && (
                            <ReproductiveDataView />
                        )}
                        {currentView === 'productividad' && (
                            <ProductivityView />
                        )}
                        {currentView === 'forecast' && (
                            <ReproductiveForecast />
                        )}
                        {currentView === 'alertas' && (
                            <ExceptionManagement />
                        )}
                        {currentView === 'profile' && (
                            <AnimalProfile />
                        )}
                        {currentView === 'inventory' && (
                            <InventoryTable onViewChange={setCurrentView} />
                        )}
                        {currentView === 'config' && (
                            <ConfigPanel />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
