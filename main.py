from fastapi import FastAPI, Depends, HTTPException, Form, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os 

from database import get_db
from models import Request, StatusHistory, Attachment, Buyer
from schemas import RequestCreate, RequestOut, LoginRequest, TokenResponse, CambioEstado, RequestDetail, AttachmentOut, StatusHistoryOut
from utils import generar_codigo, validar_archivo, guardar_archivo, ESTADOS_VALIDOS, notificar_cambio_estado
from security import verificar_password, crear_token, verificar_token
from typing import Optional
from datetime import date


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
        try:
            validar_archivo(archivo)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

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
        new_status="en_revision",
        comment="Solicitud creada",
        changed_by=datos.requester_email,
    )
    
    db.add(primer_historial)

    for archivo in archivos:
        try:
            info = guardar_archivo(archivo)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
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

    resultado = []
    for s in solicitudes:
        item = RequestOut.model_validate(s)
        if s.status in {"rechazada", "cancelada"}:
            ultimo = (
                db.query(StatusHistory)
                .filter(StatusHistory.request_code == s.code)
                .order_by(StatusHistory.created_at.desc())
                .first()
            )
            if ultimo and ultimo.comment:
                item.last_comment = ultimo.comment
        resultado.append(item)

    return resultado

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
def ver_perfil(comprador: Buyer = Depends(obtener_comprador_actual)):  #Comprobar funcionamiento de la autenticación
    return {"nombre": comprador.name, "email": comprador.email}

@app.get("/panel/solicitudes", response_model=list[RequestOut])
def listar_todas_solicitudes(
    comprador: Buyer = Depends(obtener_comprador_actual),
    db: Session = Depends(get_db),
):
    solicitudes = db.query(Request).order_by(Request.created_at.desc()).all()

    resultado = []
    for s in solicitudes:
        item = RequestOut.model_validate(s)
        if s.status in {"rechazada", "cancelada"}:
            ultimo = (
                db.query(StatusHistory)
                .filter(StatusHistory.request_code == s.code)
                .order_by(StatusHistory.created_at.desc())
                .first()
            )
            if ultimo and ultimo.comment:
                item.last_comment = ultimo.comment
        resultado.append(item)

    return resultado

@app.patch("/panel/solicitudes/{codigo}/estado")
def cambiar_estado(
    codigo: str,
    datos: CambioEstado,
    comprador: Buyer = Depends(obtener_comprador_actual),
    db: Session = Depends(get_db),
):
    if datos.nuevo_estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado no válido")
    
    if datos.nuevo_estado in {"rechazada", "cancelada"} and not datos.comentario:
        raise HTTPException(
            status_code=400,
            detail="Debes indicar el motivo cuando rechazas o cancelas una solicitud",
        )
        
    solicitud = db.query(Request).filter(Request.code == codigo).first()
    if solicitud is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    estado_anterior = solicitud.status
    solicitud.status = datos.nuevo_estado

    if solicitud.buyer_id is None:
        solicitud.buyer_id = comprador.id

    registro = StatusHistory(
        request_code=codigo,
        old_status=estado_anterior,
        new_status=datos.nuevo_estado,
        comment=datos.comentario,
        changed_by=comprador.email,
    )
    db.add(registro)

    db.commit()

    notificar_cambio_estado(codigo, datos.nuevo_estado, solicitud.requester_email, datos.comentario)

    return {"mensaje": "Estado actualizado", "codigo": codigo, "nuevo_estado": datos.nuevo_estado}

@app.get("/panel/solicitudes/{codigo}", response_model=RequestDetail)
def detalle_solicitud(
    codigo: str,
    comprador: Buyer = Depends(obtener_comprador_actual),
    db: Session = Depends(get_db),
):
    solicitud = db.query(Request).filter(Request.code == codigo).first()
    if solicitud is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    adjuntos = db.query(Attachment).filter(Attachment.request_code == codigo).all()

    historial = (
        db.query(StatusHistory)
        .filter(StatusHistory.request_code == codigo)
        .order_by(StatusHistory.created_at.asc())
        .all()
    )

    detalle = RequestDetail.model_validate(solicitud)
    detalle.attachments = [AttachmentOut.model_validate(a) for a in adjuntos]
    detalle.history = [StatusHistoryOut.model_validate(h) for h in historial]

    return detalle

@app.get("/panel/archivos/{archivo_id}")
def descargar_archivo(
    archivo_id: int,
    comprador: Buyer = Depends(obtener_comprador_actual),
    db: Session = Depends(get_db),
):
    adjunto = db.query(Attachment).filter(Attachment.id == archivo_id).first()
    if adjunto is None:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    if not os.path.exists(adjunto.file_url):
        raise HTTPException(status_code=404, detail="El archivo ya no está disponible")

    return FileResponse(
        path=adjunto.file_url,
        filename=adjunto.file_name,
    )