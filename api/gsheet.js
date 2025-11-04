// api/gsheet.js

// Fuerza runtime moderno; así no dependes de vercel.json
export const config = { runtime: 'nodejs18.x' };

const GAS_URL = process.env.GAS_URL;

export default async function handler(req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_URL no configurado' });
  }

  try {
    // GET = ping
    if (req.method === 'GET') {
      const ping = await fetch(GAS_URL);
      const raw = await ping.text();
      return res.status(200).json({ ok: true, message: 'Proxy activo', raw: raw.slice(0, 150) });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // POST = proxy a tu Apps Script
    const upstream = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.ok ? 200 : 500).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
