const API_URL = "http://127.0.0.1:8000";

const token = localStorage.getItem("token_solicitante");
if (!token) {
    window.location.href = "entrada.html";
}

const saludoUsuario = document.getElementById("saludo-usuario");
const correoSesion = document.getElementById("correo-sesion");
const subtituloConsultar = document.getElementById("subtitulo-consultar");
const resumenSolicitudes = document.getElementById("resumen-solicitudes");
const botonSalir = document.getElementById("boton-salir");

const nombresEstado = {
    en_revision: "En revisión",
    en_cotizacion: "En cotización",
    en_transito: "En tránsito",
    completada: "Completada",
    creada: "Creada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
};

const estadosFinales = ["completada", "creada", "rechazada", "cancelada"];

botonSalir.addEventListener("click", function () {
    localStorage.removeItem("token_solicitante");
    window.location.href = "entrada.html";
});

document.getElementById("accion-crear").addEventListener("click", function () {
    window.location.href = "index.html";
});

document.getElementById("accion-consultar").addEventListener("click", function () {
    window.location.href = "consultar.html";
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
            if (perfil.nombre) {
                saludoUsuario.textContent = `Hola, ${perfil.nombre}`;
            }
            correoSesion.textContent = perfil.email;
        }
    } catch (error) {
        correoSesion.textContent = "";
    }
}

async function cargarResumen() {
    try {
        const respuesta = await fetch(`${API_URL}/solicitudes`, {
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            sesionExpirada();
            return;
        }

        if (!respuesta.ok) {
            resumenSolicitudes.innerHTML = "<p class='sin-solicitudes'>No se pudo cargar el resumen.</p>";
            return;
        }

        const solicitudes = await respuesta.json();
        const activas = solicitudes.filter(s => !estadosFinales.includes(s.status));

        // Subtítulo de la tarjeta con el conteo
        if (activas.length === 0) {
            subtituloConsultar.textContent = "Ver el estado de mis solicitudes";
        } else if (activas.length === 1) {
            subtituloConsultar.textContent = "Tienes 1 solicitud en curso";
        } else {
            subtituloConsultar.textContent = `Tienes ${activas.length} solicitudes en curso`;
        }

        // Actividad reciente: las 3 más recientes (la API ya las trae ordenadas por creación)
        if (solicitudes.length === 0) {
            resumenSolicitudes.innerHTML = "<p class='sin-solicitudes'>Todavía no tienes solicitudes registradas.</p>";
            return;
        }

        const recientes = solicitudes.slice(-3).reverse();
        resumenSolicitudes.innerHTML = "";

        recientes.forEach(function (s) {
            const nombreEstado = nombresEstado[s.status] || s.status;

            const fila = document.createElement("div");
            fila.className = "fila-resumen";
            fila.innerHTML = `
                <div class="info-resumen">
                    <div class="codigo-resumen">${s.code}</div>
                    <div class="descripcion-resumen">${s.description}</div>
                </div>
                <span class="estado estado-${s.status}" style="margin-top:0;">${nombreEstado}</span>
            `;
            resumenSolicitudes.appendChild(fila);
        });

    } catch (error) {
        resumenSolicitudes.innerHTML = "<p class='sin-solicitudes'>No se pudo conectar con el servidor.</p>";
    }
}

cargarPerfil();
cargarResumen();