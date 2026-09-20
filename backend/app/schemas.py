"""Pydantic v2 request/response schemas (§4 of PLAN.md)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ── Request schemas ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=80)
    customer_email: EmailStr
    subject: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=4000)
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"


class NoteCreate(BaseModel):
    note_text: str = Field(..., min_length=1, max_length=4000)


class TicketUpdate(BaseModel):
    subject: str | None = Field(None, min_length=3, max_length=120)
    status: Literal["Open", "In Progress", "Closed"] | None = None
    priority: Literal["Low", "Medium", "High", "Urgent"] | None = None
    notes: str | None = Field(None, min_length=1, max_length=4000)

    def model_post_init(self, __context):
        """Ensure at least one field is provided."""
        if self.subject is None and self.status is None and self.priority is None and self.notes is None:
            raise ValueError("Provide at least one of: subject, status, priority, notes")


# ── Response schemas ──────────────────────────────────────────────────────────

class NoteOut(BaseModel):
    id: int
    note_text: str
    kind: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketListItem(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: str
    subject: str
    status: str
    priority: str
    due_at: datetime
    sla_state: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketDetail(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    priority: str
    due_at: datetime
    sla_state: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None
    notes: list[NoteOut] = []

    model_config = {"from_attributes": True}


class TicketCreateResponse(BaseModel):
    ticket_id: str
    created_at: datetime
    due_at: datetime


class TicketUpdateResponse(BaseModel):
    success: bool = True
    updated_at: datetime


class StatsOut(BaseModel):
    all: int
    open: int
    in_progress: int
    closed: int
    overdue: int
    at_risk: int = 0
    sla_met_pct: float = 100.0
    by_priority: dict[str, int] = {}


class ErrorResponse(BaseModel):
    detail: str
    errors: list[dict] | None = None
