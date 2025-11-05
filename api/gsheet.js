// api/gsheet.js

// NOTA: NO declares runtime 'nodejs18.x'. Si tienes una línea como:
// export const config = { runtime: 'nodejs18.x' }
// elimínala, o cámbiala por: export const config = { runtime: 'nodejs' }
// Aunque lo más seguro hoy es NO poner nada.

module.exports = async (req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL) {
    res.status(500).json({ ok: false, error: 'Missing GAS_URL env var in Vercel' });
    return;
  }

  // Health check simple
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, message: 'proxy ok' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  // Normalizar body: puede llegar string o objeto
  let body = {};
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else {
      // Vercel (node) puede no parsear; leemos manual con stream
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8') || '{}';
      body = JSON.parse(raw);
    }
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const action = body.action;
  if (!action) {
    return res.status(400).json({ ok: false, error: 'Missing action' });
  }
  if (!['append', 'test'].includes(action)) {
    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
  }

  // Preparamos payload para GAS.
  // Convención: si mandas { action:'append', data:{...} } lo reenviamos igual,
  // y si mandas campos sueltos, los empaquetamos en data.
  const payload = {
    action,
    data: body.data && typeof body.data === 'object' ? body.data : body
  };

  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text }; // GAS devolvió HTML u otro formato
    }

    // Si GAS respondió OK (2xx), regresamos 200; si no, 500
    res.status(r.ok ? 200 : 500).json({ ok: r.ok, ...json });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
};
