// Vercel Serverless Function to securely proxy requests to Airtable
// This function must be placed in the `api/` directory (e.g., api/get-skis.js)

module.exports = async (request, response) => {
    // 1. Load environment variables securely from Vercel settings
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Skis'; // Use 'Skis' or your specific table name

    // Set CORS headers for security and to allow the Webflow domain to access the API
    response.setHeader('Access-Control-Allow-Origin', '*'); 
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // Input validation for credentials
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return response.status(500).json({ 
            error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in Vercel Environment Variables." 
        });
    }

    // 2. Extract all 6 query parameters from the frontend
    // NOTE: Frontend parameters: gender, level, piste, speed, turns, price
    const { gender, level, piste, speed, turns, price } = request.query;

    // Validation for user input
    if (!gender || !level || !piste || !speed || !turns || !price) {
        return response.status(400).json({ 
            error: "Ontbrekende filters: Zorg ervoor dat stap 1 t/m 6 (Geslacht, Niveau, Piste, Snelheid, Bochten, Prijs) volledig zijn ingevuld." 
        });
    }

    // 3. Construct the Airtable API URL and Filter Formula
    const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    // BELANGRIJK: De veldnamen in de formule zijn nu afgestemd op de door u verstrekte namen: 
    // {Gender}, {Ability}, {Piste}, {Snelheid}, {Bochten}, {Verkoopprijs}
    const filterFormula = 
        `AND({Gender} = '${gender}', {Ability} = '${level}', {Piste} = '${piste}', {Snelheid} = '${speed}', {Bochten} = '${turns}', {Verkoopprijs} = '${price}')`;

    const searchParams = new URLSearchParams({
        filterByFormula: filterFormula,
        maxRecords: 100, // Maximaal aantal records om op te halen
    }).toString();
    
    const urlWithParams = `${AIRTABLE_URL}?${searchParams}`;

    try {
        // 4. Call Airtable API securely using the environment variable
        const airtableResponse = await fetch(urlWithParams, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!airtableResponse.ok) {
            const errorBody = await airtableResponse.json().catch(() => ({}));
            
            let errorMessage = `Airtable oproep mislukt (Status: ${airtableResponse.status}). Controleer de veldnamen in Airtable en Vercel variabelen.`;
            
            return response.status(airtableResponse.status).json({ 
                error: errorMessage,
                details: errorBody 
            });
        }

        const airtableData = await airtableResponse.json();

        // 5. Return filtered data back to the Webflow frontend
        return response.status(200).json({
            skis: airtableData.records || []
        });

    } catch (error) {
        console.error('Server Proxy Error:', error);
        return response.status(500).json({ 
            error: `Interne serverfout bij communicatie met Airtable: ${error.message}` 
        });
    }
};
