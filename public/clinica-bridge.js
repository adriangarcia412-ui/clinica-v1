// public/clinica-bridge.js
// Engancha botones del formulario y habla con /api/gsheet (proxy a GAS).
// Requiere que existan en el HTML los botones con IDs:
// - #btnCerrarCaso
// - #btnGuardarNube
// - #btnListarNube
// Y un contenedor para la lista: #listaPendientes

(function () {
  const btnCerrar = document.querySelector("#btnCerrarCaso");
  const btnGuardarNube = document.querySelector("#btnGuardarNube");
  const btnListar = document.querySelector("#btnListarNube");
  const contLista = document.querySelector("#listaPendientes");

  // Serializa todos los inputs/select/textarea dentro de la página
  function serializeForm() {
    const fields = document.querySelectorAll("input, select, textarea");
    const obj = {};
    fields.forEach(el => {
      if (!el.id) return;
      obj[el.id] = el.value;
    });
    return obj;
  }

  async function callAPI(action, payload) {
    const url = `/api/gsheet?action=${encodeURIComponent(action)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const raw = await r.text();
      throw new Error(`Respuesta no JSON del proxy: ${raw?.slice(0, 300)}...`);
    }
    const j = await r.json();
    if (!j.ok) {
      // Si vino html_excerpt, muéstralo resumido
      if (j.html_excerpt) {
        throw new Error(`${j.error}\n\nHTML (parcial):\n${j.html_excerpt}`);
      }
      throw new Error(j.error || "Error desconocido");
    }
    return j;
  }

  async function onGuardarNube() {
    try {
      const data = serializeForm();
      await callAPI("clinica_cloud_save", { form: data });
      alert("Pendiente guardado en nube: OK");
      await onListar(); // refresca lista
    } catch (e) {
      alert(`No se pudo guardar en la nube:\n${e.message}`);
    }
  }

  async function onCerrarCaso() {
    try {
      const data = serializeForm();
      await callAPI("clinica_close", { form: data });
      alert("Caso cerrado → hoja “Clínica”: OK");
      await onListar();
    } catch (e) {
      alert(`No se pudo cerrar el caso:\n${e.message}`);
    }
  }

  function renderLista(items) {
    if (!Array.isArray(items) || items.length === 0) {
      contLista.innerHTML = `<p>No hay pendientes en la nube.</p>`;
      return;
    }
    const rows = items
      .map(it => {
        const folio = it.id || it.folio || it.ID || "";
        const fecha = it.fecha || it.fechaISO || "";
        const nombre = it["input-nombre"] || it.nombre || "";
        return `<li><strong>${folio}</strong> · ${fecha} · ${nombre}</li>`;
      })
      .join("");
    contLista.innerHTML = `<ul>${rows}</ul>`;
  }

  async function onListar() {
    try {
      const resp = await callAPI("clinica_list_pending", {});
      renderLista(resp.items || []);
    } catch (e) {
      contLista.innerHTML = `<p>No se pudo listar (${e.message}).</p>`;
      alert(`No se pudo listar (nube):\n${e.message}`);
    }
  }

  // Bind
  btnGuardarNube?.addEventListener("click", onGuardarNube);
  btnCerrar?.addEventListener("click", onCerrarCaso);
  btnListar?.addEventListener("click", onListar);

  // Auto-listar al cargar
  onListar().catch(() => {});
})();
