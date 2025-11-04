// Fuerza Node.js 18 para esta función (sin vercel.json)
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const GAS_URL = process.env.GAS_URL;

async function handler(req, res) {
  setCors(res);

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'Missing GAS_URL in Vercel Environment Variables' });
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ping simple (GET) para probar el proxy
  if (req.method === 'GET') {
    try {
      const ping = await fetch(GAS_URL);
      const text = await ping.text();
      return res.status(200).json({ ok: true, message: 'Proxy activo', raw: text.slice(0, 150) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });

    const text = await r.text();
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok, raw: text });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

// CommonJS (requerido aquí). Adjuntamos config al export.
module.exports = handler;
module.exports.config = { runtime: 'nodejs18.x' };
