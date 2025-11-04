// api/gsheet.js
const GAS_URL = process.env.GAS_URL;

// Permitir CORS básico (si luego lo necesitas)
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
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
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      // Hacer 'action' opcional: por defecto 'append'
      const action = body.action || 'append';

      // Si mandan { action, data }, úsalo. Si mandan el objeto “plano”, lo tomamos como data.
      const data = body.data ?? body;

      // Evitar que reenvíes 'action' duplicado dentro de data si ya venía plano:
      if (data.action) delete data.action;

      const upstreamResp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      const json = await upstreamResp.json().catch(() => ({}));

      return res.status(upstreamResp.ok ? 200 : upstreamResp.status).json(json);
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

// ✅ Aseguramos runtime Node en Vercel (no Edge)
export const runtime = 'nodejs';
