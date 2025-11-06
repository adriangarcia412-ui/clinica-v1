(() => {
  const API = '/api/gsheet';

  async function postJSON(action, data) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Error desconocido');
    return j;
  }

  function val(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  function collectData() {
    if (typeof window.clinicaFormData === 'function') {
      return window.clinicaFormData();
    }
    return {
      id: val('input-id'),
      fecha_iso: val('input-fecha') || new Date().toISOString(),
      nombre: val('input-nombre'),
      numero_nomina: val('input-nomina'),
      edad: val('input-edad'),
      sexo: document.getElementById('select-sexo')?.value || '',
      area_laboral: val('input-area-laboral'),
      area_incidente: val('input-area-incidente'),
      puesto: val('input-puesto'),
      zona_cuerpo: val('input-zona'),
      diagnostico: val('input-diagnostico'),
      exploracion: val('input-exploracion'),
      motivo: val('input-motivo'),
      antecedentes: val('input-antecedentes'),
      hemisferio: val('input-hemisferio'),
      clasificacion: val('input-clasificacion'),
      indicaciones: val('input-indicaciones'),
      seguimiento: val('input-seguimiento'),
    };
  }

  async function onSavePending(ev) {
    try {
      ev?.preventDefault?.();
      const data = collectData();
      const out = await postJSON('clinica_save_pending', data);
      alert(`Pendiente guardado: ${out.id || 'OK'}`);
    } catch (err) {
      alert(`Error al guardar pendiente: ${err.message}`);
    }
  }

  async function onCloseCase(ev) {
    try {
      ev?.preventDefault?.();
      const data = collectData();
      const out = await postJSON('clinica_close', data);
      alert(`Caso cerrado: ${out.id || 'OK'}`);
    } catch (err) {
      alert(`Error al cerrar caso: ${err.message}`);
    }
  }

  function findButton(regex) {
    return [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
      .find(b => regex.test((b.textContent || b.value || '').trim()));
  }

  function bind() {
    const bSave  = findButton(/guardar\s*\(pendiente\)/i);
    const bClose = findButton(/cerrar\s*caso/i);

    if (bSave && !bSave._clinicaBound) {
      bSave.addEventListener('click', onSavePending);
      bSave._clinicaBound = true;
    }
    if (bClose && !bClose._clinicaBound) {
      bClose.addEventListener('click', onCloseCase);
      bClose._clinicaBound = true;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    setTimeout(bind, 400);
    setTimeout(bind, 1000);
    setTimeout(bind, 2000);
  });
})();
