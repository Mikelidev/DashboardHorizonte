const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const animalesPath = path.join(__dirname, '../Ficha Animales.csv');
const eventosPath = path.join(__dirname, '../Eventos.csv');

const animales = Papa.parse(fs.readFileSync(animalesPath, 'utf8'), { header: true }).data;
const eventos = Papa.parse(fs.readFileSync(eventosPath, 'utf8'), { header: true }).data;

let sumPesoOtros = 0;
let numOtros = 0;
const idePeso = new Map();

for (const ev of eventos) {
    if (ev.Peso && ev.Peso.trim() !== '' && ev.Peso.trim().toUpperCase() !== 'NO INFO') {
        const peso = parseFloat(ev.Peso.replace(',', '.'));
        if (!isNaN(peso)) idePeso.set(ev.IDE, peso); // Last seen peso chronologically usually
    }
}

for (const an of animales) {
    let padreStr = an.Padre;
    if (!padreStr || padreStr.trim().toUpperCase() === 'NO INFO' || padreStr.trim() === '') {
        padreStr = 'Otros Toros';
    }

    if (padreStr === 'Otros Toros' && idePeso.has(an.IDE)) {
        sumPesoOtros += idePeso.get(an.IDE);
        numOtros++;
    }
}

console.log("Total Animales 'Otros Toros' con peso:", numOtros);
console.log("Suma Total (Biomasa):", sumPesoOtros, "kg");
console.log("Peso promedio:", sumPesoOtros / numOtros);
