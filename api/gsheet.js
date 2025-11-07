// api/gsheet.js — Proxy a Google Apps Script (GAS) para la app “clínica”
// Lee SIEMPRE la respuesta del GAS una sola vez como texto y la convierte
// de forma tolerante a { ok, ... } para que el front NUNCA reviente por parseo.

// 1) URL del GAS publicado como "Anyone"
//    Preferencia: variable de entorno GAS_CLINICA_URL en Vercel.
const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  "https://script.google.com/macros/s/AKfycbzMZI3qsITlvIUAPGUk1JYt1CuPP3BIA4q9WK5ZIA5lrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// 2) Acciones permitidas (por seguridad)
const ALLOWED_ACTIONS = new Set([
  "clinica_close",
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_delete_pending",
]);

// Helper para leer JSON del body en Vercel Node (sin leer dos veces)
function readJSON(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        // Si viene algo que no es JSON, regresamos objeto vacío
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    // Acción por query (GET) o por body (POST)
    let action = (req.query && req.query.action) || null;
    let payload = {};

    if (req.method === "POST") {
      const body = await readJSON(req);
      action = action || body.action || null;
      payload = body.data || {};
    }

    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return res
        .status(400)
        .json({ ok: false, error: `Acción no permitida: ${action || "(vacía)"}` });
    }

    // Forward al GAS. IMPORTANTE: leer la respuesta UNA SOLA VEZ como texto.
    const gasResp = await fetch(`${GAS_URL}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await gasResp.text(); // <- leer solo una vez
    // Intentar parsear a JSON; si falla, devolver como error de texto.
    let out;
    try {
      out = JSON.parse(raw);
    } catch (_) {
      out = gasResp.ok
        ? { ok: true, message: raw || "OK" }
        : { ok: false, error: raw || "Respuesta inválida de GAS" };
    }

    // Asegurar estructura con ok:boolean
    if (typeof out !== "object" || out === null) {
      out = { ok: !!gasResp.ok, message: raw || "" };
    }
    if (typeof out.ok !== "boolean") out.ok = !!gasResp.ok;

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
