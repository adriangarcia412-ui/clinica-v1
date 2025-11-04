// api/gsheet.js

export const config = {
  // Runtime estándar de Vercel (evita 'edge' o 'nodejs18.x')
  runtime: 'nodejs',
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // si quieres, pon tu dominio en lugar de '*'
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: solo status, NO tocar GAS (así al abrir la URL en el navegador no rompe nada)
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'proxy activo' });
  }

  // POST: proxy hacia tu Google Apps Script
  if (req.method === 'POST') {
    try {
      const GAS_URL = process.env.GAS_URL;
      if (!GAS_URL) {
        return res.status(500).json({ ok: false, error: 'Falta variable de entorno GAS_URL' });
      }

      // Si el front envía JSON, Vercel ya lo parsea en req.body
      const payload = req.body ?? {};
      const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      const ct = resp.headers.get('content-type') || '';

      if (ct.includes('application/json')) {
        const data = JSON.parse(text);
        return res.status(resp.ok ? 200 : resp.status).json(data);
      } else {
        // Si tu GAS devuelve texto/HTML, lo regresamos como JSON para el front
        return res
          .status(resp.ok ? 200 : resp.status)
          .json({ ok: resp.ok, data: text });
      }
    } catch (err) {
      console.error('Error en proxy /api/gsheet:', err);
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }

  // Otros métodos no permitidos
  return res.status(405).json({ ok: false, error: 'Only GET/POST allowed' });
}
