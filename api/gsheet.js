// api/gsheet.js — Proxy único hacia Google Apps Script (GAS) para la app "clínica".
// Inspirado en tu proxy previo y en el flujo de SOC-V3.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok:false, error:'Method Not Allowed' });
    return;
  }

  const { action, payload } = req.body || {};

  // 1) URL del Web App de Google Apps Script (publicado como "Anyone")
  // PRIORIDAD: variable de entorno GAS_CLINICA_URL; si no existe, usa fallback.
  const GAS_URL =
    process.env.GAS_CLINICA_URL ||
    // <-- Reemplaza este fallback por el /exec real de tu Web App cuando lo tengas.
    "https://script.google.com/macros/s/AKfycbwZMl3qsTllMvIUAPGUk1JYt1CuPP3BIA4q9WK5Z1AslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

  if (!GAS_URL.includes('/exec')) {
    return res.status(500).json({
      ok:false,
      error:'Falta GAS_CLINICA_URL (variable de entorno Vercel) configurada con el URL /exec del Web App de Google.'
    });
  }

  // 2) Aliases de acciones (por si tu Apps Script quedó con nombres SOC)
  const ACTION_ALIASES = {
    // clínica → SOC
    'clinica_close':          ['clinica_close', 'soc_close'],
    'clinica_cloud_save':     ['clinica_cloud_save', 'soc_cloud_save'],
    'clinica_list_pending':   ['clinica_list_pending', 'soc_list_pending'],
    'clinica_delete_pending': ['clinica_delete_pending', 'soc_delete_pending'],
  };

  // Resolución del nombre de acción “real” a enviar
  // (Probamos clínica primero; si GAS rechaza, el servidor de Apps Script debe dar error,
  // pero aquí lo normal es que IGUAL se llame “soc_*”, así que enviamos el primero de la lista.)
  const actionCandidates = ACTION_ALIASES[action] || [action];

  // 3) Construimos una carga genérica
  const body = {
    // Enviamos el primer candidato; tu Apps Script puede ignorar “action” si usa doPost con routing propio.
    action: actionCandidates[0],
    payload: payload || {},
  };

  let gasResp;
  try {
    gasResp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return res.status(502).json({ ok:false, error:`No se pudo contactar a GAS: ${e.message}` });
  }

  const ctype = gasResp.headers.get('content-type') || '';
  const raw = await gasResp.text(); // leemos SOLO UNA VEZ

  if (!gasResp.ok) {
    // devolvemos el texto crudo para diagnóstico
    return res.status(gasResp.status).json({ ok:false, error: raw || `HTTP ${gasResp.status}` });
  }

  if (ctype.includes('application/json')) {
    try {
      const json = JSON.parse(raw);
      return res.status(200).json(json);
    } catch (e) {
      return res.status(500).json({ ok:false, error:`Respuesta JSON inválida desde GAS: ${e.message}` });
    }
  }

  if (ctype.includes('text/html') || raw.startsWith('<!DOCTYPE html')) {
    return res.status(502).json({
      ok:false,
      error:'GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté activo y publicado como "Anyone".'
    });
  }

  return res.status(500).json({ ok:false, error:'Respuesta de GAS no es JSON.' });
}
