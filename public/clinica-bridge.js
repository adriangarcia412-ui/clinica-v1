/* public/clinica-bridge.js
   Enlace del front con /api/gsheet (proxy a GAS).
   - Acciones: clinica_close, clinica_cloud_save, clinica_list_pending
*/

const $ = (sel) => document.querySelector(sel);

// --- Helpers UI ---
function alertMsg(msg) {
  window.alert(msg);
}

function btnBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = !!busy;
  btn.style.opacity = busy ? 0.7 : 1;
}

// Render de lista de pendientes
function renderPending(list) {
  const root = $("#cloud-list");
  root.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    root.innerHTML = `<div class="item muted">No hay pendientes en la nube.</div>`;
    return;
  }
  list.forEach((row) => {
    const id = row.id ?? row.ID ?? "(sin ID)";
    const nombre = row.nombre ?? row.Nombre ?? "";
    const fecha = row.fecha ?? row.Fecha ?? "";
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div><strong>${id}</strong> — ${nombre} <span class="muted">(${fecha})</span></div>`;
    root.appendChild(div);
  });
}

// Toma el formulario y arma el payload
function collectForm() {
  return {
    id: $("#input-id")?.value?.trim(),
    fechaIso: $("#input-fecha")?.value?.trim(),
    nombre: $("#input-nombre")?.value?.trim(),
    nomina: $("#input-nomina")?.value?.trim(),
    edad: $("#input-edad")?.value?.trim(),
    sexo: $("#select-sexo")?.value,
    puesto: $("#input-puesto")?.value?.trim(),
    areaLaboral: $("#input-area-laboral")?.value?.trim(),
    areaIncidente: $("#input-area-incidente")?.value?.trim(),
    zona: $("#input-zona")?.value?.trim(),
    hemisferio: $("#input-hemisferio")?.value?.trim(),
    diagnostico: $("#input-diagnostico")?.value?.trim(),
    exploracion: $("#input-exploracion")?.value?.trim(),
    motivo: $("#input-motivo")?.value?.trim(),
    antecedentes: $("#input-antecedentes")?.value?.trim(),
    clasificacion: $("#input-clasificacion")?.value?.trim(),
    seguimiento: $("#input-seguimiento")?.value?.trim(),
    indicaciones: $("#input-indicaciones")?.value?.trim(),
  };
}

// Llama al proxy /api/gsheet con una acción
async function callApi(action, data) {
  const url = `/api/gsheet?action=${encodeURIComponent(action)}`;
  const bodyText = JSON.stringify({ data });

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
  });

  // Leemos una SOLA vez
  const txt = await res.text();

  // Intentamos JSON; si es HTML o texto, damos mensaje claro
  let json;
  try {
    json = JSON.parse(txt);
  } catch {
    // Si devuelve HTML (p.ej. página de error Google), avisar
    if (txt.trim().startsWith("<!DOCTYPE") || txt.trim().startsWith("<html")) {
      throw new Error(
        "GAS devolvió una página HTML (posible error de Google). Verifica que el Web App esté publicado como 'Anyone' y activo, y que la variable GAS_CLINICA_URL en Vercel apunte al URL correcto (exec)."
      );
    }
    throw new Error(`Respuesta no JSON del backend: ${txt.slice(0, 180)}...`);
  }

  if (!res.ok || json?.ok === false) {
    const msg = json?.error || `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// Botón: Cerrar caso
$("#btn-cerrar")?.addEventListener("click", async () => {
  const btn = $("#btn-cerrar");
  try {
    btnBusy(btn, true);
    const payload = collectForm();
    const out = await callApi("clinica_close", payload);
    alertMsg(out?.message || "Caso cerrado OK.");
  } catch (e) {
    alertMsg("No se pudo cerrar el caso: " + e.message);
  } finally {
    btnBusy(btn, false);
  }
});

// Botón: Guardar en la nube (pendiente)
$("#btn-nube")?.addEventListener("click", async () => {
  const btn = $("#btn-nube");
  try {
    btnBusy(btn, true);
    const payload = collectForm();
    const out = await callApi("clinica_cloud_save", payload);
    alertMsg(out?.message || "Pendiente guardado OK.");
    // refrescar lista automáticamente
    await refreshList();
  } catch (e) {
    alertMsg("No se pudo guardar en la nube: " + e.message);
  } finally {
    btnBusy(btn, false);
  }
});

// Botón: Actualizar lista
$("#btn-refresh")?.addEventListener("click", async () => {
  await refreshList();
});

// Carga inicial de nota/estado y primer listado
(async function init() {
  $("#cloud-note").textContent =
    "Aquí verás los casos guardados temporalmente en la nube hasta que los envíes a la hoja 'Clínica'.";
  await refreshList();
})();

async function refreshList() {
  const st = $("#cloud-status");
  st.textContent = "Cargando…";
  try {
    const out = await callApi("clinica_list_pending", {});
    renderPending(out?.rows || out?.data || []);
    st.textContent = "Listo.";
  } catch (e) {
    st.textContent = "";
    alertMsg("No se pudo listar ( " + e.message + " ).");
    // Mostrar vacío pero sin romper
    renderPending([]);
  }
}
