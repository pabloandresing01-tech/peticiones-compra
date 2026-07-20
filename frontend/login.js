const API_URL = "http://127.0.0.1:8000";

const formularioLogin = document.getElementById("formulario-login");
const mensajeLogin = document.getElementById("mensaje-login");

formularioLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    mensajeLogin.textContent = "Verificando...";
    mensajeLogin.style.color = "#4a5568";

    try {
        const respuesta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email, password: password }),
        });

        if (respuesta.ok) {
            const datos = await respuesta.json();
            localStorage.setItem("token", datos.access_token);
            window.location.href = "panel.html";
        } else {
            mensajeLogin.style.color = "#c53030";
            mensajeLogin.textContent = "Correo o contraseña incorrectos.";
        }
    } catch (error) {
        mensajeLogin.style.color = "#c53030";
        mensajeLogin.textContent = "No se pudo conectar con el servidor.";
    }
});