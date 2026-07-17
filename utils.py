from datetime import datetime
from sqlalchemy.orm import Session
from models import Request


def generar_codigo(db: Session, tipo: str) -> str:
    prefijo = "SC" if tipo == "compra" else "OC"
    anio = datetime.now().year

    cantidad = db.query(Request).filter(Request.type == tipo).count()
    correlativo = cantidad + 1

    codigo = f"{prefijo}-{anio}-{correlativo:04d}"
    return codigo