export const config = {
  runtime: 'edge',
};

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
  || 'https://script.google.com/macros/s/AKfycby5HPdVF5BzCHQxLbgckoeJVMcVDq9Kkc1819qW9Yxr1BxY__LcqmiQfeO8ZdDcjebmgQ/exec';

function mkRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function forwardGet(action, searchParams) {
  // Reenvía GET => GAS (ej. ?action=clinica_list_pending)
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'action') url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  return mkRes(data, res.status);
}

async function forwardPost(action, body) {
  // Reenvía POST JSON => GAS (ej. {action:"clinica_send_pending", data:{...}})
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(body || {}) }),
  });
  const data = await res.json().catch(() => ({}));
  return mkRes(data, res.status);
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const method = req.method || 'GET';

    // 1) Ping simple
    if (method === 'GET' && searchParams.get('action') === 'ping') {
      return mkRes({ ok: true, message: 'pong (GAS activo)' });
    }

    // 2) Acciones GET que listan/consultan
    if (method === 'GET') {
      const action = searchParams.get('action');
      if (action) return await forwardGet(action, searchParams);
      return mkRes({ ok: false, error: 'Missing action' }, 400);
    }

    // 3) Acciones POST (guardar/reenviar/eliminar/cerrar)
    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const action = body?.action || searchParams.get('action');
      if (!action) return mkRes({ ok: false, error: 'Missing action' }, 400);
      return await forwardPost(action, body);
    }

    return mkRes({ ok: false, error: 'Method not allowed' }, 405);
  } catch (err) {
    return mkRes({ ok: false, error: String(err?.message || err) }, 500);
  }
}
