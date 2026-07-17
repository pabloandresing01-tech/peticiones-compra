from pydantic import BaseModel, EmailStr, field_validator, model_validator
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
    @field_validator("requester_email")
    @classmethod
    def normalizar_email(cls, valor: str) -> str:
        return valor.lower().strip()
    @model_validator(mode="after")
    def validar_campos_por_tipo(self):
        if self.type == "compra":
            if self.quantity is None:
                raise ValueError("La cantidad es obligatoria para solicitudes de compra")
            if not self.tech_references:
                raise ValueError("Las referencias técnicas son obligatorias para solicitudes de compra")
        elif self.type == "oc":
            if not self.supplier_tax_id:
                raise ValueError("El RUT de la empresa es obligatorio para solicitudes de OC")
            if not self.supplier:
                raise ValueError("El nombre del proveedor es obligatorio para solicitudes de OC")
        return self
    
class RequestOut(BaseModel):
    code: str
    type: str
    status: str
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

    class Config:
        from_attributes = True
        
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"