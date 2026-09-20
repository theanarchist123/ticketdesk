"""CRUD operations for tickets and notes (§4 of PLAN.md).

Key decisions:
- ticket_id (TKT-001) is built from the auto-incremented id after insert,
  in the same transaction, so it's always sequential and unique.
- Search escapes % and _ so user input can't act as SQL wildcards.
- Default sort is priority_sla: open/in-progress tickets by due_at asc
  (overdue naturally on top), then closed by created_at desc.
"""

from datetime import datetime, timezone

from sqlalchemy import func, or_, and_, case, literal
from sqlalchemy.orm import Session

from app.models import Ticket, Note
from app.sla import compute_due_at, compute_sla_state


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _escape_like(value: str) -> str:
    """Escape special LIKE characters so user input is treated literally."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ── Create ────────────────────────────────────────────────────────────────────

def create_ticket(db: Session, *, customer_name: str, customer_email: str,
                  subject: str, description: str, priority: str = "Medium") -> Ticket:
    now = _utcnow()
    due_at = compute_due_at(now, priority)

    ticket = Ticket(
        ticket_id="TKT-000",  # placeholder, updated after flush
        customer_name=customer_name,
        customer_email=customer_email,
        subject=subject,
        description=description,
        status="Open",
        priority=priority,
        due_at=due_at,
        created_at=now,
        updated_at=now,
    )
    db.add(ticket)
    db.flush()  # get the autoincremented id

    # Build the human-readable ticket ID from the integer PK.
    ticket.ticket_id = f"TKT-{ticket.id:03d}"
    db.commit()
    db.refresh(ticket)
    return ticket


# ── Read (list) ───────────────────────────────────────────────────────────────

def list_tickets(
    db: Session,
    *,
    status: str | None = None,
    search: str | None = None,
    priority: str | None = None,
    sla: str | None = None,
    customer_email: str | None = None,
    sort: str = "priority_sla",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Return (items, total_count). Each item is a dict with sla_state added."""
    query = db.query(Ticket)

    # ── Filters ───────────────────────────────────────────────────────────
    if status:
        query = query.filter(Ticket.status == status)

    if priority:
        query = query.filter(Ticket.priority == priority)

    if customer_email:
        query = query.filter(Ticket.customer_email == customer_email)

    if sla:
        now = _utcnow()
        from app.sla import SLA_HOURS
        from datetime import timedelta
        
        if sla == "overdue":
            query = query.filter(Ticket.status.in_(["Open", "In Progress"]), Ticket.due_at < now)
        elif sla == "at_risk":
            at_risk_conds = []
            for pri, hrs in SLA_HOURS.items():
                at_risk_conds.append(
                    and_(Ticket.priority == pri, Ticket.due_at >= now, Ticket.due_at < now + timedelta(hours=hrs * 0.25))
                )
            query = query.filter(Ticket.status.in_(["Open", "In Progress"]), or_(*at_risk_conds))
        elif sla == "on_track":
            on_track_conds = []
            for pri, hrs in SLA_HOURS.items():
                on_track_conds.append(
                    and_(Ticket.priority == pri, Ticket.due_at >= now + timedelta(hours=hrs * 0.25))
                )
            query = query.filter(Ticket.status.in_(["Open", "In Progress"]), or_(*on_track_conds))

    if search:
        pattern = f"%{_escape_like(search)}%"
        query = query.filter(
            or_(
                Ticket.ticket_id.ilike(pattern, escape="\\"),
                Ticket.customer_name.ilike(pattern, escape="\\"),
                Ticket.customer_email.ilike(pattern, escape="\\"),
                Ticket.subject.ilike(pattern, escape="\\"),
                Ticket.description.ilike(pattern, escape="\\"),
            )
        )

    total = query.count()

    # ── Sorting ───────────────────────────────────────────────────────────
    if sort == "newest":
        query = query.order_by(Ticket.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(Ticket.created_at.asc())
    else:
        # priority_sla: open/in-progress first by due_at asc, then closed by created_at desc
        status_order = case(
            (Ticket.status.in_(["Open", "In Progress"]), literal(0)),
            else_=literal(1),
        )
        query = query.order_by(status_order, Ticket.due_at.asc(), Ticket.created_at.desc())

    tickets = query.offset(offset).limit(min(limit, 200)).all()

    now = _utcnow()
    items = []
    for t in tickets:
        sla_state = compute_sla_state(t.status, t.due_at, t.created_at, t.priority, now)
        items.append({
            "ticket_id": t.ticket_id,
            "customer_name": t.customer_name,
            "customer_email": t.customer_email,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "due_at": t.due_at,
            "sla_state": sla_state,
            "created_at": t.created_at,
        })

    return items, total


# ── Read (single) ─────────────────────────────────────────────────────────────

def get_ticket(db: Session, ticket_id: str) -> dict | None:
    """Fetch a single ticket by its human-readable ID (e.g. TKT-001)."""
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        return None

    now = _utcnow()
    sla_state = compute_sla_state(ticket.status, ticket.due_at, ticket.created_at, ticket.priority, now)

    return {
        "ticket_id": ticket.ticket_id,
        "customer_name": ticket.customer_name,
        "customer_email": ticket.customer_email,
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status,
        "priority": ticket.priority,
        "due_at": ticket.due_at,
        "sla_state": sla_state,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "resolved_at": ticket.resolved_at,
        "notes": [
            {
                "id": n.id,
                "note_text": n.note_text,
                "kind": n.kind,
                "created_at": n.created_at,
            }
            for n in ticket.notes  # already ordered newest-first by relationship
        ],
    }


# ── Update ────────────────────────────────────────────────────────────────────

def update_ticket(
    db: Session,
    ticket_id: str,
    *,
    status: str | None = None,
    priority: str | None = None,
    notes: str | None = None,
) -> dict | None:
    """Update a ticket's status, priority, and/or add a note.

    If status changes, a system note is also created for the activity timeline.
    If priority changes, due_at is recomputed from created_at.
    """
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        return None

    now = _utcnow()

    # ── Status change ─────────────────────────────────────────────────────
    if status and status != ticket.status:
        old_status = ticket.status
        ticket.status = status

        # Set or clear resolved_at
        if status == "Closed":
            ticket.resolved_at = now
        elif old_status == "Closed":
            # Reopening: clear resolved_at
            ticket.resolved_at = None

        # System note for the timeline
        db.add(Note(
            ticket_id=ticket.id,
            note_text=f"Status changed from {old_status} to {status}",
            kind="status_change",
            created_at=now,
        ))

    # ── Priority change ───────────────────────────────────────────────────
    if priority and priority != ticket.priority:
        old_priority = ticket.priority
        ticket.priority = priority
        ticket.due_at = compute_due_at(ticket.created_at, priority)
        
        db.add(Note(
            ticket_id=ticket.id,
            note_text=f"Priority changed from {old_priority} to {priority}",
            kind="priority_change",
            created_at=now,
        ))

    # ── User note ─────────────────────────────────────────────────────────
    if notes:
        db.add(Note(
            ticket_id=ticket.id,
            note_text=notes,
            kind="note",
            created_at=now,
        ))

    ticket.updated_at = now
    db.commit()
    db.refresh(ticket)

    return {"success": True, "updated_at": ticket.updated_at}


# ── Stats ─────────────────────────────────────────────────────────────────────

def get_stats(db: Session) -> dict:
    """Return ticket counts by status plus overdue count."""
    now = _utcnow()

    total = db.query(func.count(Ticket.id)).scalar() or 0
    open_count = db.query(func.count(Ticket.id)).filter(Ticket.status == "Open").scalar() or 0
    in_progress = db.query(func.count(Ticket.id)).filter(Ticket.status == "In Progress").scalar() or 0
    closed = db.query(func.count(Ticket.id)).filter(Ticket.status == "Closed").scalar() or 0

    # Overdue: not closed and past due_at
    overdue = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status.in_(["Open", "In Progress"]), Ticket.due_at < now)
        .scalar() or 0
    )

    from app.sla import SLA_HOURS
    from datetime import timedelta
    
    at_risk_conds = []
    for pri, hrs in SLA_HOURS.items():
        at_risk_conds.append(
            and_(Ticket.priority == pri, Ticket.due_at >= now, Ticket.due_at < now + timedelta(hours=hrs * 0.25))
        )
    at_risk = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status.in_(["Open", "In Progress"]), or_(*at_risk_conds))
        .scalar() or 0
    )
    
    # SLA Met % for Closed tickets
    sla_met_count = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == "Closed", Ticket.resolved_at <= Ticket.due_at)
        .scalar() or 0
    )
    sla_met_pct = (sla_met_count / closed * 100.0) if closed > 0 else 100.0
    
    # by_priority for open and in progress
    priority_counts = (
        db.query(Ticket.priority, func.count(Ticket.id))
        .filter(Ticket.status.in_(["Open", "In Progress"]))
        .group_by(Ticket.priority)
        .all()
    )
    by_priority = {pri: count for pri, count in priority_counts}

    return {
        "all": total,
        "open": open_count,
        "in_progress": in_progress,
        "closed": closed,
        "overdue": overdue,
        "at_risk": at_risk,
        "sla_met_pct": round(sla_met_pct, 1),
        "by_priority": by_priority,
    }
