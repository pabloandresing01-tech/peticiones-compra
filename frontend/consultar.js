const API_URL = "http://127.0.0.1:8000";

const botonBuscar = document.getElementById("boton-buscar");
const inputEmail = document.getElementById("email-consulta");
const resultados = document.getElementById("resultados");

const nombresEstado = {
    ingresada: "Ingresada",
    en_revision: "En revisión",
    en_cotizacion: "En cotización",
    aprobada: "Aprobada",
    oc_emitida: "OC emitida",
    en_transito: "En tránsito",
    cerrada: "Cerrada",
    rechazada: "Rechazada",
    devuelta: "Devuelta",
};

botonBuscar.addEventListener("click", async function () {
    const email = inputEmail.value.trim();

    if (email === "") {
        resultados.innerHTML = "<p style='color:#c53030;'>Por favor ingresa un correo.</p>";
        return;
    }

    resultados.innerHTML = "<p>Buscando...</p>";

    try {
        const respuesta = await fetch(`${API_URL}/solicitudes?email=${email}`);
        const solicitudes = await respuesta.json();

        if (solicitudes.length === 0) {
            resultados.innerHTML = "<p>No se encontraron solicitudes para ese correo.</p>";
            return;
        }

        resultados.innerHTML = "";

        solicitudes.forEach(function (s) {
            const nombreEstado = nombresEstado[s.status] || s.status;

            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-solicitud";
            tarjeta.innerHTML = `
                <div class="tarjeta-codigo">${s.code}</div>
                <div class="tarjeta-fila">${s.description}</div>
                <div class="tarjeta-fila">Área: ${s.area}</div>
                <span class="estado estado-${s.status}">${nombreEstado}</span>
            `;
            resultados.appendChild(tarjeta);
        });

    } catch (error) {
        resultados.innerHTML = "<p style='color:#c53030;'>No se pudo conectar con el servidor.</p>";
    }
});