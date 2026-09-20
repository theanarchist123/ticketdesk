"""SQLAlchemy ORM models for tickets and notes (§3 of PLAN.md)."""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Text, unique=True, nullable=False, index=True)
    customer_name = Column(Text, nullable=False)
    customer_email = Column(Text, nullable=False)
    subject = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="Open")
    priority = Column(Text, nullable=False, default="Medium")
    due_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    notes = relationship("Note", back_populates="ticket", cascade="all, delete-orphan",
                          order_by="Note.created_at.desc()")

    __table_args__ = (
        Index("ix_tickets_status", "status"),
        Index("ix_tickets_due_at", "due_at"),
        Index("ix_tickets_created_at", "created_at"),
    )


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    note_text = Column(Text, nullable=False)
    kind = Column(Text, nullable=False, default="note")  # "note" | "status_change"
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    ticket = relationship("Ticket", back_populates="notes")
