const https = require('https');

function fetchUrl(url) {
    https.get(url, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log('Redirecting to:', res.headers.location);
            fetchUrl(res.headers.location);
            return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log('DATA HEADERS:', data.split('\n')[0]));
    });
}

fetchUrl('https://docs.google.com/spreadsheets/d/e/2PACX-1vRD5Ks4bitU0mHkvsE0WhM6sQvuZkBipgBwbaQW0D5EbgLfJ8uGvSnognmQQ2sQmw/pub?gid=475126614&single=true&output=csv');
