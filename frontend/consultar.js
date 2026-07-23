const API_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("token_solicitante");
if (!token) {
    window.location.href = "entrada.html";
}

const resultados = document.getElementById("resultados");
const buscadorCodigo = document.getElementById("buscador-codigo");
const filtroEstadoConsulta = document.getElementById("filtro-estado-consulta");
const botonSalir = document.getElementById("boton-salir");
const sesionActiva = document.getElementById("sesion-activa");

let misSolicitudes = [];

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
    localStorage.removeItem("token_solicitante");
    window.location.href = "entrada.html";
});

function sesionExpirada() {
    localStorage.removeItem("token_solicitante");
    window.location.href = "entrada.html";
}

async function cargarPerfil() {
    try {
        const respuesta = await fetch(`${API_URL}/mi-perfil`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            sesionExpirada();
            return;
        }

        if (respuesta.ok) {
            const perfil = await respuesta.json();
            sesionActiva.textContent = `Sesión: ${perfil.email}`;
        }
    } catch (error) {
        sesionActiva.textContent = "";
    }
}

async function cargarSolicitudes() {
    resultados.innerHTML = "<p>Cargando...</p>";

    try {
        const respuesta = await fetch(`${API_URL}/solicitudes`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            sesionExpirada();
            return;
        }

        if (!respuesta.ok) {
            resultados.innerHTML = "<p style='color:#c53030;'>No se pudieron cargar tus solicitudes.</p>";
            return;
        }

        misSolicitudes = await respuesta.json();

        if (misSolicitudes.length === 0) {
            resultados.innerHTML = "<p>Todavía no tienes solicitudes registradas.</p>";
            return;
        }

        dibujarMisSolicitudes();

    } catch (error) {
        resultados.innerHTML = "<p style='color:#c53030;'>No se pudo conectar con el servidor.</p>";
    }
}

function dibujarMisSolicitudes() {
    const texto = buscadorCodigo.value.trim().toLowerCase();
    const estado = filtroEstadoConsulta.value;

    const estadosCerrados = ["completada", "creada", "rechazada", "cancelada"];

    const filtradas = misSolicitudes.filter(function (s) {
        // Si hay búsqueda por código, ignora el filtro de estado
        if (texto !== "") {
            return s.code.toLowerCase().includes(texto);
        }

        if (estado === "activas") {
            return !estadosCerrados.includes(s.status);
        }
        if (estado === "cerradas") {
            return estadosCerrados.includes(s.status);
        }
        if (estado === "") {
            return true;
        }
        return s.status === estado;
    });

    if (filtradas.length === 0) {
        resultados.innerHTML = "<p>No se encontraron solicitudes con esos criterios.</p>";
        return;
    }

    let html = `<div class="contador-resultados">Mostrando ${filtradas.length} de ${misSolicitudes.length} solicitudes</div>`;
    resultados.innerHTML = html;

    filtradas.forEach(function (s) {
        const nombreEstado = nombresEstado[s.status] || s.status;

        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-solicitud";

        let motivoHtml = "";
        if (s.last_comment) {
            motivoHtml = `<div class="tarjeta-fila motivo-rechazo"><strong>Motivo:</strong> ${s.last_comment}</div>`;
        }

        tarjeta.innerHTML = `
            <div class="tarjeta-codigo">${s.code}</div>
            <div class="tarjeta-fila">${s.description}</div>
            <div class="tarjeta-fila">Área: ${s.area}</div>
            <span class="estado estado-${s.status}">${nombreEstado}</span>
            ${motivoHtml}
        `;
        resultados.appendChild(tarjeta);
    });
}

buscadorCodigo.addEventListener("input", dibujarMisSolicitudes);
filtroEstadoConsulta.addEventListener("change", dibujarMisSolicitudes);

cargarPerfil();
cargarSolicitudes();