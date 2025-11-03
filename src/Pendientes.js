import { ClinicaAPI } from './api.js';

export default function Pendientes() {
  const el = document.createElement('div');
  el.innerHTML = `
    <h2>Pendientes (Clínica)</h2>
    <div class="row">
      <button id="b-refresh">Actualizar</button>
    </div>
    <table>
      <thead>
        <tr><th>ID</th><th>ISO</th><th>Trabajador</th><th>Área</th><th>Supervisor</th><th>Nota</th><th>Acción</th></tr>
      </thead>
      <tbody id="tb"></tbody>
    </table>
  `;

  async function load() {
    const out = await ClinicaAPI.listPending();
    const tb = el.querySelector('#tb');
    tb.innerHTML = '';
    (out.rows || []).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.iso}</td>
        <td>${r.trabajador || ''}</td>
        <td>${r.area || ''}</td>
        <td>${r.supervisor || ''}</td>
        <td>${r.nota || ''}</td>
        <td><button data-id="${r.id}">Eliminar</button></td>
      `;
      tr.querySelector('button').onclick = async (ev) => {
        const id = ev.target.getAttribute('data-id');
        const del = await ClinicaAPI.deletePending(id);
        if (del.removed) load();
      };
      tb.appendChild(tr);
    });
  }

  el.querySelector('#b-refresh').onclick = load;
  load();

  return { el };
}
