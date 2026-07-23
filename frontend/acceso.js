const API_URL = "http://127.0.0.1:8000";

const bloqueVerificando = document.getElementById("verificando");
const bloqueError = document.getElementById("error-acceso");
const detalleError = document.getElementById("detalle-error");
const botonReintentar = document.getElementById("boton-reintentar");

botonReintentar.addEventListener("click", function () {
    window.location.href = "entrada.html";
});

function mostrarError(mensaje) {
    bloqueVerificando.style.display = "none";
    bloqueError.style.display = "block";
    detalleError.textContent = mensaje;
}

async function canjearToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        mostrarError("El enlace no contiene un token válido. Solicita uno nuevo.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/canjear-enlace`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token }),
        });

        if (respuesta.ok) {
            const datos = await respuesta.json();
            localStorage.setItem("token_solicitante", datos.access_token);
            window.location.href = "menu.html";
        } else {
            const error = await respuesta.json();
            mostrarError(error.detail || "El enlace no es válido.");
        }
    } catch (error) {
        mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }
}

canjearToken();