import os
import secrets
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt, JWTError

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
DURACION_TOKEN_MINUTOS = 480          # sesión JWT: 8 horas
MAGIC_LINK_EXPIRACION_MINUTOS = 15    # enlace de un solo uso: 15 minutos

contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hashear_password(password: str) -> str:
    return contexto_password.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return contexto_password.verify(password_plano, password_hash)


def crear_token(datos: dict) -> str:
    info = datos.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=DURACION_TOKEN_MINUTOS)
    info.update({"exp": expiracion})
    token = jwt.encode(info, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verificar_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None
    
def generar_magic_token() -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=MAGIC_LINK_EXPIRACION_MINUTOS)
    return token, expiracion

def esta_expirado(expira_en: datetime) -> bool:
    return expira_en < datetime.now(timezone.utc)