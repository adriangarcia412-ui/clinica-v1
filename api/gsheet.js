// pages/api/gsheet.js
// Proxy hacia tu Apps Script Web App usando la variable de entorno GAS_URL.
// Soporta GET (ping, list, etc.) y POST (clinica_save_pending, clinica_close).

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_URL no está configurada en Vercel' });
  }

  try {
    if (req.method === 'GET') {
      const qs = new URLSearchParams(req.query).toString();
      const url = GAS_URL + (GAS_URL.includes('?') ? '&' : '?') + qs;
      const r = await fetch(url, { method: 'GET' });
      const text = await r.text();

      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { parsed = null; }

      if (parsed && typeof parsed === 'object') {
        // Respuesta JSON del GAS
        return res.status(200).json(parsed);
      } else {
        // Respuesta no-JSON (por ejemplo HTML de error). No fallamos, solo devolvemos raw.
        return res.status(200).json({ ok: true, message: 'proxy activo', raw: text });
      }
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await r.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { parsed = { ok: false, error: 'Respuesta no-JSON del GAS', raw: text }; }
      return res.status(200).json(parsed);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
