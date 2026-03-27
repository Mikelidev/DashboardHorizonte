import Papa from 'papaparse';
import { AnimalRaw, EventoRaw, ProcessedAnimal, ProcessedEvent, ThresholdSettings, DashboardData, SnapshotDate, DataAnomaly } from '../types';

/**
 * Helper to parse custom date format from the CSV (e.g. DD/MM/YYYY)
 */
function parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Fast path: let the JS Engine parse standard MM/DD/YYYY or YYYY-MM-DD
    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) {
        return nativeDate;
    }

    // Fallback: Custom manual parsing.
    // WARNING: Google Sheets with US Locale exports as MM/DD/YYYY, while AR locale exports DD/MM/YYYY.
    // Looking at the data (e.g., 6/24/2025), it's clearly MM/DD/YYYY.
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;

        let day = p0;
        let month = p1 - 1;

        // Auto-detect US Format if the middle number is > 12 OR just assume M/D/YYYY based on the sheet's behavior.
        // If p0 > 12, it's definitely DD/MM/YYYY. If p1 > 12, it's definitely MM/DD/YYYY.
        // Given historical data like "10/11/2025" was meant to be October 11 (Pesada de octubre), NOT Nov 10.
        if (p1 > 12 || (p0 <= 12 && p1 <= 31)) {
            // Assume MM/DD/YYYY to fix the "October" vs "November" inversion
            month = p0 - 1;
            day = p1;
        }

        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}

/**
 * Standardize numeric inputs. PapaParse parses numbers as strings sometimes.
 * Returns null if the value is empty, "NO INFO", or unparseable.
 */
function parseNumeric(val: string | number | null | undefined): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'string' && val.trim().toUpperCase() === 'NO INFO') return null;
    if (typeof val === 'number') return val;
    // Handle comma as decimal separator
    const standardized = val.replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Piecewise linear interpolation between a set of (value, score) anchor points.
 * Values below the first anchor are clamped to the first anchor's score.
 * Values above the last anchor are clamped to the last anchor's score.
 */
function interpolate(value: number, anchors: [number, number][]): number {
    if (value <= anchors[0][0]) return anchors[0][1];
    if (value >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
    for (let i = 0; i < anchors.length - 1; i++) {
        const [v0, s0] = anchors[i];
        const [v1, s1] = anchors[i + 1];
        if (value >= v0 && value <= v1) {
            return s0 + ((value - v0) * (s1 - s0)) / (v1 - v0);
        }
    }
    return anchors[anchors.length - 1][1];
}

/** A. GDM anchor points → max 30 pts */
const GDM_ANCHORS: [number, number][] = [
    [0.1,  0],
    [0.4,  5],
    [0.8, 15],
    [1.0, 20],
    [1.2, 30],
];

/** B. Weight-deviation anchor points (deviation as fraction, e.g. -0.20 = -20%) → max 30 pts */
const WEIGHT_DEV_ANCHORS: [number, number][] = [
    [-0.20,  0],
    [-0.10,  5],
    [ 0.00, 15],
    [ 0.10, 20],
    [ 0.20, 30],
];

/**
 * C. Scores the reproductive state from tacto anestro events.
 * Accepts ALL reproductive state strings from tacto events (order-independent).
 * Returns max 40 pts.
 */
function scoreReproductiveFromTactos(tactoStates: string[]): number {
    const normalize = (s: string): 'CC' | 'AS' | 'AP' | null => {
        const u = s.trim().toUpperCase();
        if (u.includes('CICLANDO')) return 'CC';
        if (u === 'AS') return 'AS';
        if (u === 'AP') return 'AP';
        return null;
    };

    const states = tactoStates.map(normalize).filter((s): s is 'CC' | 'AS' | 'AP' => s !== null);

    if (states.length === 0) return 0;

    if (states.length === 1) {
        switch (states[0]) {
            case 'CC': return 38;
            case 'AS': return 10;
            case 'AP': return 0;
        }
    }

    // For 2+ tactos, use the first two after alphabetic sorting to get a canonical pair key
    // Sorted alphabetically: 'AP' < 'AS' < 'CC'
    const sorted = [...states].sort();
    const key = `${sorted[0]}+${sorted[1]}`;
    const map: Record<string, number> = {
        'CC+CC': 40,
        'AS+CC': 35,
        'AP+CC': 30,
        'AP+AS': 15,
        'AS+AS':  5,
        'AP+AP':  0,
    };
    return map[key] ?? 0;
}

export function processDashboardData(
    animalesCsvString: string,
    eventosCsvString: string,
    settings: ThresholdSettings,
    cutoffDate: Date | null = null,
    inventoryOverrides: Record<string, 'active' | 'archived'> = {}
): DashboardData {

    // 1. Parse CSVs
    const animalesParsed = Papa.parse<AnimalRaw>(animalesCsvString, {
        header: true,
        skipEmptyLines: true,
    });

    const eventosParsed = Papa.parse<EventoRaw>(eventosCsvString, {
        header: true,
        skipEmptyLines: true,
    });

    const animales = animalesParsed.data;
    const eventos = eventosParsed.data;

    // --- TIME MACHINE: Extract unique Pesadas BEFORE temporal filtering ---
    const pesadaDatesSet: Record<string, Date> = {};
    for (const ev of eventos) {
        if (ev.Evento && ev.Evento.toUpperCase().includes('PESADA')) {
            const d = parseDate(ev.Fecha);
            if (d) {
                const dateStr = d.toISOString().split('T')[0];
                pesadaDatesSet[dateStr] = d;
            }
        }
    }

    const uniquePesadaDates = Object.values(pesadaDatesSet).sort((a, b) => a.getTime() - b.getTime());
    const availableSnapshots: SnapshotDate[] = [
        { id: 'actualidad', label: 'Actualidad (Todo el Historial)', date: null }
    ];

    uniquePesadaDates.forEach((d, idx) => {
        const formatted = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
        availableSnapshots.push({
            id: `pesada_${idx + 1}`,
            label: `Pesada ${idx + 1} - ${formatted}`,
            date: d
        });
    });

    const anomalies: DataAnomaly[] = [];

    // Check duplicates early
    const ideSet = new Set<string>();
    for (const an of animales) {
        if (!an.IDE) continue;
        if (ideSet.has(an.IDE)) {
            anomalies.push({
                ide: an.IDE,
                category: "Anomalías de base de datos",
                desc: "IDE duplicado en el maestro de animales.",
                location: "Ficha Animales",
                cause: "Error de carga manual o escaneo doble del chip."
            });
        }
        ideSet.add(an.IDE);
    }

    // 2. Identify the absolute latest date in the dataset (for Inventory Rule)
    let globalMaxTime = 0;

    // Map IDE to its events
    const eventsByIde: Record<string, ProcessedEvent[]> = {};

    for (const ev of eventos) {
        const d = parseDate(ev.Fecha);

        // --- TIME MACHINE: ENFORCE CUTOFF ---
        if (cutoffDate && d && d.getTime() > cutoffDate.getTime()) {
            continue;
        }

        if (d) {
            if (d.getTime() > globalMaxTime) {
                globalMaxTime = d.getTime();
            }
        }

        if (!eventsByIde[ev.IDE]) {
            eventsByIde[ev.IDE] = [];
        }

        // Parse EventNumber, handle missing gracefully
        let evNum = 0;
        if (ev['N° Evento']) {
            evNum = typeof ev['N° Evento'] === 'number' ? ev['N° Evento'] : parseInt(ev['N° Evento'], 10);
            if (isNaN(evNum)) evNum = 0;
        }

        eventsByIde[ev.IDE].push({
            date: d || new Date(0),
            type: ev.Evento || 'Desconocido',
            eventNumber: evNum,
            weight: parseNumeric(ev.Peso),
            gdm: parseNumeric(ev.GDM),
            reproductiveState: ev['Estado reproductivo'] || ev['Estado Reproductivo'] || null,
            serviceType: ev['Tipo de Servicio'] || ev['Tipo de servicio'] || null,
            comments: ev.Comentarios || null
        });
    }

    // Check if the herd has actually reached the reproductive cycle yet
    let herdHasReproEvents = false;
    for (const events of Object.values(eventsByIde)) {
        if (events.some(e => e.type.toUpperCase().includes('TACTO ANESTRO 2') || e.type.toUpperCase().includes('IATF'))) {
            herdHasReproEvents = true;
            break;
        }
    }

    // 3. First pass over animals to calculate raw state and gather herd stats
    const draftAnimals: ProcessedAnimal[] = [];
    let sumGdm = 0;
    let countGdm = 0;
    let sumWeight = 0;
    let countWeight = 0;

    for (const an of animales) {
        // Ficha Animales.csv: Si Padre es null, "NO INFO" o vacío, renombrar a "Otros Toros".
        let padreStr = an.Padre;
        if (!padreStr || padreStr.trim().toUpperCase() === 'NO INFO' || padreStr.trim() === '') {
            padreStr = 'Otros Toros';
        }

        let birthDate: Date | null = null;
        if (an.Nacimiento && an.Nacimiento.trim().toUpperCase() !== 'NO INFO') {
            birthDate = parseDate(an.Nacimiento);
        }

        // Extrapolate master service type from various possible columns in the Animales sheet
        let masterServiceStr = null;
        if (an['Tipo de Servicio'] && typeof an['Tipo de Servicio'] === 'string') masterServiceStr = an['Tipo de Servicio'];
        else if (an['Tipo de servicio'] && typeof an['Tipo de servicio'] === 'string') masterServiceStr = an['Tipo de servicio'];
        else if (an['Servicio'] && typeof an['Servicio'] === 'string') masterServiceStr = an['Servicio'];

        const animalEvents = eventsByIde[an.IDE] || [];

        // -------------------------------------------------------------------------------------------------
        // 1. EXTRACT WEIGHT, GDM & CASH VELOCITY (Delta GDM) STRICTLY CHRONOLOGICALLY
        // -------------------------------------------------------------------------------------------------
        const chronoEvents = [...animalEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

        let currentWeight: number | null = null;
        let currentGdm: number | null = null;
        let previousGdm: number | null = null;

        for (const ev of chronoEvents) {
            if (currentWeight === null && ev.weight !== null) currentWeight = ev.weight;

            if (currentGdm === null && ev.gdm !== null) {
                currentGdm = ev.gdm;
            } else if (currentGdm !== null && previousGdm === null && ev.gdm !== null) {
                previousGdm = ev.gdm;
            }

            if (currentWeight !== null && currentGdm !== null && previousGdm !== null) break;
        }

        // Calculate Delta GDM (Velocidad de Caja)
        let deltaGdm: number | null = null;
        if (currentGdm !== null && previousGdm !== null) {
            deltaGdm = currentGdm - previousGdm;
        }

        // Calculate Average GDM
        let averageGdm: number | null = null;
        let totalGdm = 0;
        let gdmCount = 0;
        for (const ev of chronoEvents) {
            if (ev.gdm !== null && ev.gdm > 0) {
                totalGdm += ev.gdm;
                gdmCount++;
            }
        }
        if (gdmCount > 0) {
            averageGdm = totalGdm / gdmCount;
        }

        // Calculate PDE (Peso por Día de Edad)
        let pde: number | null = null;
        if (birthDate && currentWeight !== null) {
            const weightEvent = chronoEvents.find(e => e.weight !== null);
            if (weightEvent && weightEvent.date.getTime() > birthDate.getTime()) {
                const daysAlive = (weightEvent.date.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysAlive > 0) {
                    pde = (currentWeight - 30) / daysAlive;
                }
            }
        }

        // --- ANOMALY AUDIT ---
        let hasTact2OrIatf = false;
        let firstPregnancyDate: Date | null = null;
        let earliestServiceDate: Date | null = null;

        for (let i = 0; i < chronoEvents.length; i++) {
            const ev = chronoEvents[i];
            const evType = ev.type.toUpperCase();
            const reproState = (ev.reproductiveState || '').toUpperCase();

            if (ev.gdm !== null) {
                if (ev.gdm > 2.5) {
                    anomalies.push({ ide: an.IDE, category: "Anomalías de peso", desc: `GDM biológicamente imposible elevado (${ev.gdm} kg/día).`, location: `Eventos (${evType})`, cause: "Error de data entry en el peso actual o anterior." });
                } else if (ev.gdm < -1.0) {
                    anomalies.push({ ide: an.IDE, category: "Anomalías de peso", desc: `Pérdida de peso severa inexplicable (${ev.gdm} kg/día).`, location: `Eventos (${evType})`, cause: "Posible error de lectura de pesada o desbaste no registrado." });
                }
            }

            if (evType.includes('TACTO ANESTRO 2') || evType.includes('IATF')) hasTact2OrIatf = true;

            if (evType.includes('IATF') || (ev.serviceType && ev.serviceType.trim() !== '')) {
                if (!earliestServiceDate || ev.date.getTime() < earliestServiceDate.getTime()) earliestServiceDate = ev.date;
            }

            if (reproState === 'PREÑADA' || (evType.includes('IATF') && ev.serviceType && ev.serviceType.trim() !== '')) {
                if (!firstPregnancyDate || ev.date.getTime() < firstPregnancyDate.getTime()) firstPregnancyDate = ev.date;
            }
        }

        if (firstPregnancyDate && earliestServiceDate && firstPregnancyDate.getTime() < earliestServiceDate.getTime()) {
            anomalies.push({ ide: an.IDE, category: "Inconsistencias reproductivas", desc: `Registro de preñez anterior a la fecha de servicio.`, location: `Eventos`, cause: "Error de tipeo en las fechas." });
        }

        if (herdHasReproEvents && currentWeight !== null && currentWeight > 310 && !hasTact2OrIatf) {
            anomalies.push({ ide: an.IDE, category: "Faltantes operativos", desc: `Fantasma Operativo: Registra buen peso (${currentWeight} kg) pero no ingresó a Tacto 2 ni IATF.`, location: `Falta evento reproductivo`, cause: "Saltó la manga o perdió caravana (chip ilegible)." });
        }
        // --- END ANOMALY AUDIT ---

        // -------------------------------------------------------------------------------------------------
        // 2. ASSIGN PROTOCOL SCORES FOR BIOLOGICAL TIMELINE (Tactos are ultimate phase)
        // -------------------------------------------------------------------------------------------------
        const getPhaseScore = (type: string, number: number) => {
            const t = type.toUpperCase();
            if (t.includes('IATF') || t.includes('SERVICIO') || t.includes('DIAGNOS')) return 100;
            if (t.includes('TACTO ANESTRO') || t.includes('TACTO')) {
                return 50 + number;
            }
            return 0;
        };

        animalEvents.sort((a, b) => {
            const scoreA = getPhaseScore(a.type, a.eventNumber);
            const scoreB = getPhaseScore(b.type, b.eventNumber);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return b.date.getTime() - a.date.getTime();
        });

        let isActive = animalEvents.length > 0;

        if (isActive && chronoEvents.length > 0) {
            const latestDate = chronoEvents[0].date.getTime();
            const eventsOnLatestDate = chronoEvents.filter(e => e.date.getTime() === latestDate);
            const hasReproEventOnLatestDate = eventsOnLatestDate.some(e => !e.type.toUpperCase().includes('PESADA'));
            const allLatestAreEmptyPesadas = eventsOnLatestDate.every(e =>
                e.type.toUpperCase().includes('PESADA') && e.weight === null && e.gdm === null
            );
            if (allLatestAreEmptyPesadas && !hasReproEventOnLatestDate) {
                isActive = false;
            }
        }

        // --- INVENTORY RECONCILIATION LOGIC ---
        let inventoryStatus: 'active' | 'archived' | 'unregistered' = 'active';

        if (isActive && chronoEvents.length > 0) {
            const lastEventDate = chronoEvents[0].date.getTime();
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const isMissingFromLatestSession = (globalMaxTime - lastEventDate) > THIRTY_DAYS_MS;
            if (isMissingFromLatestSession) {
                inventoryStatus = 'unregistered';
                isActive = false;
            }
        } else if (!isActive && chronoEvents.length > 0) {
            inventoryStatus = 'archived';
        }

        // Apply manual overrides
        if (inventoryOverrides[an.IDE]) {
            inventoryStatus = inventoryOverrides[an.IDE];
            isActive = (inventoryStatus === 'active');
        }

        // Search for the latest valid Reproductive state, prioritizing "Tipo de Servicio" for IATF
        let reproState = null;
        let isApta = false;

        for (const ev of chronoEvents) {
            const evType = ev.type.toUpperCase();

            // 1. FINAL VERDICT: Tacto IATF
            if (evType.includes('IATF')) {
                if (ev.serviceType && ev.serviceType.trim() !== '') {
                    reproState = 'PREÑADA';
                } else {
                    reproState = 'VACIA';
                }
                break;
            }

            // 2. PRE-VERDICT: Tacto Anestro 1 & 2
            if (evType.includes('TACTO ANESTRO') || evType.includes('TACTO 1') || evType.includes('TACTO 2')) {
                const repStr = (ev.reproductiveState || '').trim().toUpperCase();

                if (repStr.includes('PREÑADA') || repStr.includes('PRENADA')) {
                    reproState = 'PREÑADA';
                    masterServiceStr = 'NATURAL';
                    isApta = true;
                    break;
                } else if (repStr === 'AS') {
                    reproState = 'ANESTRO SUPERFICIAL';
                    isApta = false;
                    break;
                } else if (repStr === 'AP') {
                    reproState = 'ANESTRO PROFUNDO';
                    isApta = false;
                    break;
                } else if (repStr === 'NO APTA') {
                    reproState = 'NO APTA';
                    isApta = false;
                    break;
                } else if (repStr.includes('CICLANDO')) {
                    reproState = 'CICLANDO';
                    isApta = true;
                } else if (repStr === '') {
                    reproState = 'VACIA';
                    break;
                }
            }

            // 3. FALLBACK: Catch Service outside of specific Tacto IATF event name
            if (!reproState && ev.serviceType && ev.serviceType.trim() !== '') {
                reproState = 'PREÑADA';
                if (!evType.includes('IATF')) masterServiceStr = 'NATURAL';
                break;
            }
        }

        // --- 4. DATA MINING: SERVICE WINDOW GDM ---
        let serviceWindowGdm: number | null = null;
        const latestServicePeriodEvent = chronoEvents.find(e =>
            e.type.toUpperCase().includes('IATF') ||
            e.type.toUpperCase().includes('TACTO') ||
            (e.serviceType && e.serviceType.trim() !== '') ||
            (e.reproductiveState && e.reproductiveState.trim() !== '')
        );

        if (latestServicePeriodEvent) {
            const preServiceEvents = chronoEvents.filter(e => e.date.getTime() <= latestServicePeriodEvent.date.getTime() && e.gdm !== null);
            if (preServiceEvents.length > 0) {
                serviceWindowGdm = preServiceEvents[0].gdm;
            } else {
                serviceWindowGdm = currentGdm;
            }
        } else {
            serviceWindowGdm = currentGdm;
        }

        if (isActive && currentGdm !== null) {
            sumGdm += currentGdm;
            countGdm++;
        }
        if (isActive && currentWeight !== null) {
            sumWeight += currentWeight;
            countWeight++;
        }

        draftAnimals.push({
            ide: an.IDE,
            raza: an.Raza || 'Desconocida',
            padre: padreStr,
            masterServiceType: masterServiceStr || 'Desconocido',
            birthDate,
            isActive,
            inventoryStatus,
            eventos: animalEvents,
            currentWeight,
            currentGdm,
            averageGdm,
            deltaGdm,
            pde,
            reproductiveState: reproState,
            isApta: isApta,
            serviceWindowGdm,

            scoreGdm: 0,
            scoreReproductive: 0,
            scoreConsistency: 0,
            scoreTotal: 0,
            scoreCategory: null,
            fase: 'Recría',

            daysToTarget: null,
            alertRed: false,
            alertYellow: false
        });
    }

    // 4. Calculate Herd Statistics for active animals
    const meanGdm = countGdm > 0 ? (sumGdm / countGdm) : 0;
    const meanWeight = countWeight > 0 ? (sumWeight / countWeight) : 0;

    // 5. Final scoring pass — PHASE-AWARE DYNAMIC METHODOLOGY
    // A. GDM (max 30 pts)      — piecewise linear interpolation
    // B. Weight vs avg lote (max 30 pts) — piecewise linear interpolation on % deviation
    // C. Tacto reproductive state (max 40 pts) — set-based conditional
    //
    // Phase detection:
    //   Recría  → no tacto reproductive data → Score = (A + B) × 1.667  (scales 60 → 100)
    //   Selección → has tacto reproductive data → Score = A + B + C       (max 100)
    for (const draft of draftAnimals) {
        if (!draft.isActive) continue;

        // --- A. GDM Score (max 30 pts) ---
        draft.scoreGdm = draft.currentGdm !== null
            ? Math.round(interpolate(draft.currentGdm, GDM_ANCHORS) * 10) / 10
            : 0;

        // --- B. Weight deviation vs herd average (max 30 pts) ---
        draft.scoreConsistency = 0;
        if (draft.currentWeight !== null && meanWeight > 0) {
            const deviation = (draft.currentWeight - meanWeight) / meanWeight;
            draft.scoreConsistency = Math.round(interpolate(deviation, WEIGHT_DEV_ANCHORS) * 10) / 10;
        }

        // --- C. Reproductive state from tacto events (max 40 pts) ---
        // Collect ALL reproductive state strings from TACTO ANESTRO events (order-independent)
        const tactoStates: string[] = draft.eventos
            .filter(e =>
                e.type.toUpperCase().includes('TACTO ANESTRO') ||
                e.type.toUpperCase().includes('TACTO 1') ||
                e.type.toUpperCase().includes('TACTO 2')
            )
            .map(e => e.reproductiveState || '')
            .filter(s => s.trim() !== '');

        // --- PHASE DETECTION ---
        // If NO tacto state records exist: Recría phase — scale growth scores to 100
        // If at least one tacto state exists: Selección phase — full 3-component formula
        const hasTactoData = tactoStates.length > 0;
        draft.fase = hasTactoData ? 'Selección' : 'Recría';

        if (hasTactoData) {
            // Selección: A + B + C (max 100 pts)
            draft.scoreReproductive = scoreReproductiveFromTactos(tactoStates);
            draft.scoreTotal = Math.round(draft.scoreGdm + draft.scoreConsistency + draft.scoreReproductive);
        } else {
            // Recría: (A + B) × 1.667 — scales max 60 pts to 100 pts
            draft.scoreReproductive = 0;
            draft.scoreTotal = Math.round((draft.scoreGdm + draft.scoreConsistency) * 1.667);
        }

        // --- Horizon Category Mapping ---
        if (draft.scoreTotal >= 80) draft.scoreCategory = 'ELITE';
        else if (draft.scoreTotal >= 50) draft.scoreCategory = 'COMERCIAL';
        else draft.scoreCategory = 'DESCARTE';

        // --- Forecast Calculations ---
        if (draft.currentWeight !== null && draft.currentGdm !== null && draft.currentGdm > 0) {
            const remainingDeficit = settings.targetWeight - draft.currentWeight;
            if (remainingDeficit > 0) {
                draft.daysToTarget = Math.ceil(remainingDeficit / draft.currentGdm);
            } else {
                draft.daysToTarget = 0;
            }
        }

        // --- Alerts ---
        draft.alertRed = false;
        draft.alertYellow = false;

        const latestTacto = draft.eventos.find(e => e.type.toUpperCase().includes('TACTO'));
        let isAnestro = false;
        if (latestTacto) {
            const tactoType = latestTacto.type.toUpperCase();
            if (tactoType.includes('TACTO 1') || tactoType.includes('TACTO 2')) {
                if (draft.reproductiveState && draft.reproductiveState.toUpperCase().includes('ANESTRO')) {
                    isAnestro = true;
                }
            }
        }

        if (draft.currentGdm !== null && (draft.currentGdm < 0 || draft.currentGdm < settings.gdmMin)) {
            draft.alertRed = true;
        } else if (isAnestro && draft.currentWeight !== null && draft.currentWeight >= settings.targetWeight) {
            draft.alertRed = true;
        }

        const simulationsPastWindow = settings.iatfWindowStart && globalMaxTime > settings.iatfWindowStart.getTime();
        if (settings.iatfWindowStart && !simulationsPastWindow && draft.daysToTarget !== null && draft.daysToTarget > 0) {
            const projectedDate = new Date(globalMaxTime);
            projectedDate.setDate(projectedDate.getDate() + draft.daysToTarget);
            if (projectedDate.getTime() > settings.iatfWindowStart.getTime()) {
                if (!draft.alertRed) draft.alertYellow = true;
            }
        }
    }

    // Return the packaged DashboardData structure
    return {
        animals: draftAnimals,
        availableSnapshots: availableSnapshots,
        anomalies: anomalies,
        dataMaxDate: globalMaxTime > 0 ? new Date(globalMaxTime) : null
    };
}
