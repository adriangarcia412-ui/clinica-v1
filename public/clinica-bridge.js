(() => {
  const API = "/api/gsheet"; // nuestro proxy

  // ===== util: fetch tolerante =====
  async function postJSON(action, data) {
    const res = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });

    // El proxy ya garantiza JSON; por robustez, hacemos plan B:
    let txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch (_) {
      return res.ok ? { ok: true, message: txt } : { ok: false, error: txt || "Error" };
    }
  }

  // ===== util: UI =====
  function val(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function collectData() {
    // Si el formulario define window.clinicaFormData(), úsalo (compatibilidad)
    if (typeof window.clinicaFormData === "function") {
      return window.clinicaFormData();
    }
    // Caso base: ids del layout actual
    return {
      id: val("input-id"),
      fecha_iso: val("input-fecha") || new Date().toISOString(),
      nombre: val("input-nombre"),
      numero_nomina: val("input-nomina"),
      edad: val("input-edad"),
      sexo: document.getElementById("select-sexo")?.value || "",
      puesto: val("input-puesto"),
      area_laboral: val("input-area-laboral"),
      area_incidente: val("input-area-incidente"),
      zona_cuerpo: val("input-zona"),
      hemisferio: val("input-hemisferio"),
      diagnostico: val("input-diagnostico"),
      exploracion: val("input-exploracion"),
      motivo: val("input-motivo"),
      antecedentes: val("input-antecedentes"),
      clasificacion: val("input-clasificacion"),
      seguimiento: val("input-seguimiento"),
      indicaciones: val("input-indicaciones"),
    };
  }

  function toast(msg) {
    alert(msg);
  }

  // ===== Render lista pendientes =====
  const listContainer = document.getElementById("cloud-list") || document.createElement("div");
  if (!listContainer.id) {
    listContainer.id = "cloud-list";
    // intenta montarlo en el bloque de “Casos en la nube (pendientes)”
    const host = document.getElementById("cloud-block");
    if (host) host.appendChild(listContainer);
    else document.body.appendChild(listContainer);
  }

  function renderEmpty(message) {
    listContainer.innerHTML =
      `<div style="color:#475569">${message || "No hay pendientes en la nube."}</div>`;
  }

  function renderList(items) {
    if (!Array.isArray(items) || !items.length) {
      return renderEmpty("No hay pendientes en la nube.");
    }
    const rows = items
      .map((r) => {
        const id = r.id || r.ID || "(sin ID)";
        const nombre = r.nombre || r.Nombre || "";
        const fecha = r.fecha_iso || r.Fecha || "";
        return `
          <div class="card" style="margin:8px 0; padding:12px; border:1px solid #e2e8f0; border-radius:12px">
            <div><b>ID:</b> ${id}</div>
            <div><b>Nombre:</b> ${nombre}</div>
            <div><b>Fecha:</b> ${fecha}</div>
            <div style="margin-top:8px; display:flex; gap:8px;">
              <button data-del="${id}" class="btn btn-secondary">Eliminar</button>
            </div>
          </div>`;
      })
      .join("");
    listContainer.innerHTML = rows;

    // enlazar eliminar
    listContainer.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-del");
        const r = await postJSON("clinica_delete_pending", { id });
        if (!r.ok) return toast("No se pudo eliminar: " + (r.error || r.message || "Error"));
        await loadList();
      };
    });
  }

  async function loadList() {
    const r = await postJSON("clinica_list_pending", {});
    if (!r.ok) return renderEmpty(r.error || r.message || "No se pudo listar.");
    renderList(r.items || r.data || []);
  }

  // ===== Botones =====
  const btnSaveCloud = document.getElementById("btn-cloud-save");
  if (btnSaveCloud) {
    btnSaveCloud.onclick = async () => {
      const data = collectData();
      const r = await postJSON("clinica_cloud_save", data);
      if (!r.ok) return toast("No se pudo guardar en la nube: " + (r.error || r.message || "Error"));
      toast("Guardado en nube: OK");
      await loadList();
    };
  }

  const btnClose = document.getElementById("btn-close");
  if (btnClose) {
    btnClose.onclick = async () => {
      const data = collectData();
      const r = await postJSON("clinica_close", data);
      if (!r.ok) return toast("No se pudo cerrar el caso: " + (r.error || r.message || "Error"));
      toast("Caso cerrado → hoja Clínica: OK");
    };
  }

  const btnRefresh = document.getElementById("btn-cloud-refresh");
  if (btnRefresh) btnRefresh.onclick = loadList;

  // Carga inicial de la lista
  loadList();
})();
