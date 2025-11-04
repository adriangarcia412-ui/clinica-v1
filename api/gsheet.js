// api/gsheet.js  — versión CommonJS compatible con Vercel Functions
const GAS_URL = process.env.GAS_URL;

// CORS básico (opcional, útil para pruebas desde otras páginas)
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_URL not configured' });
  }

  if (req.method === 'GET') {
    // Healthcheck sencillo
    return res.status(200).json({ ok: true, message: 'proxy activo' });
  }

  if (req.method === 'POST') {
    try {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      // Hacemos 'action' opcional (default = 'append')
      const action = body.action || 'append';

      // Si mandan {action, data} lo usamos; si mandan plano, lo tomamos como data
      const data = body.data ?? body;

      // Evitar duplicar 'action' dentro de data
      if (data && data.action) delete data.action;

      const upstream = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      // Intentamos parsear JSON; si no, devolvemos el texto crudo
      const raw = await upstream.text();
      let out;
      try { out = JSON.parse(raw); } catch { out = { ok: upstream.ok, raw }; }

      return res
        .status(upstream.ok ? 200 : upstream.status)
        .json(out);
    } catch (err) {
      return res
        .status(500)
        .json({ ok: false, error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

// Forzamos runtime Node (no Edge)
module.exports.config = { runtime: 'nodejs' };
