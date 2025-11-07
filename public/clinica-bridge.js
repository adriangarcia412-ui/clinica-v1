(() => {
  const API = "/api/gsheet";

  async function postJSON(action, data) {
    const res = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const txt = await res.text();
    try { return JSON.parse(txt); }
    catch { return res.ok ? { ok:true, message:txt } : { ok:false, error:txt||"Error" }; }
  }

  function toast(msg){ alert(msg); }
  function val(id){ return document.getElementById(id)?.value?.trim() || ""; }

  function collectData(){
    if (typeof window.clinicaFormData === "function") return window.clinicaFormData();
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

  const listContainer = document.getElementById("cloud-list");

  function renderEmpty(msg){
    listContainer.innerHTML = `<div style="color:#475569">${msg || "No hay pendientes en la nube."}</div>`;
  }

  function renderList(items){
    if (!Array.isArray(items) || !items.length) return renderEmpty();
    listContainer.innerHTML = items.map(r=>{
      const id = r.id || r.ID || "(sin ID)";
      const nombre = r.nombre || r.Nombre || "";
      const fecha = r.fecha_iso || r.Fecha || "";
      return `
        <div class="card" style="margin:8px 0; padding:12px; border:1px solid #e2e8f0; border-radius:12px">
          <div><b>ID:</b> ${id}</div>
          <div><b>Nombre:</b> ${nombre}</div>
          <div><b>Fecha:</b> ${fecha}</div>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button data-del="${id}" class="btn btn-ghost">Eliminar</button>
          </div>
        </div>`;
    }).join("");

    listContainer.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute("data-del");
        const r = await postJSON("clinica_delete_pending", { id });
        if (!r.ok) return toast("No se pudo eliminar: " + (r.error || r.message || "Error"));
        await loadList();
      };
    });
  }

  async function loadList(){
    const r = await postJSON("clinica_list_pending", {});
    if (!r || !r.ok) return renderEmpty(r?.error || r?.message || "No se pudo listar.");
    // SOLO usamos JSON seguro; jamás inyectamos HTML crudo.
    renderList(r.items || r.data || []);
  }

  const btnSave = document.getElementById("btn-cloud-save");
  if (btnSave) btnSave.onclick = async ()=>{
    const r = await postJSON("clinica_cloud_save", collectData());
    if (!r.ok) return toast("No se pudo guardar en la nube: " + (r.error || r.message || "Error"));
    toast("Guardado en nube: OK");
    await loadList();
  };

  const btnClose = document.getElementById("btn-close");
  if (btnClose) btnClose.onclick = async ()=>{
    const r = await postJSON("clinica_close", collectData());
    if (!r.ok) return toast("No se pudo cerrar el caso: " + (r.error || r.message || "Error"));
    toast("Caso cerrado → hoja Clínica: OK");
  };

  const btnRefresh = document.getElementById("btn-cloud-refresh");
  if (btnRefresh) btnRefresh.onclick = loadList;

  loadList();
})();
