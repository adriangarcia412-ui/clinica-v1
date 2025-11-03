import App from './App.js';

const root = document.getElementById('app');
const app = App();
root.replaceChildren(app.el);

document.getElementById('tab-clinica').onclick = () => app.show('clinica');
document.getElementById('tab-pend').onclick = () => app.show('pendientes');
