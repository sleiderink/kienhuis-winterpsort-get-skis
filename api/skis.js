// Vercel Serverless Function (Node.js) voor Baserow
// Gebruikt om de Baserow API-sleutel veilig te verbergen via omgevingsvariabelen

module.exports = async (req, res) => {
    // 1. Lees de omgevingsvariabelen (Baserow gegevens)
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_HOST = process.env.BASEROW_HOST || 'baserow.io'; // Standaard Baserow Cloud
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
    
    // Baserow API Endpoints
    const BASEROW_API_URL = `https://${BASEROW_HOST}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
        // Return een 500 error als de sleutels niet zijn geconfigureerd in Vercel
        res.status(500).json({ 
            error: "Server configuratie fout: BASEROW_TOKEN of BASEROW_TABLE_ID ontbreken in omgevingsvariabelen." 
        });
        return;
    }

    try {
        // 2. Roep de Baserow API aan met de veilige Token
        const baserowResponse = await fetch(BASEROW_API_URL, {
            method: 'GET',
            headers: {
                // Baserow gebruikt 'Token' als authenticatie type
                'Authorization': `Token ${BASEROW_TOKEN}`,
                'Content-Type': 'application/json'
            },
        });

        // 3. Controleer op Baserow API fouten (bijv. 401 Unauthorized)
        if (!baserowResponse.ok) {
            const errorBody = await baserowResponse.json();
            console.error("Fout bij Baserow oproep:", errorBody);
            
            // Geef een generieke foutmelding terug aan de client
            res.status(baserowResponse.status).json({
                error: `Fout bij het ophalen van Baserow data. Controleer het BASEROW_TOKEN. Status: ${baserowResponse.status}.`,
                details: errorBody // Optioneel: geef details door als dit geen veiligheidsprobleem is
            });
            return;
        }

        const data = await baserowResponse.json();
        
        // Baserow retourneert de rijen onder de sleutel 'results'. 
        // We geven de data direct terug aan de frontend.
        res.status(200).json(data.results || []);

    } catch (error) {
        console.error("Netwerkfout bij Vercel proxy:", error);
        res.status(500).json({ 
            error: "Onbekende serverfout bij het benaderen van de Baserow API.",
            message: error.message
        });
    }
};
