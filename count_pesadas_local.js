const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const eventosPath = path.join(__dirname, 'public', 'Eventos.csv');
const eventosCsv = fs.readFileSync(eventosPath, 'utf8');
const eventos = Papa.parse(eventosCsv, { header: true, skipEmptyLines: true }).data;

let pesadas = eventos.filter(e => e.Evento && e.Evento.toUpperCase().includes('PESADA'));
let counts = {};
pesadas.forEach(e => {
    let n = e['N° Evento'];
    if (!counts[n]) counts[n] = 0;
    counts[n]++;
});

console.log("Local CSV Distribution of Weigh-ins by N° Evento:", counts);
