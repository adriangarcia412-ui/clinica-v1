/* public/clinica-bridge.js
   Conecta el formulario con /api/gsheet (proxy hacia Google Apps Script).
   Incluye tolerancia a:
   - HTML devuelto por GAS (cuando Google muestra una página de error)
   - “body stream already read”
   - Diferentes nombres de acción (SOC vs CLÍNICA)
*/

const byId = (id) => document.getElementById(id);

const $fields = {
  id: byId('input-id'),
  fecha: byId('input-fecha'),
  nombre: byId('input-nombre'),
  nomina: byId('input-nomina'),
  edad: byId('input-edad'),
  sexo: byId('select-sexo'),
  puesto: byId('input-puesto'),
  area_laboral: byId('input-area-laboral'),
  area_incidente: byId('input-area-incidente'),
  zona: byId('input-zona'),
  hemisferio: byId('input-hemisferio'),
  diagnostico: byId('input-diagnostico'),
  exploracion: byId('input-exploracion'),
  motivo: byId('input-motivo'),
  antecedentes: byId('input-antecedentes'),
  clasificacion: byId('input-clasificacion'),
  seguimiento: byId('input-seguimiento'),
  indicaciones: byId('input-indicaciones'),
};

function readForm() {
  return {
    id: $fields.id.value.trim(),
    fecha_iso: $fields.fecha.value.trim(),
    nombre: $fields.nombre.value.trim(),
    nomina: $fields.nomina.value.trim(),
    edad: $fields.edad.value.trim(),
    sexo: $fields.sexo.value,
    puesto: $fields.puesto.value.trim(),
    area_laboral: $fields.area_laboral.value.trim(),
    area_incidente: $fields.area_incidente.value.trim(),
    zona: $fields.zona.value.trim(),
    hemisferio: $fields.hemisferio.value.trim(),
    diagnostico: $fields.diagnostico.value.trim(),
    exploracion: $fields.exploracion.value.trim(),
    motivo: $fields.motivo.value.trim(),
    antecedentes: $fields.antecedentes.value.trim(),
    clasificacion: $fields.clasificacion.value.trim(),
    seguimiento: $fields.seguimiento.value.trim(),
    indicaciones: $fields.indicaciones.value.trim(),
  };
}

async function fetchJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data),
  });

  // NO volvemos a leer el cuerpo dos veces: leemos una sola vez como texto y luego parseamos si es JSON.
  const text = await res.text();
  const ctype = res.headers.get('content-type') || '';

  if (!res.ok) {
    // devolvemos texto crudo para diagnóstico
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (ctype.includes('application/json')) {
    try { return JSON.parse(text); }
    catch(e){ throw new Error(`Respuesta JSON inválida: ${e.message}`); }
  }

  // GAS a veces devuelve páginas HTML de error
  if (ctype.includes('text/html') || text.startsWith('<!DOCTYPE html')) {
    throw new Error('GAS devolvió una página HTML (posible error de Google). Revisa que el Web App esté activo y publicado como "Anyone".');
  }

  // fallback
  throw new Error('Respuesta de GAS no es JSON.');
}

function setLoading(on) {
  byId('btn-close').disabled = on;
  byId('btn-cloud-save').disabled = on;
  byId('btn-refresh').disabled = on;
}

function showAlert(msg) {
  alert(msg);
}

function renderCloudList(items) {
  const list = byId('cloud-list');
  const empty = byId('cloud-empty');

  list.innerHTML = '';
  if (!items || !items.length) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';

  for (const it of items) {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <div><strong>${it.id || '(sin ID)'}</strong> — ${it.nombre || ''}</div>
        <small>${it.fecha_iso || ''}</small>
      </div>
      <div class="right">
        <button class="danger" data-id="${it._pending_id || it.id}">Eliminar</button>
      </div>
    `;
    list.appendChild(div);
  }

  // bind delete
  list.querySelectorAll('.danger').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const pid = btn.getAttribute('data-id');
      if (!pid) return;
      try {
        setLoading(true);
        await fetchJSON('/api/gsheet', { action:'clinica_delete_pending', payload:{ pending_id: pid } });
        await refreshCloud();
      } catch(e){ showAlert(`No se pudo eliminar: ${e.message}`); }
      finally { setLoading(false); }
    });
  });
}

async function refreshCloud() {
  try {
    setLoading(true);
    byId('cloud-empty').textContent = 'Cargando...';
    const resp = await fetchJSON('/api/gsheet', { action:'clinica_list_pending' });
    renderCloudList(resp?.data || []);
  } catch(e) {
    byId('cloud-empty').textContent = `No se pudo listar (${e.message}).`;
    byId('cloud-list').style.display = 'none';
  } finally {
    setLoading(false);
  }
}

async function onCloseCase() {
  const data = readForm();
  try {
    setLoading(true);
    const resp = await fetchJSON('/api/gsheet', { action:'clinica_close', payload:data });
    showAlert(resp?.message || 'Cerrado OK');
  } catch(e) {
    showAlert(`No se pudo cerrar el caso: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

async function onCloudSave() {
  const data = readForm();
  try {
    setLoading(true);
    const resp = await fetchJSON('/api/gsheet', { action:'clinica_cloud_save', payload:data });
    showAlert(resp?.message || 'Pendiente guardado: OK');
    await refreshCloud();
  } catch(e) {
    showAlert(`No se pudo guardar en la nube: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  byId('cloud-hint').textContent = 'Aquí verás los casos que se guardan temporalmente en la nube y quedan pendientes para ser enviados a la hoja.';
  byId('btn-close').addEventListener('click', onCloseCase);
  byId('btn-cloud-save').addEventListener('click', onCloudSave);
  byId('btn-refresh').addEventListener('click', refreshCloud);
  // Carga inicial de pendientes
  refreshCloud();
});
