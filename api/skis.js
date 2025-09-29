// api/get-skis.js - Baserow Proxy
const fetch = require('node-fetch');

// Deze code draait op de Vercel server, waardoor de API-sleutel verborgen blijft.
// Wij gebruiken nu BASEROW_TOKEN, BASEROW_HOST en BASEROW_TABLE_ID
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_HOST = process.env.BASEROW_HOST || 'baserow.io'; // Standaard Baserow Cloud
// De Table ID die u heeft opgegeven, gebruikt als fallback.
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || '688701'; 

module.exports = async (req, res) => {
    // Stel CORS headers in om aanvragen vanuit elke oorsprong toe te staan.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Alleen GET is nodig voor data-ophalen
    // BELANGRIJKE FIX: Voeg 'Authorization' toe aan de toegestane headers voor de CORS preflight check.
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 

    // Behandel OPTIONS-aanvragen (preflight check)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Aangepast naar GET, wat standaard is voor het ophalen van data.
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Alleen GET-aanvragen zijn toegestaan.' });
    }

    if (!BASEROW_TOKEN) {
        return res.status(500).json({ 
            error: 'Baserow Token is niet geconfigureerd in Vercel omgevingsvariabelen.' 
        });
    }

    try {
        // Baserow API Endpoints voor het ophalen van alle rijen met leesbare veldnamen
        const url = `https://${BASEROW_HOST}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // Baserow gebruikt 'Token' in plaats van 'Bearer'
                'Authorization': `Token ${BASEROW_TOKEN}`,
                // Voeg Content-Type toe voor consistentie, ook al is het een GET
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) {
            // FIX: Maak een kloon van de respons voordat we de body lezen in het geval van een fout.
            // Dit zorgt ervoor dat de stream maar één keer wordt geconsumeerd in de code.
            const clonedResponse = response.clone();
            
            // VERBETERDE FOUTAFHANDELING: Lees de body van de kloon als tekst en probeer dan te parsen.
            let errorBodyDetails = 'Geen foutdetails ontvangen.';
            
            try {
                // Lees de stream slechts één keer
                const rawText = await clonedResponse.text();
                
                // Probeer de tekst als JSON te parsen voor nette foutdetails
                try {
                    const parsedJson = JSON.parse(rawText);
                    errorBodyDetails = JSON.stringify(parsedJson).substring(0, 100);
                } catch (jsonError) {
                    // Als het geen JSON is, gebruik de ruwe tekst
                    errorBodyDetails = rawText.substring(0, 100);
                }
            } catch (readError) {
                console.error('Fout bij het lezen van de foutbody zelf:', readError.message);
                errorBodyDetails = `Kon foutdetails niet lezen: ${readError.message}`;
            }
            
            console.error(`Fout bij Baserow oproep: Status ${response.status}`, errorBodyDetails);
            
            return res.status(response.status).json({ 
                error: `Fout bij Baserow API-oproep (HTTP ${response.status}). Controleer Vercel BASEROW_TOKEN of Baserow configuratie.`,
                details: errorBodyDetails
            });
        }
        
        // Alleen in het succesvolle pad de body lezen
        const data = await response.json(); 
        
        // Baserow retourneert de rijen onder de sleutel 'results'. 
        // We geven alleen de array met data terug aan de frontend.
        res.status(200).json(data.results || []);

    } catch (error) {
        // Vangt netwerkfouten (DNS, timeout, etc.)
        console.error('Fout bij de proxy-aanroep:', error);
        res.status(500).json({ error: `Serverfout (Netwerk/Code): ${error.message}` });
    }
};
