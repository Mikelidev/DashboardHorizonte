'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProcessedAnimal, ThresholdSettings, SnapshotDate } from '@/types';
import { processDashboardData } from '@/lib/data-processor';

interface DashboardContextProps {
    settings: ThresholdSettings;
    setSettings: React.Dispatch<React.SetStateAction<ThresholdSettings>>;
    animals: ProcessedAnimal[];
    availableSnapshots: SnapshotDate[];
    selectedSnapshot: string;
    setSelectedSnapshot: (id: string) => void;
    anomalies: import('@/types').DataAnomaly[];
    loadDataFiles: (animalesCsv: string, eventosCsv: string) => void;
    isLoading: boolean;
    activeProfileIde: string | null;
    setActiveProfileIde: (ide: string | null) => void;
    activeSireId: string | null;
    setActiveSireId: (id: string | null) => void;
    inventoryOverrides: Record<string, 'active' | 'archived'>;
    setInventoryOverride: (ide: string, status: 'active' | 'archived') => void;
    dataMaxDate: Date | null;
}

const defaultSettings: ThresholdSettings = {
    targetWeight: 300,
    gdmMin: 0.400,
    gdmOpt: 0.800,
    iatfWindowStart: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), // Default to next month
    iatfWindowEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15),
};

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<ThresholdSettings>(defaultSettings);
    const [animals, setAnimals] = useState<ProcessedAnimal[]>([]);
    const [availableSnapshots, setAvailableSnapshots] = useState<SnapshotDate[]>([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState<string>('actualidad');
    const [anomalies, setAnomalies] = useState<import('@/types').DataAnomaly[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeProfileIde, setActiveProfileIde] = useState<string | null>(null);
    const [activeSireId, setActiveSireId] = useState<string | null>(null);
    const [inventoryOverrides, setInventoryOverridesState] = useState<Record<string, 'active' | 'archived'>>({});
    const [dataMaxDate, setDataMaxDate] = useState<Date | null>(null);

    const [rawAnimales, setRawAnimales] = useState<string | null>(null);
    const [rawEventos, setRawEventos] = useState<string | null>(null);

    // Initial load of persistence
    useEffect(() => {
        const savedOverrides = localStorage.getItem('inventoryOverrides');
        if (savedOverrides) {
            try {
                setInventoryOverridesState(JSON.parse(savedOverrides));
            } catch (e) {
                console.error("Error parsing inventoryOverrides", e);
            }
        }
    }, []);

    const setInventoryOverride = (ide: string, status: 'active' | 'archived') => {
        setInventoryOverridesState(prev => {
            const next = { ...prev, [ide]: status };
            localStorage.setItem('inventoryOverrides', JSON.stringify(next));
            return next;
        });
    };

    const loadDataFiles = (animalesCsv: string, eventosCsv: string) => {
        setRawAnimales(animalesCsv);
        setRawEventos(eventosCsv);
    };

    // Re-process data when dependencies change
    useEffect(() => {
        if (!rawAnimales || !rawEventos) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const currentSnapshot = availableSnapshots.find(s => s.id === selectedSnapshot);
        const cutoffDate = currentSnapshot?.date || null;

        // Use setTimeout to allow UI to breathe
        setTimeout(() => {
            try {
                const dashboardData = processDashboardData(
                    rawAnimales,
                    rawEventos,
                    settings,
                    cutoffDate,
                    inventoryOverrides
                );

                setAnimals(dashboardData.animals);
                setAnomalies(dashboardData.anomalies);
                setDataMaxDate(dashboardData.dataMaxDate);

                if (availableSnapshots.length === 0 && dashboardData.availableSnapshots.length > 0) {
                    setAvailableSnapshots(dashboardData.availableSnapshots);
                }
            } catch (error) {
                console.error("Data Processing Error:", error);
            } finally {
                setIsLoading(false);
            }
        }, 100);

    }, [rawAnimales, rawEventos, selectedSnapshot, settings, inventoryOverrides]); // Note inventoryOverrides in dependency array

    return (
        <DashboardContext.Provider value={{
            settings, setSettings, animals, availableSnapshots,
            selectedSnapshot, setSelectedSnapshot, anomalies, loadDataFiles, isLoading,
            activeProfileIde, setActiveProfileIde, activeSireId, setActiveSireId,
            inventoryOverrides, setInventoryOverride, dataMaxDate
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
