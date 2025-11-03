import Clinica from './Clinica.js';
import Pendientes from './Pendientes.js';

export default function App() {
  const el = document.createElement('div');
  const views = {
    clinica: Clinica(),
    pendientes: Pendientes()
  };
  el.appendChild(views.clinica.el);

  function show(name) {
    el.replaceChildren(views[name].el);
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.getElementById(name === 'clinica' ? 'tab-clinica' : 'tab-pend').classList.add('active');
  }
  return { el, show };
}
