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
    loadDataFiles: (animalesCsv: string, eventosCsv: string) => void;
    isLoading: boolean;
    activeProfileIde: string | null;
    setActiveProfileIde: (ide: string | null) => void;
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
    const [rawAnimales, setRawAnimales] = useState<string>('');
    const [rawEventos, setRawEventos] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [activeProfileIde, setActiveProfileIde] = useState<string | null>(null);

    const loadDataFiles = (animalesCsv: string, eventosCsv: string) => {
        setIsLoading(true);
        setRawAnimales(animalesCsv);
        setRawEventos(eventosCsv);
    };

    // Re-run processing whenever raw data, settings, or the selected TIME MACHINE snapshot changes
    useEffect(() => {
        if (rawAnimales && rawEventos) {
            const activeCustomDate = availableSnapshots.find(s => s.id === selectedSnapshot)?.date || null;

            const processed = processDashboardData(rawAnimales, rawEventos, settings, activeCustomDate);
            setAnimals(processed.animals);

            // Only update snapshots array if it's the very first load/actualidad, to prevent snapshot shifting
            if (availableSnapshots.length === 0 || selectedSnapshot === 'actualidad') {
                setAvailableSnapshots(processed.availableSnapshots);
            }

            setIsLoading(false);
        }
    }, [rawAnimales, rawEventos, settings, selectedSnapshot]);

    return (
        <DashboardContext.Provider value={{
            settings, setSettings, animals, availableSnapshots,
            selectedSnapshot, setSelectedSnapshot, loadDataFiles, isLoading,
            activeProfileIde, setActiveProfileIde
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
