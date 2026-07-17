from fastapi import FastAPI, Depends, HTTPException, Form, File, UploadFile, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db
from models import Request, StatusHistory, Attachment, Buyer
from schemas import RequestCreate, RequestOut, LoginRequest, TokenResponse
from utils import generar_codigo, validar_archivo, guardar_archivo
from security import verificar_password, crear_token, verificar_token
from typing import Optional
from datetime import date
from utils import generar_codigo

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security_scheme = HTTPBearer()


def obtener_comprador_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    token = credenciales.credentials
    email = verificar_token(token)

    if email is None:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    comprador = db.query(Buyer).filter(Buyer.email == email).first()
    if comprador is None:
        raise HTTPException(status_code=401, detail="Comprador no encontrado")

    return comprador

@app.get("/")
def leer_inicio():
    return {"mensaje": "API de peticiones de compra funcionando"}


@app.post("/solicitudes")
def crear_solicitud(
    type: str = Form(...),
    requester_name: str = Form(...),
    requester_email: str = Form(...),
    area: str = Form(...),
    description: str = Form(...),
    tax_account: str = Form(...),
    cost_center: str = Form(...),
    due_date: date = Form(...),
    quantity: Optional[int] = Form(None),
    tech_references: Optional[str] = Form(None),
    supplier: Optional[str] = Form(None),
    supplier_tax_id: Optional[str] = Form(None),
    archivos: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    datos = RequestCreate(
        type=type,
        requester_name=requester_name,
        requester_email=requester_email,
        area=area,
        description=description,
        tax_account=tax_account,
        cost_center=cost_center,
        due_date=due_date,
        quantity=quantity,
        tech_references=tech_references,
        supplier=supplier,
        supplier_tax_id=supplier_tax_id,
    )

    if archivos is None:
        archivos = []

    if datos.type == "oc" and len(archivos) == 0:
        raise HTTPException(status_code=400, detail="La cotización es obligatoria para solicitudes de OC")

    for archivo in archivos:
        validar_archivo(archivo)

    codigo = generar_codigo(db, datos.type)

    nueva_solicitud = Request(
        code=codigo,
        type=datos.type,
        requester_name=datos.requester_name,
        requester_email=datos.requester_email,
        area=datos.area,
        description=datos.description,
        quantity=datos.quantity,
        tax_account=datos.tax_account,
        cost_center=datos.cost_center,
        due_date=datos.due_date,
        supplier=datos.supplier,
        supplier_tax_id=datos.supplier_tax_id,
        tech_references=datos.tech_references,
    )
    db.add(nueva_solicitud)
    db.flush()

    primer_historial = StatusHistory(
        request_code=codigo,
        old_status=None,
        new_status="ingresada",
        comment="Solicitud creada",
        changed_by=datos.requester_email,
    )
    db.add(primer_historial)

    for archivo in archivos:
        info = guardar_archivo(archivo)
        adjunto = Attachment(
            request_code=codigo,
            file_url=info["file_url"],
            file_name=info["file_name"],
        )
        db.add(adjunto)

    db.commit()
    db.refresh(nueva_solicitud)

    return {"mensaje": "Solicitud creada correctamente", "codigo": codigo}

@app.get("/solicitudes", response_model=list[RequestOut])
def consultar_solicitudes(email: str, db: Session = Depends(get_db)):
    email_normalizado = email.lower().strip()
    solicitudes = db.query(Request).filter(Request.requester_email == email_normalizado).all()
    return solicitudes

@app.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    email = datos.email.lower().strip()
    comprador = db.query(Buyer).filter(Buyer.email == email).first()

    if not comprador:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not verificar_password(datos.password, comprador.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = crear_token({"sub": comprador.email})

    return {"access_token": token, "token_type": "bearer"}

@app.get("/perfil")
def ver_perfil(comprador: Buyer = Depends(obtener_comprador_actual)):
    return {"nombre": comprador.name, "email": comprador.email}