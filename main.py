from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db
from models import Request, StatusHistory
from schemas import RequestCreate
from utils import generar_codigo

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def leer_inicio():
    return {"mensaje": "API de peticiones de compra funcionando"}


@app.post("/solicitudes")
def crear_solicitud(datos: RequestCreate, db: Session = Depends(get_db)):
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

    primer_historial = StatusHistory(
        request_code=codigo,
        old_status=None,
        new_status="ingresada",
        comment="Solicitud creada",
        changed_by=datos.requester_email,
    )
    db.add(primer_historial)

    db.commit()
    db.refresh(nueva_solicitud)

    return {"mensaje": "Solicitud creada correctamente", "codigo": codigo}