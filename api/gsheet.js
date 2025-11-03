// /api/gsheet.js  (CommonJS)
const GAS_URL = process.env.GAS_URL;

module.exports = async function (req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'Missing GAS_URL env var' });
  }

  // Ping simple
  if (req.method === 'GET') {
    try {
      const ping = await fetch(GAS_URL);
      const text = await ping.text();
      return res.status(200).json({ ok: true, message: 'Proxy activo', raw: text.slice(0, 120) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const upstream = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await upstream.json().catch(() => ({}));
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
