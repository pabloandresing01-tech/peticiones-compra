const API_URL = "http://127.0.0.1:8000";

const botonBuscar = document.getElementById("boton-buscar");
const inputEmail = document.getElementById("email-consulta");
const resultados = document.getElementById("resultados");
const filtrosConsulta = document.getElementById("filtros-consulta");
const buscadorCodigo = document.getElementById("buscador-codigo");
const filtroEstadoConsulta = document.getElementById("filtro-estado-consulta");

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

botonBuscar.addEventListener("click", async function () {
    const email = inputEmail.value.trim();

    if (email === "") {
        resultados.innerHTML = "<p style='color:#c53030;'>Por favor ingresa un correo.</p>";
        filtrosConsulta.style.display = "none";
        return;
    }

    resultados.innerHTML = "<p>Buscando...</p>";
    filtrosConsulta.style.display = "none";

    try {
        const respuesta = await fetch(`${API_URL}/solicitudes?email=${email}`);
        misSolicitudes = await respuesta.json();

        if (misSolicitudes.length === 0) {
            resultados.innerHTML = "<p>No se encontraron solicitudes para ese correo.</p>";
            return;
        }

        buscadorCodigo.value = "";
        filtroEstadoConsulta.value = "";
        filtrosConsulta.style.display = "flex";
        dibujarMisSolicitudes();

    } catch (error) {
        resultados.innerHTML = "<p style='color:#c53030;'>No se pudo conectar con el servidor.</p>";
    }
});

function dibujarMisSolicitudes() {
    const texto = buscadorCodigo.value.trim().toLowerCase();
    const estado = filtroEstadoConsulta.value;

    const estadosFinales = ["completada", "creada"];

    const filtradas = misSolicitudes.filter(function (s) {
        const coincideTexto = texto === "" || s.code.toLowerCase().includes(texto);
        const coincideEstado =
            estado === "" ? !estadosFinales.includes(s.status) : s.status === estado;
        return coincideTexto && coincideEstado;
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