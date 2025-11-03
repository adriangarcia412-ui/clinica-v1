import { ClinicaAPI } from './api.js';

export default function Clinica() {
  const el = document.createElement('div');

  const form = {
    id: '',
    ts_creacion: new Date().toISOString(),
    trabajador: {
      nombre: '', id_empleado: '', edad: '', sexo: '',
      area: '', puesto: '', supervisor: ''
    },
    area_incidente: '',
    tipo_accidente: '',
    zona_afectada: '',
    partes_afectadas: '',
    hemisferio: '',
    clinico: { motivo:'', antecedentes:'', exploracion:'', diagnostico:'', tratamiento:'' },
    clasificacion_accidente: '',
    seguimiento: { cita_control:'' }
  };

  const bind = (path) => (ev) => {
    const val = ev.target.value;
    const segs = path.split('.');
    let p = form;
    while (segs.length > 1) p = p[segs.shift()];
    p[segs[0]] = val;
  };

  el.innerHTML = `
    <h2>Registro Clínico</h2>
    <div class="grid">
      <label>ID <input id="f-id"></label>
      <label>Fecha/Hora ISO <input id="f-ts"></label>
      <label>Nombre <input id="f-nombre"></label>

      <label>Número de nómina <input id="f-nomina"></label>
      <label>Edad <input id="f-edad"></label>
      <label>Sexo
        <select id="f-sexo">
          <option value=""></option>
          <option>F</option>
          <option>M</option>
        </select>
      </label>

      <label>Área laboral <input id="f-area"></label>
      <label>Área del incidente <input id="f-area-inc"></label>
      <label>Puesto <input id="f-puesto"></label>

      <label>Supervisor <input id="f-super"></label>
      <label>Tipo de accidente <input id="f-tipo"></label>
      <label>Zona del cuerpo afectada <input id="f-zona"></label>

      <label>Partes del cuerpo afectadas <input id="f-partes"></label>
      <label>Hemisferio <input id="f-hemi"></label>
      <label>Diagnóstico <input id="f-dx"></label>

      <label>Exploración <input id="f-expl"></label>
      <label>Motivo <input id="f-motivo"></label>
      <label>Antecedentes <input id="f-ant"></label>

      <label>Indicaciones/Tratamiento <input id="f-trat"></label>
      <label>Clasificación del accidente <input id="f-clasif"></label>
      <label>Seguimiento (cita) <input id="f-cita" type="date"></label>
    </div>

    <div class="row">
      <button id="b-pend">Guardar (Pendiente)</button>
      <button id="b-close">Cerrar caso → hoja “Clinica”</button>
    </div>
  `;

  // bindings
  el.querySelector('#f-id').oninput = bind('id');
  el.querySelector('#f-ts').value = form.ts_creacion;
  el.querySelector('#f-ts').oninput = bind('ts_creacion');
  el.querySelector('#f-nombre').oninput = bind('trabajador.nombre');
  el.querySelector('#f-nomina').oninput = bind('trabajador.id_empleado');
  el.querySelector('#f-edad').oninput = bind('trabajador.edad');
  el.querySelector('#f-sexo').oninput = bind('trabajador.sexo');
  el.querySelector('#f-area').oninput = bind('trabajador.area');
  el.querySelector('#f-area-inc').oninput = bind('area_incidente');
  el.querySelector('#f-puesto').oninput = bind('trabajador.puesto');
  el.querySelector('#f-super').oninput = bind('trabajador.supervisor');
  el.querySelector('#f-tipo').oninput = bind('tipo_accidente');
  el.querySelector('#f-zona').oninput = bind('zona_afectada');
  el.querySelector('#f-partes').oninput = bind('partes_afectadas');
  el.querySelector('#f-hemi').oninput = bind('hemisferio');
  el.querySelector('#f-dx').oninput = bind('clinico.diagnostico');
  el.querySelector('#f-expl').oninput = bind('clinico.exploracion');
  el.querySelector('#f-motivo').oninput = bind('clinico.motivo');
  el.querySelector('#f-ant').oninput = bind('clinico.antecedentes');
  el.querySelector('#f-trat').oninput = bind('clinico.tratamiento');
  el.querySelector('#f-clasif').oninput = bind('clasificacion_accidente');
  el.querySelector('#f-cita').oninput = bind('seguimiento.cita_control');

  el.querySelector('#b-pend').onclick = async () => {
    const out = await ClinicaAPI.savePending({
      id: form.id || undefined,
      ts: form.ts_creacion,
      trabajador: { nombre: form.trabajador.nombre, area: form.trabajador.area, supervisor: form.trabajador.supervisor },
      nota: form.clinico.motivo,
      json: JSON.stringify(form)
    });
    alert(out.ok ? `Pendiente guardado: ${out.id}` : `Error: ${out.error}`);
  };

  el.querySelector('#b-close').onclick = async () => {
    const out = await ClinicaAPI.closeCase(form);
    alert(out.ok ? `Caso cerrado: ${out.id}` : `Error: ${out.error}`);
  };

  return { el };
}
