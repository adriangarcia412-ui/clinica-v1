(() => {
  const API = '/api/gsheet';

  async function postJSON(action, data) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000); // 20s timeout

    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(t);
      throw new Error(`No hay respuesta del proxy: ${e.message || e}`);
    }
    clearTimeout(t);

    // Intento 1: JSON directo
    try {
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Error desconocido');
      return j;
    } catch (e1) {
      // Intento 2: leer texto y transformar a error legible
      try {
        const txt = await res.text();
        // ¿parece JSON?
        const trimmed = (txt || '').trim();
        if (trimmed.startsWith('{')) {
          try {
            const j2 = JSON.parse(trimmed);
            if (!j2.ok) throw new Error(j2.error || 'Error desconocido');
            return j2;
          } catch { /* sigue abajo */ }
        }
        throw new Error(txt.slice(0, 400) || 'Respuesta inválida de GAS');
      } catch (e2) {
        throw new Error(e2.message || 'Respuesta inválida');
      }
    }
  }

  const $ = (id) => document.getElementById(id);
  const val = (id) => $(id)?.value?.trim() || '';

  function collectData() {
    return {
      id: val('input-id'),
      fecha_iso: val('input-fecha') || new Date().toISOString(),
      nombre: val('input-nombre'),
      numero_nomina: val('input-nomina'),
      edad: val('input-edad'),
      sexo: $('select-sexo')?.value || '',
      puesto: val('input-puesto'),
      area_laboral: val('input-area-laboral'),
      area_incidente: val('input-area-incidente'),
      zona_cuerpo: val('input-zona'),
      hemisferio: val('input-hemisferio'),
      diagnostico: val('input-diagnostico'),
      exploracion: val('input-exploracion'),
      motivo: val('input-motivo'),
      antecedentes: val('input-antecedentes'),
      clasificacion: val('input-clasificacion'),
      seguimiento: val('input-seguimiento'),
      indicaciones: val('input-indicaciones'),
    };
  }

  function alertOK(msg) { window.alert(msg); }
  function alertErr(e) { window.alert(`No se pudo completar la operación: ${e.message || e}`); }

  function escapeHtml(s=''){return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

  function renderPending(items) {
    const list = $('pending-list');
    const empty = $('pending-empty');

    if (!Array.isArray(items) || items.length === 0) {
      list.style.display = 'none';
      empty.style.display = '';
      list.innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    list.style.display = '';
    list.innerHTML = items.map((it, idx) => {
      const titulo = it?.id || `(sin ID) #${idx+1}`;
      const fecha  = it?.fecha_iso || '';
      return `
        <li class="item">
          <div class="row">
            <div>
              <strong>${escapeHtml(titulo)}</strong>
              <br><small>${escapeHtml(fecha)}</small>
            </div>
            <div>
              <button data-id="${encodeURIComponent(it.id||'')}" class="btn btn-ghost btn-del">Eliminar</button>
              <button data-id="${encodeURIComponent(it.id||'')}" class="btn btn-secondary btn-send">Enviar</button>
            </div>
          </div>
        </li>`;
    }).join('');

    list.querySelectorAll('.btn-del').forEach(b=>{
      b.onclick = async () => {
        try {
          const id = decodeURIComponent(b.dataset.id||'');
          await postJSON('clinica_delete_pending', { id });
          await fetchPending();
        } catch(e){ alertErr(e); }
      };
    });
    list.querySelectorAll('.btn-send').forEach(b=>{
      b.onclick = async () => {
        try {
          const id = decodeURIComponent(b.dataset.id||'');
          await postJSON('clinica_send_pending', { id });
          await fetchPending();
        } catch(e){ alertErr(e); }
      };
    });
  }

  async function fetchPending() {
    try {
      const r = await postJSON('clinica_list_pending', {});
      renderPending(r.items || []);
    } catch(e) {
      $('pending-empty').innerText = `No se pudo listar (${e.message}).`;
      $('pending-list').style.display = 'none';
      $('pending-empty').style.display = '';
    }
  }

  async function saveCloud() {
    try {
      const payload = collectData();
      await postJSON('clinica_cloud_save', payload);
      alertOK('Guardado en la nube: OK');
      await fetchPending();
    } catch(e) { alertErr(e); }
  }

  async function closeCase() {
    try {
      const payload = collectData();
      await postJSON('clinica_close', payload);
      alertOK('Caso cerrado → hoja “Clínica”');
    } catch(e) { alertErr(e); }
  }

  function bind() {
    const btnClose = $('btn-close');
    const btnCloud = $('btn-cloud-save');
    const btnRefresh = $('btn-refresh-list');

    if (btnClose) btnClose.onclick = closeCase;
    if (btnCloud) btnCloud.onclick = saveCloud;
    if (btnRefresh) btnRefresh.onclick = fetchPending;

    fetchPending().catch(()=>{});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
