/* public/clinica-bridge.js
   Conecta el formulario con el proxy /api/gsheet (Vercel) y éste con GAS.
   Acciones GAS: CLOSE_CASE, SAVE_PENDING, LIST_PENDING, DELETE_PENDING.
*/

(function () {
  const API_BASE = (typeof window !== "undefined" && window.CLINICA_API_BASE) || "/api/gsheet";

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);
  const msg = (t) => alert(t);

  function val(id) { const el = $(id); return el ? el.value.trim() : ""; }

  function buildPayload() {
    return {
      id: val("input-id"),
      fecha_iso: val("input-fecha"),
      nombre: val("input-nombre"),
      nomina: val("input-nomina"),
      edad: val("input-edad"),
      sexo: $("#select-sexo") ? $("#select-sexo").value : "",
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

  async function callProxy(action, data) {
    // Siempre POST al proxy con ?action=<accion_front>
    const url = `${API_BASE}?action=${encodeURIComponent(action)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data || {}),
    });

    // No leer dos veces el body. Leemos una sola vez según content-type:
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (ct.includes("application/json")) {
      return await res.json();
    } else {
      const text = await res.text().catch(() => "");
      // Cuando GAS devuelve HTML (errores de Google), lo convertimos en error claro
      throw new Error("GAS devolvió una página HTML (posible error de Google o Web App sin permisos).");
    }
  }

  // ---- acciones de UI ----
  async function onClose() {
    try {
      const payload = buildPayload();
      const r = await callProxy("clinica_close", payload);
      msg(r?.message || "Caso cerrado: OK");
      await refreshList(); // refresca la lista abajo
    } catch (e) {
      msg(`No se pudo cerrar el caso: ${e.message || e}`);
    }
  }

  async function onCloudSave() {
    try {
      const payload = buildPayload();
      const r = await callProxy("clinica_cloud_save", payload);
      msg(r?.message || "Pendiente guardado: OK");
      await refreshList();
    } catch (e) {
      msg(`No se pudo guardar en la nube: ${e.message || e}`);
    }
  }

  function renderList(items) {
    const ul = $("cloud-list");
    const status = $("cloud-status");
    ul.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      status.textContent = "No hay pendientes en la nube.";
      return;
    }
    status.textContent = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "item";
      const left = document.createElement("div");
      left.innerHTML = `<strong>${it.id || "(sin ID)"} – ${it.nombre || ""}</strong><div class="muted">${it.fecha_iso || ""}</div>`;
      const right = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn btn-secondary";
      del.textContent = "Eliminar";
      del.onclick = async () => {
        try {
          await callProxy("clinica_delete_pending", { id: it.id });
          await refreshList();
        } catch (e) {
          msg(`No se pudo eliminar: ${e.message || e}`);
        }
      };
      right.appendChild(del);
      li.appendChild(left);
      li.appendChild(right);
      ul.appendChild(li);
    });
  }

  async function refreshList() {
    const status = $("cloud-status");
    status.textContent = "Cargando…";
    try {
      const r = await callProxy("clinica_list_pending", {});
      renderList(r?.items || []);
    } catch (e) {
      status.textContent = `No se pudo listar (${e.message || e}).`;
    }
  }

  // ---- listeners ----
  window.addEventListener("DOMContentLoaded", () => {
    $("btn-close")?.addEventListener("click", (ev) => { ev.preventDefault(); onClose(); });
    $("btn-cloud")?.addEventListener("click", (ev) => { ev.preventDefault(); onCloudSave(); });
    $("btn-refresh")?.addEventListener("click", (ev) => { ev.preventDefault(); refreshList(); });

    // carga inicial
    refreshList();
  });
})();
