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
 * Calculates Z-Score of the recent GDM vs the herd mean/stddev.
 */
function computeGdmZScore(gdm: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (gdm - mean) / stdDev;
}

/**
 * Transforms Z-score into a 0-40 scale.
 * Assuming Z-score mostly falls between -3 and +3.
 * We'll map Z = -2 to 0 pts, Z = +2 to 40 pts, bounded.
 */
function scaleGdmScore(zScore: number): number {
    // Map [-2, 2] to [0, 40]
    const base = ((zScore + 2) / 4) * 40;
    return Math.max(0, Math.min(40, base));
}

export function processDashboardData(
    animalesCsvString: string,
    eventosCsvString: string,
    settings: ThresholdSettings,
    cutoffDate: Date | null = null
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
                // Ignore invalid or empty dates
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
        // If a temporal snapshot is selected, pretend any event after that date never happened
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

        // Push ALL events, even those with missing dates (which fall back to Date(0)).
        // This ensures critical state/service flags (like 'Transferencia de embrión' in a dateless Tacto) are not lost.
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

    // Define what "recent" means (e.g., within the last year of the global max time)
    // For safety with delayed cattle weigh-ins, we use a 365-day threshold before auto-archiving them as "Inactive".
    const RECENT_THRESHOLD_MS = 365 * 24 * 60 * 60 * 1000;

    // 3. First pass over animals to calculate raw state and gather herd stats
    const draftAnimals: ProcessedAnimal[] = [];
    let sumGdm = 0;
    let countGdm = 0;

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

        // Infer TE from Padre if the text explicitly says 'Esteco' in a heavily managed TE herd
        // Usually 'TE' is written in the service column, but we guard against missing data
        if (!masterServiceStr && padreStr.toUpperCase().includes('ESTECO')) {
            // masterServiceStr = 'TE'; // Optional aggressive inference. Waiting for explicit column match first.
        }

        const animalEvents = eventsByIde[an.IDE] || [];

        // -------------------------------------------------------------------------------------------------
        // 1. EXTRACT WEIGHT, GDM & CASH VELOCITY (Delta GDM) STRICTLY CHRONOLOGICALLY
        // -------------------------------------------------------------------------------------------------
        // Copy the array and sort purely by absolute Date (most recent first)
        const chronoEvents = [...animalEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

        let currentWeight: number | null = null;
        let currentGdm: number | null = null;
        let previousGdm: number | null = null;

        for (const ev of chronoEvents) {
            // Find the most recent valid Weight and GDM
            if (currentWeight === null && ev.weight !== null) currentWeight = ev.weight;

            if (currentGdm === null && ev.gdm !== null) {
                currentGdm = ev.gdm;
            } else if (currentGdm !== null && previousGdm === null && ev.gdm !== null) {
                // Find the GDM from the weighing BEFORE the current one
                previousGdm = ev.gdm;
            }

            if (currentWeight !== null && currentGdm !== null && previousGdm !== null) break;
        }

        // Calculate Delta GDM (Velocidad de Caja) only if we have two historical data points
        let deltaGdm: number | null = null;
        if (currentGdm !== null && previousGdm !== null) {
            deltaGdm = currentGdm - previousGdm;
        }

        // Calculate PDE (Peso por Día de Edad) only if we have a valid Birth Date and Current Weight
        let pde: number | null = null;
        if (birthDate && currentWeight !== null) {
            // Find the date of the most recent weight event to calculate exact days alive at that moment
            const weightEvent = chronoEvents.find(e => e.weight !== null);
            if (weightEvent && weightEvent.date.getTime() > birthDate.getTime()) {
                const daysAlive = (weightEvent.date.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysAlive > 0) {
                    // Assume standard birth weight of 30kg for precision
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

            // GDM Anomalies
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

        // Phantom check (Has reached ending weight but skipped the reproduction cycle)
        if (currentWeight !== null && currentWeight > 310 && !hasTact2OrIatf) {
            anomalies.push({ ide: an.IDE, category: "Faltantes operativos", desc: `Fantasma Operativo: Registra buen peso (${currentWeight} kg) pero no ingresó a Tacto 2 ni IATF.`, location: `Falta evento reproductivo`, cause: "Saltó la manga o perdió caravana (chip ilegible)." });
        }
        // --- END ANOMALY AUDIT ---

        // -------------------------------------------------------------------------------------------------
        // 2. ASSIGN PROTOCOL SCORES FOR BIOLOGICAL TIMELINE (Tactos are ultimate phase)
        // -------------------------------------------------------------------------------------------------

        // Helper to assign a biological priority to events, immunizing the system against Excel date typos.
        // Tacto IATF/Servicios is the ultimate final event. Tacto Anestro 2 comes before. Tacto Anestro 1 before that.
        const getPhaseScore = (type: string, number: number) => {
            const t = type.toUpperCase();
            if (t.includes('IATF') || t.includes('SERVICIO') || t.includes('DIAGNOS')) return 100;
            if (t.includes('TACTO ANESTRO') || t.includes('TACTO')) {
                return 50 + number; // N° 2 beats N° 1
            }
            return 0;
        };

        // Sort events by Protocol sequence first (Highest score = Most Recent Phase)
        // If tied in the exact same phase, fallback to chronological Date.
        animalEvents.sort((a, b) => {
            const scoreA = getPhaseScore(a.type, a.eventNumber);
            const scoreB = getPhaseScore(b.type, b.eventNumber);

            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            return b.date.getTime() - a.date.getTime();
        });

        // Is active? If she has any recorded events, she's fundamentally active.
        let isActive = animalEvents.length > 0;

        // User Rule: If the LAST recorded event in the cow's timeline is a "Pesada" with NO INFO in both Peso and GDM, she is dead/sold -> Inactive
        // BUGFIX: We must check ALL events on the absolute latest date. If she had an empty Pesada AND a Tacto on the same day, she is still active.
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

        // Search for the latest valid Reproductive state, prioritizing "Tipo de Servicio" for IATF
        let reproState = null;
        let isApta = false;

        for (const ev of animalEvents) {
            const evType = ev.type.toUpperCase();

            // 1. FINAL VERDICT: Tacto IATF
            if (evType.includes('IATF')) {
                // ANY text in "Tipo de Servicio" means Pregnant
                if (ev.serviceType && ev.serviceType.trim() !== '') {
                    reproState = 'PREÑADA';
                } else {
                    // Blank means Empty
                    reproState = 'VACIA';
                }
                break; // Stop looking, this is the ultimate verdict
            }

            // 2. PRE-VERDICT: Tacto Anestro 1 & 2
            if (evType.includes('TACTO ANESTRO') || evType.includes('TACTO 1') || evType.includes('TACTO 2')) {
                const repStr = (ev.reproductiveState || '').trim().toUpperCase();

                if (repStr.includes('PREÑADA') || repStr.includes('PRENADA')) {
                    // USER RULE: Early Natural Pregnancy detected in a Tacto Anestro counts as 'PREÑADA' for the current state snapshot
                    reproState = 'PREÑADA';
                    masterServiceStr = 'NATURAL'; // Explicit natural service
                    isApta = true;
                    break;
                } else if (repStr === 'AS' || repStr === 'AP' || repStr === 'NO APTA') {
                    // Definitely not apt
                    reproState = 'ANESTRO';
                    isApta = false;
                    break;
                } else if (repStr.includes('CICLANDO')) {
                    // She is active ("Apta"), but not pregnant yet. We keep looking for a final verdict.
                    reproState = 'CICLANDO';
                    isApta = true;
                    // Note: We DO NOT break here, because she might have a later service event
                } else if (repStr === '') {
                    // User Rule: If it's Tacto Anestro but has no explicit state, assume she's empty/anestro
                    reproState = 'VACIA';
                    break;
                }
            }

            // 3. FALLBACK: Catch Service outside of specific Tacto IATF event name (just in case)
            if (!reproState && ev.serviceType && ev.serviceType.trim() !== '') {
                reproState = 'PREÑADA';
                if (!evType.includes('IATF')) masterServiceStr = 'NATURAL';
                break;
            }
        }

        if (isActive && currentGdm !== null) {
            sumGdm += currentGdm;
            countGdm++;
        }

        draftAnimals.push({
            ide: an.IDE,
            raza: an.Raza || 'Desconocida', // Keeping for backwards UI compatibility
            padre: padreStr,
            masterServiceType: masterServiceStr || 'Desconocido', // Safely provide fallback
            birthDate,
            isActive,
            eventos: animalEvents,
            currentWeight,
            currentGdm,
            deltaGdm,
            pde,
            reproductiveState: reproState,
            isApta: isApta,

            scoreGdm: 0,
            scoreReproductive: 0,
            scoreConsistency: 0,
            scoreTotal: 0,
            scoreCategory: null,

            daysToTarget: null,
            alertRed: false,
            alertYellow: false
        });
    }

    // 4. Calculate Herd Statistics for active animals
    const meanGdm = countGdm > 0 ? (sumGdm / countGdm) : 0;

    // Calculate StdDev
    let sumSqDiff = 0;
    for (const draft of draftAnimals) {
        if (draft.isActive && draft.currentGdm !== null) {
            sumSqDiff += Math.pow(draft.currentGdm - meanGdm, 2);
        }
    }
    const stdDevGdm = countGdm > 1 ? Math.sqrt(sumSqDiff / (countGdm - 1)) : 0;

    // 5. Final scoring pass
    for (const draft of draftAnimals) {
        if (!draft.isActive) continue;

        // --- 40% Potencia (GDM) ---
        if (draft.currentGdm !== null) {
            const zScore = computeGdmZScore(draft.currentGdm, meanGdm, stdDevGdm);
            draft.scoreGdm = scaleGdmScore(zScore);
        } else {
            draft.scoreGdm = 0;
        }

        // --- 40% Reproductivo ---
        draft.scoreReproductive = 0;
        if (draft.reproductiveState) {
            const state = draft.reproductiveState.toUpperCase();
            // Preñada is 40pts.
            if (state.includes('PREÑADA')) draft.scoreReproductive = 40;
            // Ciclando is biologically good, but it's not a pregnancy. 32pts.
            else if (state.includes('CICLANDO')) draft.scoreReproductive = 32;
            else if (state.includes('ANESTRO SUPERFICIAL')) draft.scoreReproductive = 24; // 60% of 40 = 24 pts
            else if (state.includes('ANESTRO PROFUNDO') || state.includes('ANESTRO CON CRIA')) draft.scoreReproductive = 8; // 20% of 40 = 8 pts
        }

        // --- 20% Consistencia ---
        // Max 20 pts. Penetrate 10 pts per historical negative GDM.
        let historicalNegativeGdmCount = draft.eventos.filter(e => e.gdm !== null && e.gdm < 0).length;
        let consistencyPenalty = historicalNegativeGdmCount * 10;
        draft.scoreConsistency = Math.max(0, 20 - consistencyPenalty);

        draft.scoreTotal = Math.round(draft.scoreGdm + draft.scoreReproductive + draft.scoreConsistency);

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
                draft.daysToTarget = 0; // Already reached
            }
        }

        // --- Alerts ---
        draft.alertRed = false;
        draft.alertYellow = false;

        // Find the latest tacto to determine alerts related to Anestro prior to IATF
        const latestTacto = draft.eventos.find(e => e.type.toUpperCase().includes('TACTO'));

        if (latestTacto) {
            const tactoType = latestTacto.type.toUpperCase();

            // If it was Tacto 1 or Tacto 2 and the animal is in Anestro, issue a Warning (Yellow)
            // to allow the user to take action (hormones/nutrition) before making a final discard.
            if (tactoType.includes('TACTO 1') || tactoType.includes('TACTO 2')) {
                if (draft.reproductiveState && draft.reproductiveState.toUpperCase().includes('ANESTRO')) {
                    draft.alertYellow = true; // Still actionable before IATF
                }
            }
        }

        // Traditional Red Alerts (Only for truly critical failures like negative growth that require isolation)
        if (draft.currentGdm !== null && (draft.currentGdm < 0 || draft.currentGdm < settings.gdmMin)) {
            draft.alertRed = true;
        }

        // Traditional Yellow Alerts (Projecting past IATF Window)
        if (settings.iatfWindowStart && draft.daysToTarget !== null) {
            const projectedDate = new Date();
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
        anomalies: anomalies
    };
}
