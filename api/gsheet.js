export default async function handler(req, res) {
  // CORS básico + preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL) {
    return res
      .status(500)
      .json({ ok: false, error: "GAS_URL no está configurada en Vercel." });
  }

  if (req.method === "GET") {
    // Ping de salud
    try {
      const ping = await fetch(GAS_URL);
      const text = await ping.text();
      return res
        .status(200)
        .json({ ok: true, message: "Proxy activo", raw: text.slice(0, 150) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method Not Allowed. Usa GET u OPTIONS/POST." });
  }

  try {
    const upstream = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });

    const raw = await upstream.text();
    let out;
    try {
      out = JSON.parse(raw);
    } catch {
      out = { raw };
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
