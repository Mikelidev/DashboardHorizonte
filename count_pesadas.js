const Papa = require('papaparse');
const animalesUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=475126614&single=true&output=csv';
const eventosUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=1315331914&single=true&output=csv';

async function fetchCsv(url) {
    const response = await fetch(url);
    const text = await response.text();
    return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

async function analyze() {
    const eventos = await fetchCsv(eventosUrl);
    let pesadas = eventos.filter(e => e.Evento && e.Evento.toUpperCase().includes('PESADA'));

    let counts = {};
    pesadas.forEach(e => {
        let n = e['N° Evento'];
        if (!counts[n]) counts[n] = 0;
        counts[n]++;
    });

    console.log("Distribution of Weigh-ins by N° Evento:", counts);
}
analyze();
