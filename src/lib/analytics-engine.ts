import { ProcessedAnimal } from '@/types';

export interface SireAnalytics {
    padre: string;
    totalHijas: number;
    hijasConAnestroHistorial: number;
    porcentajeAnestro: number;
    hijasPrenadas: number;
    porcentajePrenadas: number;
    gdmPromedio: number;
    pesoPromedio: number;
    totalBiomasa: number; // Suma total de los kilos
}

/**
 * Calculates Genetic Performance metrics for each Sire.
 */
export function calculateSireAnalytics(animals: ProcessedAnimal[]): SireAnalytics[] {
    const sireMap = new Map<string, {
        total: number;
        anestroHistorial: number;
        prenadasFinal: number;
        sumGdm: number;
        countGdm: number;
        sumPeso: number;
        countPeso: number;
        seenIdes: Set<string>;
    }>();

    for (const an of animals) {
        if (!an.isActive) continue;

        const padre = an.padre || 'Otros Toros';
        if (!sireMap.has(padre)) {
            sireMap.set(padre, { total: 0, anestroHistorial: 0, prenadasFinal: 0, sumGdm: 0, countGdm: 0, sumPeso: 0, countPeso: 0, seenIdes: new Set<string>() });
        }

        const stats = sireMap.get(padre)!;

        // Deduplicación estricta por IDE: Si la vaca ya fue contabilizada para este toro, la ignoramos para no inflar la biomasa
        if (stats.seenIdes.has(an.ide)) continue;
        stats.seenIdes.add(an.ide);

        stats.total++;

        // 1. Historial de Anestro (AS/AP affected at least once)
        const hadAnestro = an.eventos.some(
            (e) => e.reproductiveState && (e.reproductiveState.toUpperCase() === 'AS' || e.reproductiveState.toUpperCase() === 'AP')
        );
        if (hadAnestro) {
            stats.anestroHistorial++;
        }

        // 2. Resultado Final (Preñada) based on the LATEST reproductive state
        if (an.reproductiveState) {
            const s = an.reproductiveState.toUpperCase();
            if (s.includes('PRENADA') || s.includes('PREÑADA') || s.includes('P IATF')) {
                stats.prenadasFinal++;
            }
        }
        // 3. Eficiencia GDM Accumulator
        if (an.currentGdm !== null) {
            stats.sumGdm += an.currentGdm;
            stats.countGdm++;
        }

        // 4. Peso Promedio Accumulator
        if (an.currentWeight !== null) {
            stats.sumPeso += an.currentWeight;
            stats.countPeso++;
        }
    }

    // Convert to array and calculate percentages
    const results: SireAnalytics[] = Array.from(sireMap.entries()).map(([padre, stats]) => {
        return {
            padre,
            totalHijas: stats.total,
            hijasConAnestroHistorial: stats.anestroHistorial,
            porcentajeAnestro: stats.total > 0 ? (stats.anestroHistorial / stats.total) * 100 : 0,
            hijasPrenadas: stats.prenadasFinal,
            porcentajePrenadas: stats.total > 0 ? (stats.prenadasFinal / stats.total) * 100 : 0,
            gdmPromedio: stats.countGdm > 0 ? stats.sumGdm / stats.countGdm : 0,
            pesoPromedio: stats.countPeso > 0 ? stats.sumPeso / stats.countPeso : 0,
            totalBiomasa: stats.sumPeso,
        };
    });

    // Sort by Total Daughters (Volume), then by Pregnancy %
    results.sort((a, b) => b.totalHijas - a.totalHijas || b.porcentajePrenadas - a.porcentajePrenadas);

    return results;
}

export interface EvolutionTransition {
    ide: string;
    startState: string;
    endState: string;
}

export interface EvolutionMetrics {
    totalAnalyzed: number;
    recoveredCount: number; // Moved from Anestro to Pregnant/Cycling
    lostCount: number;      // Moved from Cycling/Good to Anestro/Empty
    maintainedGood: number; // Stayed Good
    maintainedBad: number;  // Stayed Bad (Anestro)
    recoveryRate: number;   // (recoveredCount / initialBadCount) * 100
    initialDetails: {
        as: number;
        ap: number;
        noApta: number;
        ciclando: number;
        prenadas: number; // Includes P IATF, NATURAL, etc
    };
    details: {
        recovered: EvolutionTransition[];
        lost: EvolutionTransition[];
        maintainedGood: EvolutionTransition[];
        maintainedBad: EvolutionTransition[];
    };
    specificTransitions: {
        asToPrenada: number;
        apToPrenada: number;
        ciclandoToAnestro: number;
    };
}

export interface EvolutionPhase {
    keyword: string;
    eventNumber?: number;
}

/**
 * Tracks transition between two specific tacto events.
 */
function getEventState(animal: ProcessedAnimal, phase: EvolutionPhase): { bucket: 'GOOD' | 'BAD' | null, rawState: string } {
    const ev = animal.eventos.find(e => {
        if (!e.type.toUpperCase().includes(phase.keyword)) return false;
        if (phase.eventNumber !== undefined && e.eventNumber !== phase.eventNumber) return false;
        return true;
    });

    if (!ev) return { bucket: null, rawState: '' };

    const state = (ev.reproductiveState || '').toUpperCase().trim();
    if (state === 'AS' || state === 'AP' || state === 'NO APTA') return { bucket: 'BAD', rawState: state };

    if (ev.serviceType && ev.serviceType.trim() !== '') return { bucket: 'GOOD', rawState: 'PREÑADA' };
    if (state.includes('CICLANDO')) return { bucket: 'GOOD', rawState: 'CICLANDO' };
    if (state.includes('PRENADA') || state.includes('PREÑADA') || state.includes('P IATF')) return { bucket: 'GOOD', rawState: 'PREÑADA' };

    if (phase.keyword.includes('IATF') && state === '') return { bucket: 'BAD', rawState: 'VACIA' };

    return { bucket: null, rawState: state };
}

/**
 * Gets final Service/Diagnosis result. According to user specs, "FINAL" success is determined
 * by whether they successfully registered a "Tipo de Servicio" (Natural, Artificial, Embryo).
 */
function getFinalState(animal: ProcessedAnimal): { bucket: 'GOOD' | 'BAD' | null, rawState: string } {
    const ev = animal.eventos.find(e => e.type.toUpperCase().includes('IATF') || e.type.toUpperCase().includes('SERVICIO'));

    if (ev) {
        if (ev.serviceType && ev.serviceType.trim() !== '') return { bucket: 'GOOD', rawState: 'PREÑADA' };
        if (ev.type.toUpperCase().includes('IATF')) return { bucket: 'BAD', rawState: 'VACIA' };
    }

    if (animal.reproductiveState) {
        const s = animal.reproductiveState.toUpperCase().trim();
        if (s.includes('PRENADA') || s.includes('PREÑADA') || s.includes('P IATF')) return { bucket: 'GOOD', rawState: 'PREÑADA' };
        if (s === 'AS' || s === 'AP' || s === 'NO APTA' || s.includes('VACIA')) return { bucket: 'BAD', rawState: s };
    }

    return { bucket: null, rawState: '' };
}

export function calculateEvolution(animals: ProcessedAnimal[], fromPhase: EvolutionPhase, toPhase: EvolutionPhase | 'FINAL'): EvolutionMetrics {
    let initialBadCount = 0;
    let metrics: EvolutionMetrics = {
        totalAnalyzed: 0,
        recoveredCount: 0,
        lostCount: 0,
        maintainedGood: 0,
        maintainedBad: 0,
        recoveryRate: 0,
        initialDetails: { as: 0, ap: 0, noApta: 0, ciclando: 0, prenadas: 0 },
        details: { recovered: [], lost: [], maintainedGood: [], maintainedBad: [] },
        specificTransitions: { asToPrenada: 0, apToPrenada: 0, ciclandoToAnestro: 0 }
    };

    for (const an of animals) {
        if (!an.isActive) continue;

        const startInfo = getEventState(an, fromPhase);
        const endInfo = toPhase === 'FINAL' ? getFinalState(an) : getEventState(an, toPhase);

        const startState = startInfo.bucket;
        const endState = endInfo.bucket;

        // Only measure cows that have BOTH data points in their timeline
        if (startState && endState) {
            metrics.totalAnalyzed++;

            // Log Initial Details
            const rawStart = startInfo.rawState || 'S/D';
            const rawEnd = endInfo.rawState || 'S/D';

            if (rawStart.includes('SUPERFICIAL') || rawStart === 'AS') metrics.initialDetails.as++;
            else if (rawStart.includes('PROFUNDO') || rawStart === 'AP') metrics.initialDetails.ap++;
            else if (rawStart.includes('NO APTA')) metrics.initialDetails.noApta++;
            else if (rawStart.includes('CICLANDO')) metrics.initialDetails.ciclando++;
            else if (rawStart.includes('PRENADA') || rawStart.includes('PREÑADA')) metrics.initialDetails.prenadas++;

            if (startState === 'BAD') initialBadCount++;

            const trans: EvolutionTransition = { ide: an.ide, startState: rawStart, endState: rawEnd };

            if (startState === 'BAD' && endState === 'GOOD') {
                metrics.recoveredCount++;
                metrics.details.recovered.push(trans);

                // Specific Check: AS -> Preñada
                if ((rawStart === 'AS' || rawStart.includes('SUPERFICIAL')) && (rawEnd.includes('PRENADA') || rawEnd.includes('PREÑADA'))) {
                    metrics.specificTransitions.asToPrenada++;
                }
                // Specific Check: AP -> Preñada
                if ((rawStart === 'AP' || rawStart.includes('PROFUNDO')) && (rawEnd.includes('PRENADA') || rawEnd.includes('PREÑADA'))) {
                    metrics.specificTransitions.apToPrenada++;
                }

            }
            else if (startState === 'GOOD' && endState === 'BAD') {
                metrics.lostCount++;
                metrics.details.lost.push(trans);

                // Specific Check: Ciclando -> Anestro (AS/AP)
                if (rawStart.includes('CICLANDO') && (rawEnd === 'AS' || rawEnd === 'AP' || rawEnd.includes('SUPERFICIAL') || rawEnd.includes('PROFUNDO'))) {
                    metrics.specificTransitions.ciclandoToAnestro++;
                }

            }
            else if (startState === 'GOOD' && endState === 'GOOD') {
                metrics.maintainedGood++;
                metrics.details.maintainedGood.push(trans);
            }
            else if (startState === 'BAD' && endState === 'BAD') {
                metrics.maintainedBad++;
                metrics.details.maintainedBad.push(trans);
            }
        }
    }

    if (initialBadCount > 0) {
        metrics.recoveryRate = (metrics.recoveredCount / initialBadCount) * 100;
    }

    return metrics;
}

// --- PROJECTIVE ANALYTICS ---

export interface ForecastMetrics {
    totalEligible: number;
    projectedReady: number;      // Will reach 300kg before IATF Date
    projectedDelayed: number;    // Will reach 300kg after IATF Date but before cycle end
    projectedDanger: number;     // Mathematically impossible or negative GDM
    averageProjectedWeight: number;
    scatterData: { ide: string; weight: number; preñada: boolean; gdm: number }[]; // For Scatter Plot
}

/**
 * Calculates the projected weight of each animal at the exact start date of the IATF Window.
 * Uses current GDM (Velocidad de Caja) and respects the mathematical bounds.
 */
export function calculateReproductiveForecast(
    animals: ProcessedAnimal[],
    iatfStartDate: Date | null,
    targetWeight: number = 300,
    currentSnapshotDate: Date | null = null
): ForecastMetrics {

    const metrics: ForecastMetrics = {
        totalEligible: 0,
        projectedReady: 0,
        projectedDelayed: 0,
        projectedDanger: 0,
        averageProjectedWeight: 0,
        scatterData: []
    };

    if (!iatfStartDate) return metrics;

    // Determine the "Current" date for calculation. 
    // If we are in the Time Machine (Snapshot), "today" is the snapshot date. 
    // Otherwise, "today" is the absolute present.
    const today = currentSnapshotDate || new Date();
    const daysUntilIatf = (iatfStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    let sumProjectedWeight = 0;

    for (const an of animals) {
        if (!an.isActive || an.currentWeight === null || an.currentGdm === null) continue;
        metrics.totalEligible++;

        // 1. Calculate Projected Weight
        let projectedWeight = an.currentWeight;

        // Only project forward if the IATF date is in the future relative to our current temporal position
        if (daysUntilIatf > 0) {
            projectedWeight += (an.currentGdm * daysUntilIatf);
        }

        sumProjectedWeight += projectedWeight;

        // 2. Bucketing Logic
        if (an.currentGdm < 0) {
            // Losing weight is an automatic Danger
            metrics.projectedDanger++;
        } else if (projectedWeight >= targetWeight) {
            metrics.projectedReady++;
        } else if (an.daysToTarget !== null) {
            // Will she eventually reach it before the end of the reproductive cycle? (Say, 60 days buffer max)
            const daysMissed = an.daysToTarget - daysUntilIatf;
            if (daysMissed <= 60) {
                metrics.projectedDelayed++;
            } else {
                metrics.projectedDanger++; // Too far behind
            }
        }

        // 3. Scatter Plot Data Generation (Empirical Evidence)
        // We plot the *actual* Service Weight against the *final* reproductive result.
        // If we are in the present, this shows past performance.
        const isPrenada = an.reproductiveState ? (an.reproductiveState.toUpperCase().includes('PREÑADA') || an.reproductiveState.toUpperCase().includes('PRENADA')) : false;

        // Find the weight closest to the IATF event for empirical plotting
        let serviceWeight = an.currentWeight;
        const iatfEvent = an.eventos.find(e => e.type.toUpperCase().includes('IATF') || e.type.toUpperCase().includes('SERVICIO'));
        if (iatfEvent && iatfEvent.weight !== null) {
            serviceWeight = iatfEvent.weight;
        }

        metrics.scatterData.push({
            ide: an.ide,
            weight: serviceWeight, // Empirical Weight at service moment
            preñada: isPrenada,
            gdm: an.currentGdm
        });
    }

    if (metrics.totalEligible > 0) {
        metrics.averageProjectedWeight = sumProjectedWeight / metrics.totalEligible;
    }

    return metrics;
}
