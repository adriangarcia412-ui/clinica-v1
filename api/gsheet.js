// api/gsheet.js — Proxy a Google Apps Script (GAS) para la clínica (Edge).
// Este archivo NO requiere variables de entorno. Usa una constante GAS_URL.
// Pega aquí el URL de despliegue de tu Apps Script (el mismo que ya usas para “Cerrar caso”).
export const config = { runtime: 'edge' };

// ⚠️ REEMPLAZA por tu Web App de GAS (URL /exec):
const GAS_URL = 'https://script.google.com/macros/s/PEGAR_AQUI_TU_WEBAPP/exec';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({ ok: true });

  const { searchParams } = new URL(req.url);
  if (req.method === 'GET' && searchParams.get('action') === 'ping') {
    return json({ ok: true, message: 'pong (proxy activo)' });
  }

  if (!GAS_URL) return json({ ok:false, error:'Configura GAS_URL en api/gsheet.js' }, 500);

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(()=>({ok:false,error:'Respuesta inválida de GAS'}));
      return json(j, res.status);
    }
    return json({ ok:false, error:'Método no soportado' }, 405);
  } catch (e) {
    return json({ ok:false, error: e?.message || 'Error proxy' }, 500);
  }
}
