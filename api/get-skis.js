// Vercel Serverless Function to securely proxy requests to Airtable
// This function must be placed in the `api/` directory (e.g., api/get-skis.js)

module.exports = async (request, response) => {
    // 1. Load environment variables securely from Vercel settings
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    // NOTE: Replace 'Skis' if your table name is different
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Skis'; 

    // Set CORS headers for security and to allow the Webflow domain to access the API
    response.setHeader('Access-Control-Allow-Origin', '*'); // Allows all origins, but can be restricted to your Webflow domain
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        // Handle CORS preflight requests
        response.status(200).end();
        return;
    }

    // Input validation
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return response.status(500).json({ 
            error: "Airtable credentials not configured. Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in Vercel Environment Variables." 
        });
    }

    // 2. Extract query parameters from the frontend (Webflow)
    const { gender, ability, piste } = request.query;

    if (!gender || !ability || !piste) {
        return response.status(400).json({ 
            error: "Missing required query parameters: gender, ability, and piste are required." 
        });
    }

    // 3. Construct the Airtable API URL and Filter Formula
    const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    // Filter formula to fetch records matching the criteria (Gender, Ability, Piste)
    // The Airtable formula uses the fields exactly as named in your base
    const filterFormula = `AND({Gender} = '${gender}', {Ability} = '${ability}', {Piste} = '${piste}')`;

    const searchParams = new URLSearchParams({
        filterByFormula: filterFormula,
        // Max records per page is 100, which should be sufficient
        maxRecords: 100, 
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
            const status = airtableResponse.status;
            
            // Log the error details and return a generic error message for security
            console.error('Airtable API Error:', status, errorBody);
            
            let errorMessage = `Airtable oproep mislukt. Status: ${status}.`;
            if (status === 401) {
                errorMessage = 'Autorisatiefout. Controleer de AIRTABLE_API_KEY in Vercel.';
            } else if (status === 404) {
                 errorMessage = 'Resource niet gevonden. Controleer AIRTABLE_BASE_ID of AIRTABLE_TABLE_NAME in Vercel.';
            }

            return response.status(status).json({ 
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
