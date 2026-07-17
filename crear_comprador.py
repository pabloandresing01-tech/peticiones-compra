from database import SessionLocal
from models import Buyer
from security import hashear_password

# ── Datos del comprador a crear ──
NOMBRE = "Pablo Ríos"
EMAIL = "pablo@entrelagos.cl"
PASSWORD = "compras2026"
# ─────────────────────────────────

db = SessionLocal()

existente = db.query(Buyer).filter(Buyer.email == EMAIL.lower()).first()

if existente:
    print(f"Ya existe un comprador con el correo {EMAIL}")
else:
    nuevo_comprador = Buyer(
        name=NOMBRE,
        email=EMAIL.lower(),
        password_hash=hashear_password(PASSWORD),
    )
    db.add(nuevo_comprador)
    db.commit()
    print(f"Comprador creado: {NOMBRE} ({EMAIL})")

db.close()