const API_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

const listaSolicitudes = document.getElementById("lista-solicitudes");
const sesionUsuario = document.getElementById("sesion-usuario");
const botonSalir = document.getElementById("boton-salir");
const buscador = document.getElementById("buscador");
const filtroEstado = document.getElementById("filtro-estado");

let todasLasSolicitudes = [];

const nombresEstado = {
    en_revision: "En revisión",
    en_cotizacion: "En cotización",
    en_transito: "En tránsito",
    completada: "Completada",
    creada: "Creada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
};

botonSalir.addEventListener("click", function () {
    localStorage.removeItem("token");
    window.location.href = "login.html";
});

async function cargarPerfil() {
    try {
        const respuesta = await fetch(`${API_URL}/perfil`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (respuesta.ok) {
            const datos = await respuesta.json();
            sesionUsuario.textContent = `Sesión de ${datos.nombre}`;
        }
    } catch (error) {
        sesionUsuario.textContent = "";
    }
}

async function cargarSolicitudes() {
    listaSolicitudes.innerHTML = "<p>Cargando solicitudes...</p>";

    try {
        const respuesta = await fetch(`${API_URL}/panel/solicitudes`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        todasLasSolicitudes = await respuesta.json();
        dibujarSolicitudes();

    } catch (error) {
        listaSolicitudes.innerHTML = "<p style='color:#c53030;'>No se pudo conectar con el servidor.</p>";
    }
}

function dibujarSolicitudes() {
    const texto = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filtradas = todasLasSolicitudes.filter(function (s) {
        const coincideTexto =
            texto === "" ||
            s.code.toLowerCase().includes(texto) ||
            s.requester_email.toLowerCase().includes(texto);

        const estadosFinales = ["completada", "creada", "rechazada", "cancelada"];
        const coincideEstado =
            estado === "" ? !estadosFinales.includes(s.status) : s.status === estado;

        return coincideTexto && coincideEstado;
    });

    if (todasLasSolicitudes.length === 0) {
        listaSolicitudes.innerHTML = "<p>No hay solicitudes registradas.</p>";
        return;
    }

    if (filtradas.length === 0) {
        listaSolicitudes.innerHTML = "<p>No se encontraron solicitudes con esos criterios.</p>";
        return;
    }

    let html = `<div class="contador-resultados">Mostrando ${filtradas.length} de ${todasLasSolicitudes.length} solicitudes</div>`;
    listaSolicitudes.innerHTML = html;

    filtradas.forEach(function (s) {
        const nombreEstado = nombresEstado[s.status] || s.status;
        const tipoTexto = s.type === "compra" ? "Solicitud de Compra" : "Solicitud de OC";

        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-solicitud";

        let motivoHtml = "";
        if (s.last_comment) {
            motivoHtml = `<div class="tarjeta-fila motivo-rechazo"><strong>Motivo:</strong> ${s.last_comment}</div>`;
        }

        tarjeta.innerHTML = `
            <div class="tarjeta-codigo">${s.code}</div>
            <div class="tarjeta-fila"><strong>${tipoTexto}</strong> · ${s.area}</div>
            <div class="tarjeta-fila">${s.description}</div>
            <div class="tarjeta-fila">Solicitante: ${s.requester_name} (${s.requester_email})</div>
            <div class="tarjeta-fila">Fecha límite: ${s.due_date}</div>
            <span class="estado estado-${s.status}">${nombreEstado}</span>
            ${motivoHtml}
            <button class="boton-detalle" data-codigo="${s.code}">Ver detalle</button>
            <div class="detalle-solicitud" id="detalle-${s.code}"></div>
            <div class="acciones-estado">
                <select id="select-${s.code}">
                    <option value="">Cambiar estado a...</option>
                    <option value="en_revision">En revisión</option>
                    <option value="en_cotizacion">En cotización</option>
                    <option value="en_transito">En tránsito</option>
                    <option value="completada">Completada</option>
                    <option value="creada">Creada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="cancelada">Cancelada</option>
                </select>
                <button class="boton-cambiar" data-codigo="${s.code}">Actualizar</button>
            </div>
        `;
        listaSolicitudes.appendChild(tarjeta);
    });

    document.querySelectorAll(".boton-detalle").forEach(function (boton) {
        boton.addEventListener("click", function () {
            const codigo = boton.getAttribute("data-codigo");
            mostrarDetalle(codigo);
        });
    });

    document.querySelectorAll(".boton-cambiar").forEach(function (boton) {
        boton.addEventListener("click", function () {
            const codigo = boton.getAttribute("data-codigo");
            const select = document.getElementById(`select-${codigo}`);
            cambiarEstado(codigo, select.value);
        });
    });
}

buscador.addEventListener("input", dibujarSolicitudes);
filtroEstado.addEventListener("change", dibujarSolicitudes);

async function cambiarEstado(codigo, nuevoEstado) {
    if (nuevoEstado === "") {
        alert("Selecciona un estado primero.");
        return;
    }

    let comentario = null;

    if (nuevoEstado === "rechazada" || nuevoEstado === "cancelada") {
        const accion = nuevoEstado === "rechazada" ? "rechazo" : "cancelación";
        comentario = prompt(`Indica el motivo de la ${accion}:`);

        if (comentario === null) {
            return;
        }

        if (comentario.trim() === "") {
            alert(`Debes indicar el motivo de la ${accion}.`);
            return;
        }
    }

    try {
        const respuesta = await fetch(`${API_URL}/panel/solicitudes/${codigo}/estado`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ nuevo_estado: nuevoEstado, comentario: comentario }),
        });

        if (respuesta.ok) {
            cargarSolicitudes();
        } else {
            const error = await respuesta.json();
            alert(error.detail || "No se pudo cambiar el estado.");
        }
    } catch (error) {
        alert("No se pudo conectar con el servidor.");
    }
}

async function mostrarDetalle(codigo) {
    const contenedor = document.getElementById(`detalle-${codigo}`);

    if (contenedor.innerHTML !== "") {
        contenedor.innerHTML = "";
        return;
    }

    contenedor.innerHTML = "<p>Cargando detalle...</p>";

    try {
        const respuesta = await fetch(`${API_URL}/panel/solicitudes/${codigo}`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (!respuesta.ok) {
            contenedor.innerHTML = "<p>No se pudo cargar el detalle.</p>";
            return;
        }

        const d = await respuesta.json();

        let html = "<div class='detalle-bloque'>";
        html += `<div class="detalle-item"><strong>Cuenta contable:</strong> ${d.tax_account}</div>`;
        html += `<div class="detalle-item"><strong>Centro de costo:</strong> ${d.cost_center}</div>`;

        if (d.quantity !== null) {
            html += `<div class="detalle-item"><strong>Cantidad:</strong> ${d.quantity}</div>`;
        }
        if (d.tech_references) {
            html += `<div class="detalle-item"><strong>Referencias técnicas:</strong> ${d.tech_references}</div>`;
        }
        if (d.supplier) {
            html += `<div class="detalle-item"><strong>Proveedor:</strong> ${d.supplier}</div>`;
        }
        if (d.supplier_tax_id) {
            html += `<div class="detalle-item"><strong>RUT empresa:</strong> ${d.supplier_tax_id}</div>`;
        }

        html += "<div class='detalle-item'><strong>Archivos adjuntos:</strong></div>";
        if (d.attachments.length === 0) {
            html += "<div class='detalle-item'>Sin archivos adjuntos</div>";
        } else {
            d.attachments.forEach(function (a) {
                html += `<div class="detalle-item"><a href="#" class="enlace-archivo" data-id="${a.id}" data-nombre="${a.file_name}">${a.file_name}</a></div>`;
            });
        }

        html += "<div class='detalle-item'><strong>Historial:</strong></div>";
        d.history.forEach(function (h) {
            const anterior = h.old_status ? `${nombresEstado[h.old_status] || h.old_status} → ` : "";
            const nuevo = nombresEstado[h.new_status] || h.new_status;
            const fecha = new Date(h.created_at).toLocaleString("es-CL");
            const comentario = h.comment ? ` · ${h.comment}` : "";
            html += `<div class="detalle-item historial-item">${fecha} — ${anterior}${nuevo}${comentario}</div>`;
        });

        html += "</div>";
        contenedor.innerHTML = html;

        contenedor.querySelectorAll(".enlace-archivo").forEach(function (enlace) {
            enlace.addEventListener("click", function (e) {
                e.preventDefault();
                descargarArchivo(enlace.getAttribute("data-id"), enlace.getAttribute("data-nombre"));
            });
        });

    } catch (error) {
        contenedor.innerHTML = "<p>No se pudo conectar con el servidor.</p>";
    }
}

async function descargarArchivo(id, nombre) {
    try {
        const respuesta = await fetch(`${API_URL}/panel/archivos/${id}`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (!respuesta.ok) {
            alert("No se pudo descargar el archivo.");
            return;
        }

        const blob = await respuesta.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        alert("No se pudo conectar con el servidor.");
    }
}

cargarPerfil();
cargarSolicitudes();