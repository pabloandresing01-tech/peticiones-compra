import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt, JWTError

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
DURACION_TOKEN_MINUTOS = 480

contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hashear_password(password: str) -> str:
    return contexto_password.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return contexto_password.verify(password_plano, password_hash)


def crear_token(datos: dict) -> str:
    info = datos.copy()
    expiracion = datetime.utcnow() + timedelta(minutes=DURACION_TOKEN_MINUTOS)
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