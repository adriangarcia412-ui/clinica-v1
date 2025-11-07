// public/clinica-bridge.js
// Marca para comprobar carga
window.__bridge_ok__ = true;

(function () {
  function q(id) { return document.getElementById(id); }

  const btnCerrar = q('btnCerrarCaso');
  const btnGuardar = q('btnGuardarNube');
  const btnListar = q('btnListarNube');
  const contLista = q('listaPendientes');

  // Serializa todos los inputs/select/textarea por ID
  function serializeForm() {
    const fields = document.querySelectorAll('input, select, textarea');
    const o = {};
    fields.forEach(el => {
      if (el.id) o[el.id] = el.value;
    });
    return o;
  }

  async function callAPI(action, payload) {
    const url = `/api/gsheet?action=${encodeURIComponent(action)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const raw = await r.text();
      throw new Error(`Respuesta no JSON del proxy: ${raw.slice(0, 300)}...`);
    }
    const j = await r.json();
    if (!j.ok) {
      if (j.html_excerpt) throw new Error(`${j.error}\n\nHTML:\n${j.html_excerpt}`);
      throw new Error(j.error || 'Error desconocido');
    }
    return j;
  }

  function renderLista(items) {
    if (!Array.isArray(items) || items.length === 0) {
      contLista.innerHTML = '<p>No hay pendientes en la nube.</p>';
      return;
    }
    const lis = items.map(it => {
      const folio = it['input-id'] || it.id || '';
      const fecha = it['input-fecha'] || it.fecha || '';
      const nombre = it['input-nombre'] || it.nombre || '';
      return `<li><strong>${folio}</strong> · ${fecha} · ${nombre}</li>`;
    }).join('');
    contLista.innerHTML = `<ul>${lis}</ul>`;
  }

  async function onGuardar() {
    try {
      const form = serializeForm();
      await callAPI('clinica_cloud_save', { form });
      alert('Pendiente guardado en nube: OK');
      await onListar();
    } catch (e) {
      alert('No se pudo guardar en la nube:\n' + e.message);
    }
  }

  async function onCerrar() {
    try {
      const form = serializeForm();
      await callAPI('clinica_close', { form });
      alert('Caso cerrado → hoja “Clínica”: OK');
      await onListar();
    } catch (e) {
      alert('No se pudo cerrar el caso:\n' + e.message);
    }
  }

  async function onListar() {
    try {
      const r = await callAPI('clinica_list_pending', {});
      renderLista(r.items || []);
    } catch (e) {
      contLista.innerHTML = `<p>No se pudo listar (${e.message}).</p>`;
    }
  }

  // IMPORTANTÍSIMO: atar eventos (si no existen los elementos, alertamos)
  if (!btnCerrar || !btnGuardar || !btnListar || !contLista) {
    alert('Faltan IDs en el HTML (btnCerrarCaso / btnGuardarNube / btnListarNube / listaPendientes). Corrige el app.html');
    return;
  }

  btnGuardar.addEventListener('click', onGuardar);
  btnCerrar.addEventListener('click', onCerrar);
  btnListar.addEventListener('click', onListar);

  // auto-listar al cargar
  document.addEventListener('DOMContentLoaded', onListar);
})();
