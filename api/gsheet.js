// Proxy a Google Apps Script (GAS) para la app “clínica”
// Devuelve SIEMPRE JSON; nunca inyecta HTML crudo.

const GAS_URL =
  process.env.GAS_CLINICA_URL ||
  "https://script.google.com/macros/s/AKfycbzMZI3qsITlvIUAPGUk1JYt1CuPP3BIA4q9WK5ZIA5lrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

const ALLOWED_ACTIONS = new Set([
  "clinica_close",
  "clinica_cloud_save",
  "clinica_list_pending",
  "clinica_delete_pending",
]);

function readJSON(req){
  return new Promise((resolve,reject)=>{
    let data=""; req.on("data",c=>data+=c);
    req.on("end",()=>{ if(!data) return resolve({});
      try{ resolve(JSON.parse(data)); }catch{ resolve({}); }});
    req.on("error",reject);
  });
}

export default async function handler(req,res){
  try{
    let action = (req.query && req.query.action) || null;
    let payload = {};

    if (req.method === "POST"){
      const body = await readJSON(req);
      action = action || body.action || null;
      payload = body.data || {};
    }

    if (!action || !ALLOWED_ACTIONS.has(action)){
      return res.status(400).json({ ok:false, error:`Acción no permitida: ${action || "(vacía)"}` });
    }

    const gasResp = await fetch(`${GAS_URL}?action=${encodeURIComponent(action)}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await gasResp.text(); // leer SOLO una vez
    let out;
    try { out = JSON.parse(raw); }
    catch { out = gasResp.ok ? { ok:true, message: raw || "OK" } : { ok:false, error: raw || "Respuesta inválida de GAS" }; }

    if (typeof out !== "object" || out === null) out = { ok: !!gasResp.ok, message: raw || "" };
    if (typeof out.ok !== "boolean") out.ok = !!gasResp.ok;

    return res.status(200).json(out);
  }catch(e){
    return res.status(500).json({ ok:false, error: e.message || String(e) });
  }
}
