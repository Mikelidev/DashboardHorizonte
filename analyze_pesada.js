const https = require('https');
const Papa = require('papaparse');

const animalesUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=475126614&single=true&output=csv';
const eventosUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=1315331914&single=true&output=csv';

function fetchCsv(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let rawData = '';
            resp.on('data', (chunk) => { rawData += chunk; });
            resp.on('end', () => {
                const parsed = Papa.parse(rawData, { header: true, skipEmptyLines: true }).data;
                resolve(parsed);
            });
        }).on("error", reject);
    });
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

    // 1. Encontrar la "Última Pesada" a nivel global (identificar la fecha/evento más reciente de tipo Pesada)
    // o simplemente segmentar por el número de evento de pesada más alto.
    let pesadaEvents = eventos.filter(e => e.Evento && e.Evento.toUpperCase().includes('PESADA'));

    // Identificar el máximo N° Evento para Pesadas
    let maxPesadaNum = 0;
    pesadaEvents.forEach(e => {
        let num = parseInt(e['N° Evento'], 10);
        if (!isNaN(num) && num > maxPesadaNum) maxPesadaNum = num;
    });

    console.log("Máximo N° de Pesada histórico registrado:", maxPesadaNum);

    const latestPesadaEvents = pesadaEvents.filter(e => parseInt(e['N° Evento'], 10) === maxPesadaNum);
    const previousPesadaEvents = pesadaEvents.filter(e => parseInt(e['N° Evento'], 10) === (maxPesadaNum - 1));

    const weighedIdes = new Set(latestPesadaEvents.map(e => e.IDE));

    // 2. Analizar el Inventario Activo (IDEs que existen biológicamente en el campo y no están dados de baja)
    // Asumimos que si están en Ficha Animales están activos para este análisis simplificado
    const allIdes = new Set(animales.map(a => a.IDE));

    console.log(`Total Inventario: ${allIdes.size} cabezas.`);
    console.log(`Cabezas Pesadas en la última instancia (Pesada ${maxPesadaNum}): ${weighedIdes.size}`);
    console.log(`Cabezas omitidas en la última pesada: ${allIdes.size - weighedIdes.size}`);

    // 3. Cruzar datos: ¿Qué tienen de especial las que se pesaron vs las que NO se pesaron?
    // Grupo A: Pesadas
    // Grupo B: Omitidas

    let statsWeighed = { ageDeltasSum: 0, ageCount: 0, prevWeightSum: 0, prevWeightCount: 0, anestroCount: 0 };
    let statsOmitted = { ageDeltasSum: 0, ageCount: 0, prevWeightSum: 0, prevWeightCount: 0, anestroCount: 0 };

    const today = new Date('2024-11-01'); // approx present for age

    animales.forEach(a => {
        const isWeighed = weighedIdes.has(a.IDE);
        const stats = isWeighed ? statsWeighed : statsOmitted;

        // Age analysis
        let birth = parseDate(a.Nacimiento);
        if (birth && !isNaN(birth)) {
            let daysOld = (today - birth) / (1000 * 60 * 60 * 24);
            stats.ageDeltasSum += daysOld;
            stats.ageCount++;
        }

        // Previous Weight Analysis (How heavy were they in Pesada N-1?)
        const prevEv = previousPesadaEvents.find(e => e.IDE === a.IDE);
        if (prevEv && prevEv.Peso && prevEv.Peso.toUpperCase() !== 'NO INFO') {
            let w = parseFloat(prevEv.Peso.replace(',', '.'));
            if (!isNaN(w)) {
                stats.prevWeightSum += w;
                stats.prevWeightCount++;
            }
        }
    });

    console.log("\n--- ANÁLISIS DEL GRUPO QUE **SÍ** SE PESÓ ---");
    console.log("Edad Promedio (Días):", statsWeighed.ageCount > 0 ? (statsWeighed.ageDeltasSum / statsWeighed.ageCount).toFixed(1) : 'N/A');
    console.log(`Peso Promedio PREVIO (Pesada ${maxPesadaNum - 1}):`, statsWeighed.prevWeightCount > 0 ? (statsWeighed.prevWeightSum / statsWeighed.prevWeightCount).toFixed(1) + ' kg' : 'N/A');

    console.log("\n--- ANÁLISIS DEL GRUPO **OMITIDO** ---");
    console.log("Edad Promedio (Días):", statsOmitted.ageCount > 0 ? (statsOmitted.ageDeltasSum / statsOmitted.ageCount).toFixed(1) : 'N/A');
    console.log(`Peso Promedio PREVIO (Pesada ${maxPesadaNum - 1}):`, statsOmitted.prevWeightCount > 0 ? (statsOmitted.prevWeightSum / statsOmitted.prevWeightCount).toFixed(1) + ' kg' : 'N/A');

}

analyzeWeighIn();
