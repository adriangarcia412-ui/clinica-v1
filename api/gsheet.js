// api/gsheet.js  (Vercel Serverless Function, Node 22, CommonJS)
const GAS_URL = process.env.GAS_URL; // ya lo tienes configurado en Vercel

// Pequeña ayuda para CORS desde el navegador
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!GAS_URL) {
    res.status(500).json({ ok: false, error: 'GAS_URL no está definido en Vercel' });
    return;
  }

  // Ping de salud
  if (req.method === 'GET' && (req.query.ping || req.query.health || req.query.status)) {
    res.status(200).json({ ok: true, message: 'proxy activo' });
    return;
  }

  // Construir la URL final para Apps Script conservando los query params (si existen)
  let forwardUrl = GAS_URL;
  if (req.url.includes('?')) {
    // /api/gsheet?loquesea -> añadimos ?loquesea al GAS_URL
    forwardUrl += req.url.substring(req.url.indexOf('?'));
  }

  try {
    // Preparar opciones de fetch hacia Apps Script
    const opts = { method: req.method, headers: {} };

    if (req.method === 'POST') {
      // Vercel parsea JSON automáticamente en req.body cuando viene con Content-Type: application/json
      const isJson = req.headers['content-type'] && req.headers['content-type'].includes('application/json');
      if (isJson) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(req.body || {});
      } else {
        // Si algún día envías otra cosa, la reenviamos como texto
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        opts.body = Buffer.concat(chunks);
      }
    }

    const r = await fetch(forwardUrl, opts);
    const ct = r.headers.get('content-type') || '';

    // Si Apps Script responde JSON, lo devolvemos como JSON
    if (ct.includes('application/json')) {
      const data = await r.json();
      res.status(r.status).json(data);
      return;
    }

    // Si responde texto/HTML (por ejemplo páginas de “Error” o autenticación), lo envolvemos
    const text = await r.text();
    res.status(r.status).json({ ok: r.ok, message: 'proxy activo', raw: text });
  } catch (err) {
    res.status(502).json({ ok: false, error: 'Fallo al contactar Apps Script', details: String(err) });
  }
};
