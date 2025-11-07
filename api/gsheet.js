// api/gsheet.js — Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Si cambias tu GAS, solo ajusta la URL de abajo o configúrala como variable de entorno
// (Vercel → Settings → Environment Variables) con el nombre GAS_CLINICA_URL.

const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  // Fallback temporal; reemplázala por tu Web App (Deploy → Anyone):
  "https://script.google.com/macros/s/AKfycbycM2l3qsITIWlUAPGUk1JYt1CuPP3BlA4q9Wk5Z1AslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// Acciones permitidas (seguridad básica)
const ALLOWED = new Set([
  "clinica_close",
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_delete_pending",
  "clinica_send_pending",
  "ping", // utilitario
]);

export default async function handler(req, res) {
  // CORS/OPTIONS mínimo
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (req.method === "GET") {
      const action = (req.query.action || "ping") + "";
      if (!ALLOWED.has(action)) return bad(res, 400, `Acción no permitida: ${action}`);
      const out = await callGAS({ action, data: {} });
      return okOrError(res, out);
    }

    if (req.method !== "POST") {
      return bad(res, 405, "Método no permitido");
    }

    const { action, data } = req.body || {};
    if (!action || !ALLOWED.has(action + "")) {
      return bad(res, 400, `Acción no permitida: ${action}`);
    }

    const out = await callGAS({ action, data: data || {} });
    return okOrError(res, out);
  } catch (e) {
    return bad(res, 500, e.message || "Fallo desconocido");
  }
}

async function callGAS(payload) {
  // Envía SIEMPRE JSON al GAS; si GAS responde texto/HTML, lo envolvemos.
  let resp;
  try {
    resp = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, error: `No se pudo contactar GAS: ${e.message || e}` };
  }

  // 1) Intentar JSON
  try {
    const j = await resp.json();
    return j;
  } catch {
    // 2) Intentar texto
    try {
      const txt = await resp.text();
      const trimmed = (txt || "").trim();
      if (trimmed.startsWith("{")) {
        try { return JSON.parse(trimmed); } catch {}
      }
      // Devolver como error claro
      return { ok: false, error: trimmed.slice(0, 800) || "Respuesta inválida de GAS" };
    } catch {
      return { ok: false, error: "Respuesta ilegible de GAS" };
    }
  }
}

function okOrError(res, out) {
  if (out && out.ok) return res.status(200).json(out);
  return bad(res, 200, (out && out.error) || "Error desconocido de GAS");
}

function bad(res, code, msg) {
  return res.status(code).json({ ok: false, error: msg });
}
