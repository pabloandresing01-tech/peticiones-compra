from pydantic import BaseModel, EmailStr, field_validator
from datetime import date
from typing import Optional


class RequestCreate(BaseModel):
    type: str
    requester_name: str
    requester_email: EmailStr
    area: str
    description: str
    quantity: Optional[int] = None
    tax_account: str
    cost_center: str
    due_date: date
    supplier: Optional[str] = None
    supplier_tax_id: Optional[str] = None
    tech_references: Optional[str] = None
    @field_validator("cost_center")
    @classmethod
    def validar_centro_costo(cls, valor: str) -> str:
        if not valor.isdigit():
            raise ValueError("El centro de costo debe contener solo números")
        if len(valor) < 4:
            raise ValueError("El centro de costo debe tener al menos 4 dígitos")
        return valor