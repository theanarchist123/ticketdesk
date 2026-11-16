"""Pydantic v2 request/response schemas (§4 of PLAN.md)."""

from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field, field_validator


def _as_utc(v: datetime) -> datetime:
    """SQLite drops tzinfo, so values read back are naive UTC. Re-attach UTC so the API
    serializes '...Z' and browsers don't misread the time as their local zone."""
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v.astimezone(timezone.utc)


UTCDateTime = Annotated[datetime, AfterValidator(_as_utc)]


# ── Request schemas ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=80)
    customer_email: EmailStr
    subject: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=4000)
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"

    @field_validator("customer_name")
    @classmethod
    def name_has_only_letters(cls, v: str) -> str:
        """Same rule as the frontend form: letters (any language), spaces, . ' ’ -"""
        v = v.strip()
        if len(v) < 2 or not v[0].isalpha() or not all(c.isalpha() or c in " .'’-" for c in v):
            raise ValueError("Name may only contain letters, spaces, hyphens and apostrophes")
        return v


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
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


class TicketListItem(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: str
    subject: str
    status: str
    priority: str
    due_at: UTCDateTime
    sla_state: str
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


class TicketDetail(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    priority: str
    due_at: UTCDateTime
    sla_state: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
    resolved_at: UTCDateTime | None = None
    notes: list[NoteOut] = []

    model_config = {"from_attributes": True}


class TicketCreateResponse(BaseModel):
    ticket_id: str
    created_at: UTCDateTime
    due_at: UTCDateTime


class TicketUpdateResponse(BaseModel):
    success: bool = True
    updated_at: UTCDateTime


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


class AnalyticsOut(BaseModel):
    """Every number the charts show, computed from the whole database (not a page of tickets)."""
    created_per_day: list[dict]      # [{date: 'YYYY-MM-DD', count}] last 90 days, in the caller's timezone
    resolved_per_day: list[dict]
    created_per_week: list[dict]     # last 12 rolling 7-day windows, oldest first
    heatmap: list[list[int]]         # 7 (Mon..Sun) x 24 creation counts
    sla_mix: dict[str, int]
    age_buckets: list[dict]          # age of currently active tickets
    avg_open_age_hours: float | None
    avg_resolution_hours: float | None
    top_customers: list[dict]
    customers: dict[str, float]
