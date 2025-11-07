// api/gsheet.js — Proxy único hacia Google Apps Script (GAS) para la app "Clínica".
// Inspirado en el proxy de SOC-V3. Si cambias el GAS, solo ajusta la URL de abajo
// o bien configúrala como variable de entorno (Vercel → Settings → Environment Variables).

// 1) URL del Web App de Google Apps Script (publicado como "Anyone")
//    PRIORIDAD: variable de entorno GAS_CLINICA_URL; si no existe, usa fallback.
const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  // Fallback temporal (puedes reemplazar por el de Clínica cuando lo tengas a mano)
  "https://script.google.com/macros/s/AKfycbzMZl3qsIIIwIUAPGUk1JYt1CuPP3BI4Aq9WK5ZlAslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// 2) Mapa de acciones admitidas (según lo que dispara el front)
const ALLOWED_ACTIONS = new Set([
  "clinica_close",          // cerrar caso → hoja “Clínica”
  "clinica_cloud_save",     // guardar en nube temporal
  "clinica_list_pending",   // listar pendientes
  "clinica_delete_pending"  // eliminar pendiente
]);

// 3) Utilidad para formatear respuesta de error
function err(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// 4) Handler genérico: recibe { action, data } y reenvía a GAS.
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return err("Use POST", 405);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (!action) return err("Falta 'action'");
    if (!ALLOWED_ACTIONS.has(action)) return err(`Acción desconocida: ${action}`);

    // Reenvía a GAS con el mismo formato que usamos en SOC-V3:
    // { action, payload: {...}, source: "clinica-v1" }
    const gasResp = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        payload: body?.data || {},
        source: "clinica-v1"
      })
    });

    // GAS debe devolver JSON con { ok: true/false, ... }
    if (!gasResp.ok) return err(`GAS HTTP ${gasResp.status}`, 502);

    const j = await gasResp.json().catch(() => null);
    if (!j || typeof j.ok === "undefined") {
      return err("Respuesta inválida de GAS", 502);
    }

    return new Response(JSON.stringify(j), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return err(e?.message || "Fallo inesperado", 500);
  }
}
