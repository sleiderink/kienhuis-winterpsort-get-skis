import fetch from 'node-fetch';

export default async function (req, res) {
  // CORS-headers toevoegen
  res.setHeader('Access-Control-Allow-Origin', 'https://www.kienhuiswintersport.nl');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Controleer of de aanvraag een preflight-verzoek is (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const baseId = 'appB9GQhuY38AW2uT';
  const tableName = 'Ski Finder';

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `Airtable API-fout: ${errorText}`
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Fout in Vercel Function:', error);
    res.status(500).json({ error: 'Interne serverfout' });
  }
}
