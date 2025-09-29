/**
 * Vercel Serverless Function (Proxy) voor Baserow
 *
 * Deze functie beveiligt de Baserow Token en fungeert als een veilige
 * tussenpersoon tussen de Webflow frontend en de Baserow API.
 *
 * Configuratie vereist in Vercel Environment Variables:
 * - BASEROW_TOKEN: Uw Baserow Database Token
 * - BASEROW_HOST: De hostnaam (bijv. 'baserow.io')
 */
module.exports = async (req, res) => {
    // Lees beveiligde omgevingsvariabelen
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_HOST = process.env.BASEROW_HOST || 'baserow.io';
    // Uw vaste Tabel ID
    const BASEROW_TABLE_ID = '688701';

    // 1. Veiligheidscontrole: Is het token ingesteld?
    if (!BASEROW_TOKEN) {
        // Log de fout en geef een duidelijke melding aan de client
        console.error("Fout: BASEROW_TOKEN is niet geconfigureerd in Vercel.");
        res.status(500).json({
            error: "Baserow Token is niet geconfigureerd in Vercel omgevingsvariabelen."
        });
        return;
    }

    // Alleen GET-aanvragen zijn toegestaan
    if (req.method === 'OPTIONS') {
        // Preflight request voor CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(204).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Alleen GET-aanvragen zijn toegestaan.' });
        return;
    }

    // Haal de query parameters van de frontend op
    const { query } = require('url');
    const { pathname, search } = new URL(req.url, `https://${req.headers.host}`);

    // Bouw de Baserow API URL
    const baserowApiUrl = `https://${BASEROW_HOST}/api/database/rows/table/${BASEROW_TABLE_ID}/${search}&user_field_names=true`;

    try {
        const fetchResponse = await fetch(baserowApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${BASEROW_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        // Controleer of de API-aanroep succesvol was (status 200)
        if (!fetchResponse.ok) {
            // BELANGRIJK: Clone de response zodat we de body kunnen lezen voor foutdetails.
            const errorResponse = fetchResponse.clone();
            let errorDetails = `Baserow fout (HTTP ${fetchResponse.status})`;

            try {
                // Probeer de JSON-foutdetails van Baserow te lezen
                const errorJson = await errorResponse.json();
                errorDetails += `: ${JSON.stringify(errorJson)}`;
            } catch (e) {
                // Als het geen JSON is, lees dan de tekst
                const errorText = await errorResponse.text();
                errorDetails += `: ${errorText.substring(0, 100)}`; // Beperk de lengte
            }

            console.error(`Baserow API Fout: ${errorDetails}`);
            res.status(fetchResponse.status).json({
                error: `Serverfout (Baserow): ${errorDetails}`
            });
            return;
        }

        // Lees de data van Baserow en geef deze direct door
        const data = await fetchResponse.json();

        // Stuur de data terug naar de frontend met correcte CORS-headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(data);

    } catch (error) {
        console.error('Netwerkfout in Vercel Function:', error);
        res.status(500).json({
            error: `Serverfout (Netwerk/Code): ${error.message}`
        });
    }
};
