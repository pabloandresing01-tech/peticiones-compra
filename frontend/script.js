const API_URL = "http://127.0.0.1:8000";

const formulario = document.getElementById("formulario-solicitud");
const mensajeResultado = document.getElementById("mensaje-resultado");

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const datos = {
        type: document.getElementById("type").value,
        requester_name: document.getElementById("requester_name").value,
        requester_email: document.getElementById("requester_email").value,
        area: document.getElementById("area").value,
        description: document.getElementById("description").value,
        quantity: document.getElementById("quantity").value || null,
        tax_account: document.getElementById("tax_account").value,
        cost_center: document.getElementById("cost_center").value,
        due_date: document.getElementById("due_date").value,
        tech_references: document.getElementById("tech_references").value || null,
    };

    try {
        const respuesta = await fetch(`${API_URL}/solicitudes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(datos),
        });

        if (respuesta.ok) {
            const resultado = await respuesta.json();
            mensajeResultado.style.color = "#276749";
            mensajeResultado.textContent =
                "✅ Solicitud creada correctamente. Tu código es: " + resultado.codigo;
            formulario.reset();
        } else {
            mensajeResultado.style.color = "#c53030";
            mensajeResultado.textContent =
                "❌ Hubo un error al enviar la solicitud. Revisa los datos.";
        }
    } catch (error) {
        mensajeResultado.style.color = "#c53030";
        mensajeResultado.textContent =
            "❌ No se pudo conectar con el servidor. ¿Está encendido?";
    }
});