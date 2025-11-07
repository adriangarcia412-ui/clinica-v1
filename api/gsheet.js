// api/gsheet.js
// Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Requiere variable de entorno GAS_CLINICA_URL en Vercel con el URL .../exec
// Si Vercel no tiene esa variable, puedes hardcodear temporalmente en GAS_URL.

const GAS_URL = process.env.GAS_CLINICA_URL || ""; // <-- NO hardcodear aquí en producción

// Acciones permitidas; evita que te llamen cualquier cosa.
const ALLOWED = new Set([
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_close"
]);

/**
 * Convierte el ReadableStream en string una sola vez.
 */
async function readTextOnce(res) {
  try {
    return await res.text();
  } catch (e) {
    return "";
  }
}

/**
 * Respuesta JSON uniforme al front.
 */
function sendJSON(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/**
 * Extrae hasta 800 caracteres para diagnóstico si GAS devuelve HTML.
 */
function excerpt(html) {
  return (html || "").slice(0, 800);
}

export default async function handler(req, res) {
  try {
    if (!GAS_URL) {
      return sendJSON(res, 500, {
        ok: false,
        error: "Falta GAS_CLINICA_URL en variables de entorno de Vercel. Configura con el URL /exec del Web App de Google."
      });
    }

    const { action } = req.query;
    if (!action || !ALLOWED.has(action)) {
      return sendJSON(res, 400, { ok: false, error: `Acción no permitida: ${action || "(vacía)"}` });
    }

    // El body del front será JSON.
    const payload = req.method === "POST" ? req.body : null;

    // Reenvía a GAS
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });

    const ct = (gasRes.headers.get("content-type") || "").toLowerCase();

    // GAS debe devolver JSON. Si no, devolvemos diagnóstico con un recorte de HTML.
    if (!ct.includes("application/json")) {
      const raw = await readTextOnce(gasRes);
      return sendJSON(res, 502, {
        ok: false,
        error: "GAS devolvió una página HTML (posible error de Google o del despliegue). Verifica que el Web App esté publicado como 'Anyone' y activo.",
        html_excerpt: excerpt(raw)
      });
    }

    // JSON válido desde GAS
    const data = await gasRes.json();
    return sendJSON(res, 200, data);

  } catch (err) {
    return sendJSON(res, 500, {
      ok: false,
      error: `Proxy error: ${err?.message || err}`
    });
  }
}
