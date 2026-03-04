const https = require('https');
const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=1315331914&single=true&output=csv';

https.get(url, (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
        console.log("Primeros 1000 caracteres de Eventos.csv:");
        console.log(data.substring(0, 1000));
    });
});
