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

async function run() {
    const animales = await fetchCsv(animalesUrl);
    const eventos = await fetchCsv(eventosUrl);

    let sumPesoOtros = 0;
    let numOtros = 0;
    const idePeso = new Map();

    for (const ev of eventos) {
        if (ev.Peso && ev.Peso.trim() !== '' && ev.Peso.trim().toUpperCase() !== 'NO INFO') {
            const peso = parseFloat(ev.Peso.replace(',', '.'));
            if (!isNaN(peso)) idePeso.set(ev.IDE, peso);
        }
    }

    let uniqueIdes = new Set();

    for (const an of animales) {
        if (!uniqueIdes.has(an.IDE)) {
            uniqueIdes.add(an.IDE);
            let padreStr = an.Padre;
            if (!padreStr || padreStr.trim().toUpperCase() === 'NO INFO' || padreStr.trim() === '') {
                padreStr = 'Otros Toros';
            }

            if (padreStr === 'Otros Toros' && idePeso.has(an.IDE)) {
                sumPesoOtros += idePeso.get(an.IDE);
                numOtros++;
            }
        }
    }

    console.log("Total Vacas Unicas en 'Otros Toros':", numOtros);
    console.log("Biomasa Exacta en vivo:", sumPesoOtros, "kg");
}

run();
