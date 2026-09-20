"""Ticket API router — implements the four core endpoints plus stats (§4 of PLAN.md)."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.database import get_db
from app.schemas import (
    TicketCreate, TicketUpdate,
    TicketListItem, TicketDetail,
    TicketCreateResponse, TicketUpdateResponse,
    StatsOut,
)
from app.crud import create_ticket, list_tickets, get_ticket, update_ticket, get_stats

router = APIRouter()


@router.post("/tickets", response_model=TicketCreateResponse, status_code=201)
def api_create_ticket(body: TicketCreate, db: Session = Depends(get_db)):
    ticket = create_ticket(
        db,
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
    )
    return TicketCreateResponse(
        ticket_id=ticket.ticket_id,
        created_at=ticket.created_at,
        due_at=ticket.due_at,
    )


@router.get("/tickets", response_model=list[TicketListItem])
def api_list_tickets(
    response: Response,
    status: str | None = Query(None),
    search: str | None = Query(None),
    priority: str | None = Query(None),
    sort: str = Query("priority_sla"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = list_tickets(
        db, status=status, search=search, priority=priority,
        sort=sort, limit=limit, offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    return items


@router.get("/tickets/{ticket_id}", response_model=TicketDetail)
def api_get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    result = get_ticket(db, ticket_id)
    if not result:
        raise HTTPException(status_code=404, detail="This ticket doesn't exist. It may have been mistyped.")
    return result


@router.put("/tickets/{ticket_id}", response_model=TicketUpdateResponse)
def api_update_ticket(ticket_id: str, body: TicketUpdate, db: Session = Depends(get_db)):
    result = update_ticket(
        db, ticket_id,
        status=body.status,
        priority=body.priority,
        notes=body.notes,
    )
    if not result:
        raise HTTPException(status_code=404, detail="This ticket doesn't exist. It may have been mistyped.")
    return result


@router.get("/stats", response_model=StatsOut)
def api_stats(db: Session = Depends(get_db)):
    return get_stats(db)
