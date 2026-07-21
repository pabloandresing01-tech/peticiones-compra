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

import os
import uuid
from fastapi import UploadFile

EXTENSIONES_PERMITIDAS = {".pdf", ".xlsx", ".xls", ".docx", ".jpg", ".jpeg", ".png", ".webp"}
TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB en bytes
CARPETA_UPLOADS = "uploads"


def validar_archivo(archivo: UploadFile) -> None:
    extension = os.path.splitext(archivo.filename)[1].lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise ValueError(f"Tipo de archivo no permitido: {extension}")


def guardar_archivo(archivo: UploadFile) -> dict:
    extension = os.path.splitext(archivo.filename)[1].lower()
    nombre_unico = f"{uuid.uuid4()}{extension}"
    ruta_completa = os.path.join(CARPETA_UPLOADS, nombre_unico)

    contenido = archivo.file.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise ValueError(f"El archivo {archivo.filename} supera los 5 MB")

    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    return {"file_url": ruta_completa, "file_name": archivo.filename}

ESTADOS_VALIDOS = {
    "en_revision",
    "en_cotizacion",
    "en_transito",
    "completada",
    "creada",
    "rechazada",
    "cancelada",
}

import httpx
from dotenv import load_dotenv

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")


def notificar_cambio_estado(codigo: str, nuevo_estado: str, email: str, comentario: str = None) -> None:
    if not N8N_WEBHOOK_URL:
        return

    datos = {
        "codigo": codigo,
        "nuevo_estado": nuevo_estado,
        "email": email,
        "comentario": comentario or "",
    }

    try:
        httpx.post(N8N_WEBHOOK_URL, json=datos, timeout=5.0)
    except Exception:
        pass