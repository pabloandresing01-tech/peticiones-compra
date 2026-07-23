# Sistema de Gestión de Peticiones de Compra

Aplicación web para estandarizar y dar seguimiento a las solicitudes de compra que recibe un área de abastecimiento, desarrollada para una empresa del sector alimentario.

> **Estado del proyecto:** en desarrollo activo. El sistema base (Fase 1) está operativo, incluyendo autenticación sin contraseña para solicitantes y notificaciones automáticas por correo. Las capas de IA están planificadas y documentadas en el roadmap.

---

## El problema

El área de abastecimiento recibía solicitudes de compra por canales dispersos (correo, mensajería, verbalmente), cada una con un formato distinto y con información frecuentemente incompleta. Esto generaba tres problemas concretos:

- **Retrabajo por información faltante:** solicitudes sin cuenta contable, sin centro de costo o sin especificaciones técnicas suficientes obligaban a volver a contactar al solicitante.
- **Falta de trazabilidad:** no existía un registro de en qué etapa se encontraba cada solicitud, lo que derivaba en consultas repetidas al equipo de compras.
- **Sin historial auditable:** no quedaba constancia de quién gestionó cada solicitud ni cuándo cambió de estado.

Este sistema reemplaza ese flujo por un formulario estandarizado, un seguimiento consultable por el propio solicitante y un panel de gestión para el equipo de compras.

---

## Decisiones técnicas destacadas

**Dos flujos diferenciados en un mismo formulario.** El área solicitante distingue entre pedir una Orden de Compra (ya cotizó y solo requiere emisión) y solicitar una compra (requiere que abastecimiento cotice). El formulario detecta el tipo seleccionado y muestra únicamente los campos pertinentes a cada flujo, validando en el backend que los campos obligatorios de cada tipo estén presentes.

**Dos mecanismos de autenticación según el perfil.** Los compradores son pocos, entran a diario y necesitan autonomía: acceden con correo y contraseña hasheada con bcrypt. Los solicitantes son muchos y entran esporádicamente, por lo que gestionar cuentas para toda la empresa no tendría sentido: acceden mediante un enlace de un solo uso enviado por correo (magic link) que abre una sesión de 8 horas. Ambos perfiles reciben un JWT con el mismo formato; la distinción la hace la dependencia según contra qué tabla resuelve el correo.

**El token del enlace y la sesión son cosas distintas.** El magic link es un valor opaco generado con `secrets.token_urlsafe(32)`, válido 15 minutos y consumible una sola vez: solo demuestra acceso al buzón. El JWT es la sesión que se emite después de canjearlo. Separarlos permite que una consulta al sistema no implique un correo por cada visita.

**Historial de transiciones en lugar de sobrescritura de estado.** Cada cambio de estado se registra como una fila nueva en `status_history` (estado anterior, estado nuevo, responsable, comentario, timestamp) en lugar de simplemente actualizar el campo `status`. Esto permite reconstruir la línea de tiempo completa de cualquier solicitud y habilita auditoría posterior.

**Borrado lógico de adjuntos.** Los archivos no se eliminan físicamente ni se borran sus registros: se marcan con `deleted_at` y `deleted_by`. El vínculo con la solicitud se conserva, de modo que ante una disputa sobre una orden de compra emitida es posible reconstruir qué documentos existieron, cuáles se reemplazaron y quién lo hizo. Las consultas filtran por `deleted_at IS NULL`.

**Los documentos de una solicitud cerrada quedan congelados.** Una vez que la solicitud alcanza un estado final (`completada`, `creada`, `rechazada`, `cancelada`), ningún adjunto puede eliminarse ni reemplazarse. Mientras está abierta, el comprador puede eliminar cualquier adjunto y el solicitante solo los propios, únicamente en `en_revision`.

**Una solicitud de OC, un proveedor, un documento.** El sistema admite una sola orden de compra emitida por solicitud (`origin='purchase_order'`); subir una nueva reemplaza la anterior mediante borrado lógico. Es una restricción deliberada, no una limitación pendiente: los casos con múltiples centros de costo se resuelven detallándolos en la descripción, y los que involucran más de un proveedor, dividiendo en solicitudes separadas. Esta decisión es la que hace posible validar que no se pueda cerrar una OC sin su respaldo.

**Validación en dos capas.** El formulario valida en el navegador para guiar al usuario, pero toda regla de negocio se revalida en el backend mediante Pydantic, bajo el principio de no confiar en el cliente. Incluye validadores de campo (formato de centro de costo, normalización de correo a minúsculas) y validadores de modelo que evalúan la coherencia entre campos según el tipo de solicitud. Los errores de Pydantic se capturan y se convierten en respuestas HTTP con el motivo real del rechazo, de modo que el frontend pueda mostrarlo.

**Almacenamiento de archivos por referencia.** Los adjuntos se guardan en el sistema de archivos con nombre generado por UUID para evitar colisiones, mientras la base de datos registra la ruta, el nombre original y el origen (`requester` o `purchase_order`). Se valida tipo de archivo y tamaño máximo antes de escribir a disco.

**Notificaciones desacopladas del backend.** El envío de correos se delega a n8n mediante webhooks: la API publica el evento y el workflow se encarga del SMTP. Esto mantiene las credenciales de correo fuera del código y permite modificar plantillas sin tocar el backend. El PDF de la orden de compra viaja codificado en base64 dentro del payload, evitando exponer un endpoint de descarga sin autenticación.

---

## Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Frontend       │  HTTP   │  API REST        │  ORM    │  PostgreSQL     │
│  HTML/CSS/JS    │ ──────► │  FastAPI         │ ──────► │                 │
│                 │         │                  │         │  requests       │
│  · Acceso       │         │  · Validación    │         │  status_history │
│  · Formulario   │         │  · JWT           │         │  attachments    │
│  · Consulta     │         │  · Magic link    │         │  buyers         │
│  · Panel        │         │  · Archivos      │         │  requesters     │
└─────────────────┘         └──────────────────┘         │  magic_links    │
                                     │                   └─────────────────┘
                        ┌────────────┴────────────┐
                        ▼                         ▼
               ┌──────────────────┐      ┌──────────────────┐
               │  uploads/        │      │  n8n (Docker)    │
               │  Archivos        │      │  Correos vía     │
               │  adjuntos        │      │  SMTP            │
               └──────────────────┘      └──────────────────┘
```

### Modelo de datos

| Tabla            | Propósito                                                              |
| ---------------- | ---------------------------------------------------------------------- |
| `requests`       | Solicitudes con sus datos, tipo, estado actual y comprador asignado     |
| `status_history` | Registro inmutable de cada transición de estado                        |
| `attachments`    | Adjuntos con origen, borrado lógico y trazabilidad de quién los eliminó |
| `buyers`         | Usuarios del equipo de compras con credenciales hasheadas              |
| `requesters`     | Solicitantes, creados automáticamente al pedir su primer enlace        |
| `magic_links`    | Tokens de acceso de un solo uso con expiración                         |

### Ciclo de vida de una solicitud

**Solicitud de Compra:** `en_revision` → `en_cotizacion` → `en_transito` → `completada`

**Solicitud de OC:** `en_revision` → `creada`

Ambos flujos admiten los estados terminales `rechazada` y `cancelada`, que exigen comentario obligatorio. El paso a `creada` requiere que el PDF de la orden de compra esté adjunto: la validación es de backend y no puede saltarse desde el frontend.

---

## Stack

**Backend**

- Python 3 · FastAPI
- SQLAlchemy (ORM) · Pydantic (validación)
- PostgreSQL
- python-jose (JWT) · passlib + bcrypt (hasheo) · `secrets` (tokens de acceso)

**Frontend**

- HTML5 · CSS3 · JavaScript (sin framework)
- Fetch API para consumo de la API REST

**Orquestación**

- n8n en Docker para el envío de correos vía SMTP

---

## Funcionalidades implementadas

### Solicitante

- Acceso sin registro ni contraseña mediante enlace de un solo uso enviado por correo
- Menú con resumen de solicitudes en curso y actividad reciente
- Formulario con campos dinámicos según el tipo de solicitud
- Carga de múltiples archivos adjuntos (PDF, Excel, Word, imágenes) con validación de tipo y tamaño
- Generación automática de código correlativo (`SC-2026-0001` / `OC-2026-0001`)
- Consulta del estado de sus solicitudes con filtros por código y estado
- Notificación por correo en cada cambio de estado, con el PDF adjunto cuando se emite la orden de compra

### Equipo de compras

- Acceso protegido con credenciales
- Vista de todas las solicitudes con buscador y filtro por estado
- Detalle expandible con datos completos, adjuntos descargables e historial de transiciones
- Carga del PDF de la orden de compra, con reemplazo trazable del documento anterior
- Eliminación de adjuntos con registro de quién y cuándo
- Cambio de estado con registro automático en el historial y motivo obligatorio para rechazo y cancelación
- Asignación automática del comprador que gestiona cada solicitud

---

## Roadmap

El proyecto está estructurado en capas incrementales, donde cada una se construye sobre una base ya funcional.

### Fase 1 — Sistema base

- [x] Modelo de datos y API REST
- [x] Formulario con validaciones y carga de archivos
- [x] Consulta de estado por el solicitante
- [x] Panel de gestión con autenticación
- [x] Acceso del solicitante mediante enlace de un solo uso
- [x] Notificaciones automáticas por correo
- [x] Carga del PDF de la orden de compra y envío al solicitante
- [x] Eliminación trazable de adjuntos
- [ ] Edición de solicitudes por el solicitante
- [ ] Despliegue a producción

### Fase 2 — Clasificación automática

- [ ] Clasificación de solicitudes mediante LLM (categoría, urgencia, área)
- [ ] Ruteo automático al comprador correspondiente
- [ ] Salida estructurada validada por esquema

### Fase 3 — Asistente de consultas

- [ ] Sistema RAG sobre procedimientos de abastecimiento
- [ ] Consulta en lenguaje natural del estado de solicitudes
- [ ] Respuestas con citación de la fuente

---

## Instalación local

**Requisitos:** Python 3.10+, PostgreSQL 14+, Docker (para n8n)

```bash
# Clonar el repositorio
git clone https://github.com/pabloandresing01-tech/peticiones-compra-En-desarrollo.git
cd peticiones-compra-En-desarrollo

# Entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac

# Dependencias
pip install -r requirements.txt
```

Crear la base de datos en PostgreSQL y configurar las variables de entorno en un archivo `.env`:

```
DATABASE_URL=postgresql+psycopg://usuario:contraseña@localhost:5432/peticiones_compra
SECRET_KEY=clave_secreta_para_firmar_tokens
FRONTEND_URL=http://localhost:5500
N8N_WEBHOOK_URL=http://localhost:5678/webhook/cambio-estado
N8N_MAGIC_LINK_URL=http://localhost:5678/webhook/magic-link
N8N_OC_URL=http://localhost:5678/webhook/oc-creada
```

Las variables de n8n son opcionales: si no están definidas, el sistema funciona sin enviar correos. En ese caso, el enlace de acceso puede obtenerse directamente desde la base de datos.

Inicializar las tablas y crear un usuario del equipo de compras:

```bash
python create_tables.py
python crear_comprador.py
```

Levantar los servicios:

```bash
# n8n
docker start n8n

# Terminal 1 — API
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
python -m http.server 5500
```

La documentación interactiva de la API queda disponible en `http://127.0.0.1:8000/docs`.

---

## Estructura del proyecto

```
peticiones-compra/
├── main.py                 # Endpoints de la API
├── models.py               # Modelos SQLAlchemy
├── schemas.py              # Esquemas Pydantic y validadores
├── database.py             # Conexión y sesión de base de datos
├── security.py             # Hasheo, JWT y tokens de acceso
├── utils.py                # Códigos, archivos, estados y notificaciones
├── create_tables.py        # Inicialización del esquema
├── crear_comprador.py      # Alta de usuarios del equipo de compras
├── requirements.txt
├── uploads/                # Archivos adjuntos (excluido del repositorio)
└── frontend/
    ├── entrada.html        # Bifurcación de perfil y solicitud de enlace
    ├── acceso.html         # Canje del enlace de acceso
    ├── menu.html           # Menú del solicitante
    ├── index.html          # Formulario de solicitud
    ├── consultar.html      # Consulta de estado
    ├── login.html          # Acceso del equipo de compras
    ├── panel.html          # Panel de gestión
    ├── estilos.css
    └── *.js
```

---

## Consideraciones

Este repositorio contiene únicamente el código del sistema. No incluye datos reales de la organización: los archivos adjuntos, las credenciales de acceso y las variables de entorno están excluidos del control de versiones.

Las decisiones de alcance se tomaron priorizando un sistema funcional y comprensible por sobre la completitud. Las siguientes son limitaciones conocidas del entorno de desarrollo, cada una con su alternativa de producción identificada:

- **CORS permisivo** (`["*"]`) → restringir al dominio de despliegue.
- **Token en `localStorage`** → cookie `HttpOnly` + `Secure` + `SameSite`. En su forma actual el JWT es legible por JavaScript y no puede revocarse antes de su expiración.
- **HTTPS** es obligatorio en producción: sin él, tanto el enlace de acceso como el JWT viajan legibles.
- **Webhooks de n8n sin autenticar** → cualquiera con la URL puede disparar correos.
- **Fallos de notificación silenciosos** → los envíos fallidos no se registran; con el enlace de acceso esto es especialmente relevante, porque bloquea la entrada al sistema sin dejar rastro.
- **PDF de la orden de compra en base64** dentro del payload → simple y sin endpoint expuesto, pero la codificación infla el archivo alrededor de un tercio. Si los adjuntos crecen, migrar a que n8n descargue desde la API con un token de servicio.
- **Almacenamiento local de archivos** → los adjuntos se pierden si el servidor se recrea. Para uso real, el respaldo periódico de `uploads/` junto con el volcado de la base es más crítico que cualquier funcionalidad pendiente.
- **Correlativo por conteo de filas** → el código se genera contando solicitudes existentes, lo que falla si se elimina una fila o al cambiar de año. Debe reemplazarse por una secuencia por tipo y año.
