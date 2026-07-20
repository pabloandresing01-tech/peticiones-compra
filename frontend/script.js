const API_URL = "http://127.0.0.1:8000";

const selectTipo = document.getElementById("type");
const gruposCompra = document.querySelectorAll(".grupo-compra");
const gruposOC = document.querySelectorAll(".grupo-oc");

selectTipo.addEventListener("change", function () {
    const tipo = selectTipo.value;

    gruposCompra.forEach(g => g.classList.remove("visible"));
    gruposOC.forEach(g => g.classList.remove("visible"));

    if (tipo === "compra") {
        gruposCompra.forEach(g => g.classList.add("visible"));
    } else if (tipo === "oc") {
        gruposOC.forEach(g => g.classList.add("visible"));
    }
});

const formulario = document.getElementById("formulario-solicitud");
const mensajeResultado = document.getElementById("mensaje-resultado");

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const tipo = document.getElementById("type").value;

    const formData = new FormData();
    formData.append("type", tipo);
    formData.append("requester_name", document.getElementById("requester_name").value);
    formData.append("requester_email", document.getElementById("requester_email").value);
    formData.append("area", document.getElementById("area").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("tax_account", document.getElementById("tax_account").value);
    formData.append("cost_center", document.getElementById("cost_center").value);
    formData.append("due_date", document.getElementById("due_date").value);

    if (tipo === "compra") {
        formData.append("quantity", document.getElementById("quantity").value);
        formData.append("tech_references", document.getElementById("tech_references").value);
    }

    if (tipo === "oc") {
        formData.append("supplier", document.getElementById("supplier").value);
        formData.append("supplier_tax_id", document.getElementById("supplier_tax_id").value);
    }

    const inputArchivos = tipo === "oc"
        ? document.getElementById("archivos-oc")
        : document.getElementById("archivos-compra");

    for (const archivo of inputArchivos.files) {
        formData.append("archivos", archivo);
    }

    try {
        const respuesta = await fetch(`${API_URL}/solicitudes`, {
            method: "POST",
            body: formData,
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