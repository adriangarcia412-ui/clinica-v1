// api/gsheet.js — Proxy a Google Apps Script (GAS) para la app "clínica".
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Solo POST" });
      return;
    }

    const GAS_URL = process.env.GAS_CLINICA_URL;
    if (!GAS_URL) {
      res.status(500).json({
        ok: false,
        error:
          "Falta GAS_CLINICA_URL en variables de entorno de Vercel. Configúrala con la URL /exec del Web App de Google.",
      });
      return;
    }

    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const fetchRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await fetchRes.text(); // leer una sola vez
    let out;
    try {
      out = JSON.parse(text);
    } catch (_) {
      // GAS devolvió HTML (error de publicación / anyone / doPost)
      return res.status(502).json({
        ok: false,
        error:
          'GAS devolvió una página HTML (posible error de Google o Web App no publicado como "Anyone").',
        detail_preview: text.slice(0, 400),
      });
    }

    // Normalizamos la salida a {ok:true/false, ...}
    if (fetchRes.ok && (out.ok === undefined || out.ok === true)) {
      return res.status(200).json(out);
    } else {
      return res.status(fetchRes.status || 500).json(
        out.ok === false ? out : { ok: false, error: out.error || "Error en GAS" }
      );
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.stack || err) });
  }
}
