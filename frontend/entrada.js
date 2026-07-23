const API_URL = "http://127.0.0.1:8000";

const seleccionPerfil = document.getElementById("seleccion-perfil");
const formPedirEnlace = document.getElementById("pedir-enlace");
const enlaceEnviado = document.getElementById("enlace-enviado");
const mensajeEntrada = document.getElementById("mensaje-resultado");

const botonSolicitante = document.getElementById("boton-solicitante");
const botonAbastecimiento = document.getElementById("boton-abastecimiento");
const volverPerfil = document.getElementById("volver-perfil");
const volverInicio = document.getElementById("volver-inicio");

// Si ya hay sesión activa, saltar directo al formulario
if (localStorage.getItem("token_solicitante")) {
    window.location.href = "index.html";
}

botonAbastecimiento.addEventListener("click", function () {
    window.location.href = "login.html";
});

botonSolicitante.addEventListener("click", function () {
    seleccionPerfil.style.display = "none";
    formPedirEnlace.style.display = "flex";
});

volverPerfil.addEventListener("click", function (evento) {
    evento.preventDefault();
    formPedirEnlace.style.display = "none";
    seleccionPerfil.style.display = "block";
    mensajeEntrada.textContent = "";
});

volverInicio.addEventListener("click", function (evento) {
    evento.preventDefault();
    enlaceEnviado.style.display = "none";
    formPedirEnlace.style.display = "none";
    seleccionPerfil.style.display = "block";
    mensajeEntrada.textContent = "";
});

formPedirEnlace.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const email = document.getElementById("email-acceso").value.trim();
    const nombre = document.getElementById("nombre-acceso").value.trim();
    const area = document.getElementById("area-acceso").value.trim();

    mensajeEntrada.style.color = "#4a5568";
    mensajeEntrada.textContent = "Enviando...";

    try {
        const respuesta = await fetch(`${API_URL}/solicitar-enlace`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email,
                name: nombre || null,
                area: area || null,
            }),
        });

        if (respuesta.ok) {
            formPedirEnlace.style.display = "none";
            enlaceEnviado.style.display = "block";
            mensajeEntrada.textContent = "";
        } else {
            mensajeEntrada.style.color = "#c53030";
            mensajeEntrada.textContent = "No se pudo enviar el enlace. Revisa el correo ingresado.";
        }
    } catch (error) {
        mensajeEntrada.style.color = "#c53030";
        mensajeEntrada.textContent = "No se pudo conectar con el servidor.";
    }
});