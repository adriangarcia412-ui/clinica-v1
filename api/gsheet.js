// /api/gsheet.js
export default async function handler(req, res) {
  try {
    const GAS_URL = process.env.GAS_URL; // p.ej. https://script.google.com/macros/s/AKfycb.../exec
    if (!GAS_URL) return res.status(500).json({ ok: false, error: 'Missing GAS_URL env var' });

    const method = req.method || 'GET';

    const rawAction = (req.body && req.body.action) || req.query.action || '';
    const action = String(rawAction).toLowerCase().trim();

    // payload hacia GAS
    const payload = {
      action,
      data: (req.body && req.body.data) ? req.body.data : (method === 'POST' ? req.body : {})
    };

    // Construye URL final (GET usa query, POST usa body)
    const url = method === 'GET'
      ? `${GAS_URL}?action=${encodeURIComponent(action)}`
      : GAS_URL;

    const fetchOpts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (method === 'POST') {
      fetchOpts.body = JSON.stringify(payload);
    }

    const r = await fetch(url, fetchOpts);
    const text = await r.text();

    // Intenta parsear JSON, si no, devuelve crudo
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // Respuesta amistosa para /api/gsheet?action=ping
    if (action === 'ping') {
      return res.status(200).json({ ok: true, message: 'proxy activo', ...(typeof data === 'object' ? data : { raw: text }) });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
