// Fuerza el runtime moderno (evita el error de "Function Runtimes must have a valid version")
export const config = {
  runtime: 'nodejs18.x',
};

// Leer la URL del Apps Script desde las variables de entorno en Vercel
const GAS_URL = process.env.GAS_URL;

export default async function handler(req, res) {
  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: 'Missing GAS_URL in Vercel Environment Variables' });
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ping simple (GET) para probar que el proxy está vivo
  if (req.method === 'GET') {
    try {
      const ping = await fetch(GAS_URL);
      const text = await ping.text();
      return res.status(200).json({ ok: true, message: 'Proxy activo', raw: text.slice(0, 150) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  // Solo aceptamos POST para pasar datos al GAS
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok, raw: text });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
