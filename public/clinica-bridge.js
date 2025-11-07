// public/clinica-bridge.js
(function () {
  const $ = (sel) => document.querySelector(sel);
  const statusEl = $("#cloud-status");
  const listEl = $("#cloud-list");

  function showAlert(msg) {
    try {
      if (typeof msg === "string" && msg.startsWith("{")) {
        const j = JSON.parse(msg);
        if (j && j.error) msg = j.error;
      }
    } catch (_) {}
    if (typeof msg === "string" && msg.includes("<!DOCTYPE")) {
      msg = 'GAS devolvió una página HTML (posible error de Google / Web App no publicado como "Anyone").';
    }
    alert(msg);
  }

  function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function collectForm() {
    return {
      id: getVal("input-id"),
      fecha_iso: getVal("input-fecha"),
      nombre: getVal("input-nombre"),
      nomina: getVal("input-nomina"),
      edad: getVal("input-edad"),
      sexo: (document.getElementById("select-sexo") || { value: "" }).value,
      puesto: getVal("input-puesto"),
      area_laboral: getVal("input-area-laboral"),
      area_incidente: getVal("input-area-incidente"),
      zona_cuerpo: getVal("input-zona"),
      hemisferio: getVal("input-hemisferio"),
      diagnostico: getVal("input-diagnostico"),
      exploracion: getVal("input-exploracion"),
      motivo: getVal("input-motivo"),
      antecedentes: getVal("input-antecedentes"),
      clasificacion: getVal("input-clasificacion"),
      seguimiento: getVal("input-seguimiento"),
      indicaciones: getVal("input-indicaciones"),
    };
  }

  async function callApi(action, payload) {
    const r = await fetch("/api/gsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const text = await r.text(); // no consumimos dos veces
    try {
      return JSON.parse(text);
    } catch (_) {
      return { ok: false, error: text };
    }
  }

  function renderList(items) {
    listEl.innerHTML = "";
    if (!items || !items.length) {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `<div class="row-col muted">No hay pendientes en la nube.</div>`;
      listEl.appendChild(row);
      return;
    }
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <div class="row-col"><b>${it.id || "(sin ID)"}</b> — ${it.nombre || ""} <span class="muted">${it.fecha_iso || ""}</span></div>
        <div class="row-actions">
          <button class="btn-mini" data-del="${it._pending_id}">Eliminar</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = btn.getAttribute("data-del");
        const res = await callApi("clinica_delete_pending", { pending_id: pid });
        if (!res.ok) return showAlert(res.error || "No se pudo eliminar.");
        await refreshList();
      });
    });
  }

  async function refreshList() {
    statusEl.textContent = "Cargando…";
    const res = await callApi("clinica_list_pending", {});
    if (!res.ok) {
      renderList([]);
      return showAlert(res.error || "No se pudo listar.");
    }
    renderList(res.data || []);
  }

  async function onClose() {
    const data = collectForm();
    const res = await callApi("clinica_close", data);
    if (!res.ok) return showAlert(res.error || "No se pudo cerrar el caso.");
    alert(res.message || "Cerrado OK");
    await refreshList();
  }

  async function onCloudSave() {
    const data = collectForm();
    const res = await callApi("clinica_cloud_save", data);
    if (!res.ok) return showAlert(res.error || "No se pudo guardar en la nube.");
    alert(res.message || "Pendiente guardado: OK");
    await refreshList();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btnClose = document.getElementById("btn-close");
    const btnCloud = document.getElementById("btn-cloud");
    const btnRefresh = document.getElementById("btn-refresh");

    if (btnClose) btnClose.addEventListener("click", onClose);
    if (btnCloud) btnCloud.addEventListener("click", onCloudSave);
    if (btnRefresh) btnRefresh.addEventListener("click", refreshList);

    refreshList();
  });
})();
