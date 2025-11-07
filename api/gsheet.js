// api/gsheet.js
// Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Acciones soportadas:
//   - clinica_close         -> CLOSE_CASE
//   - clinica_cloud_save    -> SAVE_PENDING
//   - clinica_list_pending  -> LIST_PENDING
//   - clinica_delete_pending-> DELETE_PENDING

const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  ""; // <-- rellena en Vercel como env var; NO pongas aquí el valor duro.

const ALLOWED = new Set([
  "clinica_close",
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_delete_pending",
]);

function mapToGas(action) {
  switch (action) {
    case "clinica_close": return "CLOSE_CASE";
    case "clinica_cloud_save": return "SAVE_PENDING";
    case "clinica_list_pending": return "LIST_PENDING";
    case "clinica_delete_pending": return "DELETE_PENDING";
    default: return "";
  }
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Sólo POST" });
  }

  const action = (req.query.action || "").toString();
  if (!ALLOWED.has(action)) {
    return res.status(400).json({ ok: false, error: `Acción no permitida: ${action}` });
  }

  if (!GAS_URL) {
    return res
      .status(500)
      .json({
        ok: false,
        error:
          "Falta GAS_CLINICA_URL en variables de entorno de Vercel. Configúrala con el URL /exec del Web App de Google.",
      });
  }

  // payload que enviamos a GAS
  const body = {
    action: mapToGas(action),
    data: req.body || {},
  };

  let gasResp;
  try {
    gasResp = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `No se pudo contactar GAS: ${err.message}` });
  }

  // Una sola lectura del body según content-type
  const ct = gasResp.headers.get("content-type") || "";

  if (!gasResp.ok) {
    const text = await gasResp.text().catch(() => "");
    return res
      .status(502)
      .json({ ok: false, error: `GAS error HTTP ${gasResp.status}`, details: text?.slice(0, 500) });
  }

  if (!ct.includes("application/json")) {
    const text = await gasResp.text().catch(() => "");
    return res.status(502).json({
      ok: false,
      error:
        "GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté activo y publicado como 'Anyone' y que sea la URL /exec.",
      details: text?.slice(0, 500),
    });
  }

  const json = await gasResp.json().catch(() => null);
  if (!json) {
    return res.status(502).json({ ok: false, error: "Respuesta inválida de GAS (no es JSON)." });
  }

  // Normalizamos respuestas para el front
  return res.status(200).json(json);
}
