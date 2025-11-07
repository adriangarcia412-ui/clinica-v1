// public/clinica-bridge.js
// Conecta los botones del formulario con el proxy /api/gsheet y tu GAS.
// IDs usados: btnCerrarCaso, btnGuardarNube, btnListarNube, listaPendientes
// Campos del form: coinciden con tus IDs actuales.

(function () {
  const $ = (sel) => document.querySelector(sel);

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function getFormData() {
    return {
      id: val('input-id'),
      fecha: val('input-fecha'),
      nombre: val('input-nombre'),
      nomina: val('input-nomina'),
      edad: val('input-edad'),
      sexo: val('select-sexo'),
      puesto: val('input-puesto'),
      area_laboral: val('input-area-laboral'),
      area_incidente: val('input-area-incidente'),
      zona: val('input-zona'),
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

  async function callApi(action, payload) {
    try {
      const resp = await fetch(`/api/gsheet?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        cache: 'no-store',
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok && data && data.ok !== false, data };
    } catch (e) {
      return { ok: false, data: { error: (e && e.message) || e } };
    }
  }

  function renderPendientes(items) {
    const cont = $('#listaPendientes');
    if (!cont) return;
    cont.innerHTML = '';
    if (!items || !items.length) {
      cont.innerHTML = '<p>No hay pendientes en la nube.</p>';
      return;
    }
    const ul = document.createElement('ul');
    ul.style.margin = '8px 0';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.textContent = `[${it.id || 's/id'}] ${it.nombre || ''} — ${it.fecha || ''}`;
      ul.appendChild(li);
    });
    cont.appendChild(ul);
  }

  async function listarPendientes() {
    const { ok, data } = await callApi('clinica_list_pending', {});
    if (!ok) {
      alert(`No se pudo listar (${data && data.error ? data.error : 'error desconocido'}).`);
      return;
    }
    renderPendientes(data.items || data.pendientes || []);
  }

  async function guardarNube() {
    const payload = getFormData();
    const { ok, data } = await callApi('clinica_cloud_save', payload);
    if (!ok) {
      alert(`No se pudo guardar en la nube: ${data && data.error ? data.error : 'error'}`);
      return;
    }
    alert('Pendiente guardado: OK');
    await listarPendientes();
  }

  async function cerrarCaso() {
    const payload = getFormData();
    const { ok, data } = await callApi('clinica_close', payload);
    if (!ok) {
      alert(`No se pudo cerrar el caso: ${data && data.error ? data.error : 'error'}`);
      return;
    }
    alert('Caso cerrado → hoja "Clínica": OK');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnCerrar = $('#btnCerrarCaso');
    const btnGuardar = $('#btnGuardarNube');
    const btnListar = $('#btnListarNube');

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarCaso);
    if (btnGuardar) btnGuardar.addEventListener('click', guardarNube);
    if (btnListar) btnListar.addEventListener('click', listarPendientes);

    // Carga inicial de pendientes
    listarPendientes();
  });
})();
