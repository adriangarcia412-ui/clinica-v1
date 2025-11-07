// api/gsheet.js
// Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Prioriza la variable de entorno GAS_CLINICA_URL (Vercel -> Settings -> Environment Variables).
// Si no existe, usa el fallback (puedes dejar el que ya tenías cuando funcionaba).

export default async function handler(req, res) {
  try {
    const action = (req.query?.action || '').toString().trim();

    // 1) URL del Web App de GAS (debe ser el deployment que termina en /exec, publicado como "Anyone")
    const GAS_URL =
      process.env.GAS_CLINICA_URL ||
      'https://script.google.com/macros/s/AKfycbzMzI3qsTIIMvIUAPGUk1JYt1CuPP3BIA4q9WK5Z1AslrgNg4PPD5aQEcSe07Ce43stkLQ/exec'; // <-- tu fallback conocido

    if (!GAS_URL) {
      return res.status(500).json({
        ok: false,
        error:
          'Falta GAS_CLINICA_URL (variable de entorno en Vercel) con el URL /exec del Web App de Google.',
      });
    }

    // 2) Solo permitimos acciones esperadas (coinciden con tu bridge)
    const ALLOWED_ACTIONS = new Set([
      'clinica_close',         // cerrar caso -> hoja "Clínica"
      'clinica_cloud_save',    // guardar pendiente en nube temporal
      'clinica_list_pending',  // listar pendientes
    ]);
    if (!ALLOWED_ACTIONS.has(action)) {
      return res.status(400).json({ ok: false, error: `Acción no permitida: ${action}` });
    }

    // 3) Reenvío al GAS (POST JSON)
    const url = `${GAS_URL}?action=${encodeURIComponent(action)}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
      cache: 'no-store',
    });

    // 4) Si GAS devuelve HTML (error de Google), lo manejamos
    const ct = (upstream.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const html = await upstream.text();
      return res.status(502).json({
        ok: false,
        error:
          'GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté activo y publicado como "Anyone".',
        html_excerpt: html.slice(0, 800),
      });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `Error del proxy: ${(err && err.message) || err}`,
    });
  }
}

