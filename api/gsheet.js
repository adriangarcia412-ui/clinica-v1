// api/gsheet.js

// Usa runtime de Node "normal" en Vercel (evita nodejs18.x / edge)
export const config = { runtime: "nodejs" };

function tryJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: "Falta variable de entorno GAS_URL en Vercel" });
  }

  // GET = ping de salud (no toca datos)
  if (req.method === "GET") {
    try {
      const up = await fetch(GAS_URL, { method: "GET" });
      const raw = await up.text();
      return res.status(200).json({
        ok: true,
        message: "proxy activo",
        upstreamStatus: up.status,
        raw
      });
    } catch (e) {
      return res.status(502).json({ ok: false, error: "No se pudo contactar GAS_URL", detail: String(e) });
    }
  }

  // POST = reenviar al Apps Script
  if (req.method === "POST") {
    try {
      // Vercel parsea JSON automáticamente si viene con Content-Type correcto;
      // por si acaso, soportamos ambas formas:
      const incoming = typeof req.body === "object" && req.body !== null
        ? req.body
        : (await req.json?.()) || {};

      // Normalizamos "action" pero NO la exigimos
      const map = {
        append: "append",
        pendiente: "append",
        save: "append",
        guardar: "append",
        close: "finalize",
        cerrar: "finalize",
        final: "finalize",
        finalizar: "finalize",
        finalize: "finalize"
      };

      const actionIncoming = (incoming.action || "append").toString().trim().toLowerCase();
      const action = map[actionIncoming] || "append";

      // Construimos el payload que verá tu Apps Script
      const payload = {
        action,
        data: { ...incoming }
      };
      delete payload.data.action; // para no duplicar

      const up = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await up.text();
      const maybeJson = tryJson(text);

      // Si GAS respondió JSON, lo devolvemos tal cual; si no, regresamos texto crudo
      return res.status(up.ok ? 200 : 502).json({
        ok: up.ok,
        upstreamStatus: up.status,
        ...(maybeJson ?? { raw: text })
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: "Fallo al proxy-post", detail: String(e) });
    }
  }

  // Otros métodos no permitidos
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ ok: false, error: "Method Not Allowed" });
}
