// api/gsheet.js — Proxy genérico a Google Apps Script (GAS) para la clínica.
// No filtra acciones: reenvía cualquier {action, data} tal cual al GAS.
// Mantiene CORS y ping. No toca tu formulario ni tu flujo existente.

export const config = {
  runtime: 'edge',
};

const GAS_URL = process.env.GAS_CLINICA_URL || ''; 
// Si no usas env var, puedes pegar aquí tu URL de despliegue GAS, por ejemplo:
// const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

function jsonResponse(obj, status = 200) {
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
  // CORS preflight
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });

  // Ping local (sin ir al GAS)
  const { searchParams } = new URL(req.url);
  if (req.method === 'GET' && searchParams.get('action') === 'ping') {
    return jsonResponse({ ok: true, message: 'pong (proxy activo)' });
  }

  if (!GAS_URL) {
    return jsonResponse({ ok: false, error: 'Falta GAS_CLINICA_URL en variables de entorno o constante GAS_URL' }, 500);
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body?.action || '';
      const data = body?.data ?? {};

      // Reenvía al GAS (POST JSON)
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      const j = await res.json().catch(() => ({}));
      if (!j || j.ok === undefined) {
        return jsonResponse({ ok: false, error: 'Respuesta inválida del GAS' }, 502);
      }
      return jsonResponse(j, res.status);
    }

    // GET genérico: solo pasamos ping o diagnósticos simples
    return jsonResponse({ ok: false, error: 'Método no soportado' }, 405);
  } catch (err) {
    return jsonResponse({ ok: false, error: err?.message || 'Error desconocido en proxy' }, 500);
  }
}
