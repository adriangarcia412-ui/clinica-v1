// api/gsheet.js
// Runtime Node.js 22.x (ya lo fijaste en package.json)
// Requiere env: GAS_URL  => tu Web App de Google Apps Script (deployment "Anyone")

export default async function handler(req, res) {
  const { GAS_URL } = process.env;
  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'Missing GAS_URL env var' });
  }

  try {
    // Prueba rápida de salud
    if (req.method === 'GET') {
      const url = req.query.ping ? `${GAS_URL}?ping=1` : GAS_URL;
      const r = await fetch(url, { method: 'GET' });
      const raw = await r.text();
      return res.status(200).json({ ok: true, message: 'proxy activo', raw });
    }

    if (req.method === 'POST') {
      // Asegurar action
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const action = body.action || 'append'; // default
      const payload = { action, values: body.values || body };

      const r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const txt = await r.text();
      // GAS puede devolver JSON o HTML de error; intentamos parsear
      let data = null;
      try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

      // Si GAS devolvió ok=false, mandamos 400
      if (data && data.ok === false) {
        return res.status(400).json(data);
      }

      return res.status(200).json({ ok: true, data });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
