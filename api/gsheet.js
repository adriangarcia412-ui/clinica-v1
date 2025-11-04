// api/gsheet.js

// Fuerza runtime Node (no Edge). También puedes omitir esta línea si quieres.
export const config = { runtime: 'nodejs' };

const GAS_URL = process.env.GAS_URL;

export default async function handler(req, res) {
  // CORS básico (ajusta el origen si lo necesitas restringir)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'Falta la env GAS_URL en Vercel.' });
  }

  // Ping simple con GET para comprobar que el proxy está vivo
  if (req.method === 'GET') {
    try {
      const r = await fetch(GAS_URL);
      const txt = await r.text();
      return res.status(200).json({ ok: true, message: 'proxy activo', raw: txt.slice(0, 150) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // En Next/Vercel, req.body ya viene parseado si Content-Type es application/json
    const payload = req.body ?? {};

    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Intentamos JSON; si no, regresamos texto crudo
    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await r.json();
      return res.status(r.ok ? 200 : r.status).json(data);
    } else {
      const txt = await r.text();
      return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, raw: txt });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
