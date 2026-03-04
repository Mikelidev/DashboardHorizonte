const Papa = require('papaparse');

const animalesUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=475126614&single=true&output=csv';
const eventosUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=1315331914&single=true&output=csv';

async function fetchCsv(url) {
    const response = await fetch(url);
    const text = await response.text();
    return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    return new Date(dateStr);
}

async function analyzeWeighIn() {
    const animales = await fetchCsv(animalesUrl);
    const eventos = await fetchCsv(eventosUrl);

    // Filter Pesada events
    let pesadaEvents = eventos.filter(e => e.Evento && e.Evento.toUpperCase().includes('PESADA'));

    // Find the latest Pesada number
    let maxPesadaNum = 0;
    let eventsByNum = {};
    pesadaEvents.forEach(e => {
        let num = parseInt(e['N° Evento'], 10);
        if (!isNaN(num)) {
            if (num > maxPesadaNum) maxPesadaNum = num;
            if (!eventsByNum[num]) eventsByNum[num] = [];
            eventsByNum[num].push(e);
        }
    });

    console.log("Máximo N° Evento de Pesada:", maxPesadaNum);

    const latestPesadaEvents = eventsByNum[maxPesadaNum] || [];

    // Sometimes the user doesn't use "N° Evento" strictly, let's also check by Date if needed
    // But let's assume maxPesadaNum is correct for now based on previous talks
    const weighedIdesSet = new Set(latestPesadaEvents.map(e => e.IDE));
    const allIdesSet = new Set(animales.map(a => a.IDE));

    console.log(`Cabezas en Inventario Total: ${allIdesSet.size}`);
    console.log(`Pesadas en Pesada N° ${maxPesadaNum}: ${weighedIdesSet.size}`);
    console.log(`Cabezas omitidas: ${allIdesSet.size - weighedIdesSet.size}`);

    // If "Pesada N-1" doesn't strictly exist by number, we just look at the 'most recent weight' before the max pesada date.
    // To be perfectly accurate, let's find the PREVIOUS weight for each cow, regardless of N° Evento

    // Sort all pesadas by date
    pesadaEvents.sort((a, b) => parseDate(b.Fecha) - parseDate(a.Fecha));

    let statsWeighed = { ageDeltasSum: 0, ageCount: 0, prevWeightSum: 0, prevWeightCount: 0, emptyCount: 0, total: 0 };
    let statsOmitted = { ageDeltasSum: 0, ageCount: 0, prevWeightSum: 0, prevWeightCount: 0, emptyCount: 0, total: 0 };

    const today = new Date('2024-11-01');

    animales.forEach(a => {
        const isWeighed = weighedIdesSet.has(a.IDE);
        const stats = isWeighed ? statsWeighed : statsOmitted;
        stats.total++;

        // 1. Age
        let birth = parseDate(a.Nacimiento);
        if (birth && !isNaN(birth)) {
            let daysOld = (today - birth) / (1000 * 60 * 60 * 24);
            stats.ageDeltasSum += daysOld;
            stats.ageCount++;
        }

        // 2. Previous Weight (Find the first valid weight event for this cow that is NOT in the latest batch)
        const myEvs = pesadaEvents.filter(e => e.IDE === a.IDE);
        // If it was weighed this time, its previous weight is the 2nd event. If omitted, its previous weight is the 1st event.
        let prevEv = null;
        if (isWeighed) {
            prevEv = myEvs.find(e => parseInt(e['N° Evento'], 10) < maxPesadaNum && e.Peso && e.Peso.trim() !== 'NO INFO');
        } else {
            prevEv = myEvs.find(e => e.Peso && e.Peso.trim() !== 'NO INFO');
        }

        if (prevEv) {
            let w = parseFloat(prevEv.Peso.replace(',', '.'));
            if (!isNaN(w)) {
                stats.prevWeightSum += w;
                stats.prevWeightCount++;
            }
        }

        // 3. Reproductive State at that time
        // Let's just check if they are generally "VACIA" or "AP" or "AS" in any of their recent tactos
        const animalEvents = eventos.filter(e => e.IDE === a.IDE);
        const hasBadState = animalEvents.some(e => {
            const state = (e['Estado reproductivo'] || '').toUpperCase();
            return state === 'AS' || state === 'AP' || state.includes('VACIA');
        });
        if (hasBadState) stats.emptyCount++;
    });

    console.log("\n--- ANÁLISIS DEL GRUPO QUE **SÍ** SE PESÓ ---");
    console.log("Cantidad:", statsWeighed.total);
    console.log("Edad Promedio:", statsWeighed.ageCount > 0 ? Math.round(statsWeighed.ageDeltasSum / statsWeighed.ageCount / 30.4) + ' meses' : 'N/A');
    console.log(`Peso Promedio PREVIO:`, statsWeighed.prevWeightCount > 0 ? (statsWeighed.prevWeightSum / statsWeighed.prevWeightCount).toFixed(1) + ' kg' : 'N/A');
    console.log(`Porcentaje con historial de Anestro/Vacía:`, Math.round((statsWeighed.emptyCount / statsWeighed.total) * 100) + '%');

    console.log("\n--- ANÁLISIS DEL GRUPO **OMITIDO** ---");
    console.log("Cantidad:", statsOmitted.total);
    console.log("Edad Promedio:", statsOmitted.ageCount > 0 ? Math.round(statsOmitted.ageDeltasSum / statsOmitted.ageCount / 30.4) + ' meses' : 'N/A');
    console.log(`Peso Promedio PREVIO:`, statsOmitted.prevWeightCount > 0 ? (statsOmitted.prevWeightSum / statsOmitted.prevWeightCount).toFixed(1) + ' kg' : 'N/A');
    console.log(`Porcentaje con historial de Anestro/Vacía:`, Math.round((statsOmitted.emptyCount / statsOmitted.total) * 100) + '%');

}

analyzeWeighIn();
