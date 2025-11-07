// api/gsheet.js
// Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Mantiene contrato JSON con el front y evita leer el body dos veces.
// Si GAS responde HTML (errores de Google), devolvemos texto claro al front.

export const config = {
  runtime: "edge",
};

const ALLOWED = new Set([
  "ping",
  "clinica_cloud_save",
  "clinica_close",
  "clinica_list_pending",
  "clinica_delete_pending",
]);

// 1) URL del Web App de Google Apps Script (publicado como "Anyone")
//    PRIORIDAD: variable de entorno GAS_CLINICA_URL (Vercel → Settings → Env Vars).
//    Fallback temporal por si olvidas configurarla.
const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  "https://script.google.com/macros/s/AKfycbzM2I3qsTIIwIUAPGuk1JYt1CuPP3BIA4q9WK5ZIA5lrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isProbablyHtml(text) {
  const t = (text || "").trim().toLowerCase();
  return t.startsWith("<!doctype html") || t.startsWith("<html");
}

export default async function handler(req) {
  try {
    // GET /api/gsheet?action=ping
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "").trim();

    if (!action) {
      return jsonResponse({ ok: false, error: "Falta parámetro 'action'." }, 400);
    }
    if (!ALLOWED.has(action)) {
      return jsonResponse(
        { ok: false, error: `Acción no permitida: ${action}` },
        400
      );
    }

    // Armamos payload. Si es POST con JSON, lo pasamos al GAS.
    let payload = { action };
    if (req.method === "POST") {
      try {
        const j = await req.json();
        if (j && typeof j === "object") {
          payload = { ...payload, ...j };
        }
      } catch {
        // si no venía JSON, seguimos solo con action
      }
    }

    // Forward al GAS (siempre POST JSON para simplificar).
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify(payload),
    });

    // Leemos una sola vez el body.
    const text = await res.text();

    // Si no fue 2xx, devolvemos el texto del GAS (si es HTML lo avisamos).
    if (!res.ok) {
      if (isProbablyHtml(text)) {
        return jsonResponse(
          {
            ok: false,
            error:
              "GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté publicado como 'Anyone' y activo.",
            hint: "Vuelve a intentar en un minuto o revisa el deployment del GAS.",
          },
          502
        );
      }
      // Intentamos parsear JSON de error
      try {
        const j = JSON.parse(text);
        return jsonResponse(j, res.status);
      } catch {
        return jsonResponse(
          { ok: false, error: `Error del GAS: ${text.slice(0, 500)}` },
          502
        );
      }
    }

    // 2xx: intentamos JSON; si es HTML, avisamos sin romper el front
    try {
      const j = JSON.parse(text);
      return jsonResponse(j, 200);
    } catch {
      if (isProbablyHtml(text)) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Respuesta inválida de GAS (HTML). Probable error temporal de Google Docs/Apps Script.",
            hint:
              "Si antes funcionaba, suele recuperarse solo. Si persiste, república el Web App.",
          },
          502
        );
      }
      return jsonResponse(
        { ok: false, error: `Respuesta inválida de GAS: ${text.slice(0, 500)}` },
        502
      );
    }
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
}
