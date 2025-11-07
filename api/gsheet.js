// api/gsheet.js
// Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// PRIORIDAD: variable de entorno en Vercel: GAS_CLINICA_URL (URL del Web App "exec" publicado como Anyone).

export const config = { runtime: "edge" };

// 1) URL del GAS
const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  ""; // sin fallback para forzar a configurar; si quieres, puedes poner aquí un exec válido temporal

// 2) Acciones admitidas (igual que en SOC-V3 estilo)
const ALLOWED = new Set([
  "clinica_close",
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_delete_pending",
]);

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "";

    if (!ALLOWED.has(action)) {
      return json({ ok: false, error: `Acción no permitida: ${action}` }, 400);
    }

    if (!GAS_URL) {
      return json(
        {
          ok: false,
          error:
            "Falta GAS_CLINICA_URL en variables de entorno de Vercel. Configúrala con el URL de despliegue 'exec' del Web App de Google.",
        },
        500
      );
    }

    // Leemos el body del request UNA sola vez
    const incomingText = await req.text();

    // Reenviamos al GAS (POST) con query ?action=...
    const gasRes = await fetch(`${GAS_URL}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: incomingText || "{}",
      redirect: "follow",
    });

    const gasText = await gasRes.text();

    // Si GAS devuelve HTML, devolvemos error legible
    if (gasText.trim().startsWith("<!DOCTYPE") || gasText.trim().startsWith("<html")) {
      const hint =
        "GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté publicado como 'Anyone' y activo y que GAS_CLINICA_URL sea el 'exec' vigente.";
      return json(
        {
          ok: false,
          error: hint,
          _htmlSample: gasText.slice(0, 200),
        },
        502
      );
    }

    // Intentamos parsear JSON
    let gasJson;
    try {
      gasJson = JSON.parse(gasText);
    } catch {
      return json(
        {
          ok: false,
          error: "Respuesta no JSON desde GAS.",
          _raw: gasText.slice(0, 300),
        },
        502
      );
    }

    // Normalizamos salida
    if (!gasRes.ok || gasJson?.ok === false) {
      return json(
        { ok: false, error: gasJson?.error || `Error HTTP ${gasRes.status}` },
        gasRes.ok ? 200 : gasRes.status
      );
    }

    return json({ ok: true, ...gasJson }, 200);
  } catch (err) {
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
