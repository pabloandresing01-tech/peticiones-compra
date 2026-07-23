from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base


class Request(Base):
    __tablename__ = "requests"

    code = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="en_revision")
    requester_name = Column(String, nullable=False)
    requester_email = Column(String, nullable=False, index=True)
    area = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=True)
    tax_account = Column(String, nullable=False)
    cost_center = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)
    supplier = Column(String, nullable=True)
    supplier_tax_id = Column(String, nullable=True)
    tech_references = Column(Text, nullable=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String, ForeignKey("requests.code"), nullable=False)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    changed_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String, ForeignKey("requests.code"), nullable=False)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class Requester(Base):
    __tablename__ = "requesters"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    area = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MagicLink(Base):
    __tablename__ = "magic_links"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())