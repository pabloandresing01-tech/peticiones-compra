# Sistema de Gestión de Peticiones de Compra

Aplicación web para estandarizar y dar seguimiento a las solicitudes de compra que recibe un área de abastecimiento, desarrollada para una empresa del sector alimentario.

> **Estado del proyecto:** en desarrollo activo. El sistema base (Fase 1) está operativo. Las capas de automatización e IA están planificadas y documentadas en el roadmap.

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

**Historial de transiciones en lugar de sobrescritura de estado.** Cada cambio de estado se registra como una fila nueva en `status_history` (estado anterior, estado nuevo, responsable, comentario, timestamp) en lugar de simplemente actualizar el campo `status`. Esto permite reconstruir la línea de tiempo completa de cualquier solicitud y habilita auditoría posterior.

**Validación en dos capas.** El formulario valida en el navegador para guiar al usuario, pero toda regla de negocio se revalida en el backend mediante Pydantic, bajo el principio de no confiar en el cliente. Incluye validadores de campo (formato de centro de costo, normalización de correo a minúsculas) y validadores de modelo que evalúan la coherencia entre campos según el tipo de solicitud.

**Almacenamiento de archivos por referencia.** Los adjuntos se guardan en el sistema de archivos con nombre generado por UUID para evitar colisiones, mientras la base de datos registra únicamente la ruta y el nombre original en la tabla `attachments`. Se valida tipo de archivo y tamaño máximo antes de escribir a disco.

**Autenticación por token JWT con contraseñas hasheadas.** El acceso al panel de gestión está protegido mediante tokens firmados con expiración. Las contraseñas se almacenan hasheadas con bcrypt, nunca en texto plano. Los mensajes de error de autenticación son genéricos para no revelar si un correo existe en el sistema.

**Identificación del solicitante por correo, sin registro previo.** Los solicitantes no requieren cuenta: crean su solicitud indicando su correo y consultan el estado con el mismo dato. El correo se normaliza a minúsculas al guardar y al consultar para garantizar coincidencia. Solo el equipo de compras dispone de credenciales.

---

## Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Frontend       │  HTTP   │  API REST        │  ORM    │  PostgreSQL     │
│  HTML/CSS/JS    │ ──────► │  FastAPI         │ ──────► │                 │
│                 │         │                  │         │  requests       │
│  · Formulario   │         │  · Validación    │         │  status_history │
│  · Consulta     │         │  · Autenticación │         │  attachments    │
│  · Panel        │         │  · Archivos      │         │  buyers         │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  uploads/        │
                            │  Archivos        │
                            │  adjuntos        │
                            └──────────────────┘
```

### Modelo de datos

| Tabla | Propósito |
|-------|-----------|
| `requests` | Solicitudes con sus datos, tipo, estado actual y comprador asignado |
| `status_history` | Registro inmutable de cada transición de estado |
| `attachments` | Referencias a los archivos adjuntos de cada solicitud |
| `buyers` | Usuarios del equipo de compras con credenciales hasheadas |

### Ciclo de vida de una solicitud

**Solicitud de OC:** `ingresada` → `en_revision` → `oc_emitida` → `en_transito` → `cerrada`

**Solicitud de Compra:** `ingresada` → `en_cotizacion` → `aprobada` → `oc_emitida` → `en_transito` → `cerrada`

Ambos flujos admiten los estados terminales `rechazada` y `devuelta` (cuando falta información y se retorna al solicitante).

---

## Stack

**Backend**
- Python 3 · FastAPI
- SQLAlchemy (ORM) · Pydantic (validación)
- PostgreSQL
- python-jose (JWT) · passlib + bcrypt (hasheo)

**Frontend**
- HTML5 · CSS3 · JavaScript (sin framework)
- Fetch API para consumo de la API REST

---

## Funcionalidades implementadas

### Solicitante
- Formulario con campos dinámicos según el tipo de solicitud
- Carga de múltiples archivos adjuntos (PDF, Excel, Word, imágenes) con validación de tipo y tamaño
- Generación automática de código correlativo (`SC-2026-0001` / `OC-2026-0001`)
- Consulta del estado de sus solicitudes ingresando su correo

### Equipo de compras
- Acceso protegido con credenciales
- Vista de todas las solicitudes ordenadas por fecha de ingreso
- Cambio de estado con registro automático en el historial
- Asignación automática del comprador que gestiona cada solicitud

---

## Roadmap

El proyecto está estructurado en capas incrementales, donde cada una se construye sobre una base ya funcional.

### Fase 1 — Sistema base
- [x] Modelo de datos y API REST
- [x] Formulario con validaciones y carga de archivos
- [x] Consulta de estado por el solicitante
- [x] Panel de gestión con autenticación
- [ ] Notificaciones automáticas por correo (n8n)
- [ ] Verificación de correo mediante enlace de un solo uso

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

**Requisitos:** Python 3.10+, PostgreSQL 14+

```bash
# Clonar el repositorio
git clone https://github.com/pabloandresing01-tech/peticiones-compra.git
cd peticiones-compra

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
```

Inicializar las tablas y crear un usuario del equipo de compras:

```bash
python create_tables.py
python crear_comprador.py
```

Levantar el backend y el frontend:

```bash
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
├── security.py             # Hasheo de contraseñas y JWT
├── utils.py                # Generación de códigos y manejo de archivos
├── create_tables.py        # Inicialización del esquema
├── crear_comprador.py      # Alta de usuarios del equipo de compras
├── requirements.txt
├── uploads/                # Archivos adjuntos (excluido del repositorio)
└── frontend/
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

Las decisiones de alcance se tomaron priorizando un sistema funcional y comprensible por sobre la completitud: la política de CORS es permisiva para desarrollo, el almacenamiento de archivos es local y el token se persiste en `localStorage`. Cada una de estas decisiones tiene su alternativa de producción identificada y está considerada en la evolución del proyecto.