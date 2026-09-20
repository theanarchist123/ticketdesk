"""Tests for the TicketDesk API (§4 of PLAN.md).

Covers: SLA computation, ticket CRUD, search, status filter, note creation,
status_change system notes, 404 and 422 error shapes.
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.sla import compute_due_at, compute_sla_state, SLA_HOURS

# ── Test database setup (in-memory SQLite) ────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_tickets.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    """Recreate all tables before each test for isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── SLA unit tests ────────────────────────────────────────────────────────────

class TestSLA:
    def test_compute_due_at_urgent(self):
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Urgent")
        assert due == created + timedelta(hours=4)

    def test_compute_due_at_low(self):
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Low")
        assert due == created + timedelta(hours=48)

    def test_sla_state_resolved(self):
        now = datetime(2025, 1, 1, 14, 0, tzinfo=timezone.utc)
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Medium")
        assert compute_sla_state("Closed", due, created, "Medium", now) == "resolved"

    def test_sla_state_overdue(self):
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Urgent")  # 4h window
        now = created + timedelta(hours=5)  # 1h past deadline
        assert compute_sla_state("Open", due, created, "Urgent", now) == "overdue"

    def test_sla_state_at_risk(self):
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Medium")  # 24h window
        # 20h in → 4h remaining → 4/24 = 16.7% remaining (< 25%)
        now = created + timedelta(hours=20)
        assert compute_sla_state("Open", due, created, "Medium", now) == "at_risk"

    def test_sla_state_on_track(self):
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Medium")  # 24h window
        now = created + timedelta(hours=2)  # plenty of time
        assert compute_sla_state("Open", due, created, "Medium", now) == "on_track"

    def test_sla_state_boundary_exactly_at_25_percent(self):
        """At exactly 25% remaining, should be at_risk (< 25% triggers it)."""
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Medium")  # 24h window → due at 12:00 next day
        # 18h elapsed → 6h remaining → 6/24 = 25% → NOT at risk (need < 25%)
        now = created + timedelta(hours=18)
        assert compute_sla_state("Open", due, created, "Medium", now) == "on_track"

    def test_sla_state_boundary_just_past_due(self):
        """One second past due_at should be overdue."""
        created = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        due = compute_due_at(created, "Urgent")
        now = due + timedelta(seconds=1)
        assert compute_sla_state("Open", due, created, "Urgent", now) == "overdue"

    def test_all_priorities_have_hours(self):
        for p in ("Urgent", "High", "Medium", "Low"):
            assert p in SLA_HOURS


# ── Ticket CRUD tests ────────────────────────────────────────────────────────

class TestCreateTicket:
    def _create(self, **overrides):
        payload = {
            "customer_name": "Test User",
            "customer_email": "test@example.com",
            "subject": "Test subject line",
            "description": "A detailed description that is at least 10 characters long.",
            "priority": "Medium",
        }
        payload.update(overrides)
        return client.post("/api/tickets", json=payload)

    def test_create_returns_201(self):
        resp = self._create()
        assert resp.status_code == 201
        data = resp.json()
        assert data["ticket_id"] == "TKT-001"
        assert "created_at" in data
        assert "due_at" in data

    def test_sequential_ticket_ids(self):
        r1 = self._create(customer_name="First User")
        r2 = self._create(customer_name="Second User")
        assert r1.json()["ticket_id"] == "TKT-001"
        assert r2.json()["ticket_id"] == "TKT-002"

    def test_create_with_priority(self):
        resp = self._create(priority="Urgent")
        assert resp.status_code == 201

    def test_create_validation_short_name(self):
        resp = self._create(customer_name="A")
        assert resp.status_code == 422

    def test_create_validation_bad_email(self):
        resp = self._create(customer_email="not-an-email")
        assert resp.status_code == 422

    def test_create_validation_short_description(self):
        resp = self._create(description="Too short")
        assert resp.status_code == 422

    def test_422_error_shape(self):
        resp = self._create(customer_name="A")
        assert resp.status_code == 422
        data = resp.json()
        assert "detail" in data


class TestListTickets:
    def _seed(self, n=3):
        for i in range(n):
            client.post("/api/tickets", json={
                "customer_name": f"User {i}",
                "customer_email": f"user{i}@test.com",
                "subject": f"Issue number {i}",
                "description": f"Detailed description for issue number {i} with enough chars.",
                "priority": ["Low", "Medium", "High"][i % 3],
            })

    def test_list_returns_all(self):
        self._seed(3)
        resp = client.get("/api/tickets")
        assert resp.status_code == 200
        assert len(resp.json()) == 3
        assert resp.headers.get("X-Total-Count") == "3"

    def test_status_filter(self):
        self._seed(3)
        # Move one to In Progress
        client.put("/api/tickets/TKT-001", json={"status": "In Progress"})
        resp = client.get("/api/tickets?status=In Progress")
        assert len(resp.json()) == 1
        assert resp.json()[0]["ticket_id"] == "TKT-001"

    def test_search_by_name(self):
        self._seed(3)
        resp = client.get("/api/tickets?search=User 0")
        assert len(resp.json()) >= 1

    def test_search_by_ticket_id(self):
        self._seed(3)
        resp = client.get("/api/tickets?search=TKT-002")
        assert len(resp.json()) == 1
        assert resp.json()[0]["ticket_id"] == "TKT-002"

    def test_search_by_email(self):
        self._seed(3)
        resp = client.get("/api/tickets?search=user1@test.com")
        assert len(resp.json()) >= 1

    def test_search_by_description(self):
        self._seed(3)
        resp = client.get("/api/tickets?search=issue number 2")
        assert len(resp.json()) >= 1

    def test_search_case_insensitive(self):
        self._seed(3)
        resp = client.get("/api/tickets?search=USER 0")
        assert len(resp.json()) >= 1

    def test_search_escapes_wildcards(self):
        """User typing '%' should not match everything."""
        self._seed(3)
        resp = client.get("/api/tickets?search=%25")
        # % encoded as %25 in URL — shouldn't match normal ticket data
        assert len(resp.json()) == 0

    def test_pagination(self):
        self._seed(5)
        resp = client.get("/api/tickets?limit=2&offset=0")
        assert len(resp.json()) == 2
        assert resp.headers["X-Total-Count"] == "5"

    def test_sla_state_in_response(self):
        self._seed(1)
        resp = client.get("/api/tickets")
        assert "sla_state" in resp.json()[0]


class TestGetTicket:
    def test_get_existing(self):
        client.post("/api/tickets", json={
            "customer_name": "Detail User",
            "customer_email": "detail@test.com",
            "subject": "Detail test ticket",
            "description": "A description that is long enough for validation to pass easily.",
        })
        resp = client.get("/api/tickets/TKT-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ticket_id"] == "TKT-001"
        assert data["description"] == "A description that is long enough for validation to pass easily."
        assert "notes" in data
        assert "sla_state" in data

    def test_404_for_missing(self):
        resp = client.get("/api/tickets/TKT-999")
        assert resp.status_code == 404
        data = resp.json()
        assert "detail" in data

    def test_404_shape(self):
        resp = client.get("/api/tickets/TKT-999")
        assert resp.status_code == 404
        assert "detail" in resp.json()


class TestUpdateTicket:
    def _create_one(self):
        client.post("/api/tickets", json={
            "customer_name": "Update User",
            "customer_email": "update@test.com",
            "subject": "Update test ticket",
            "description": "A description for the update test that is long enough.",
        })

    def test_add_note(self):
        self._create_one()
        resp = client.put("/api/tickets/TKT-001", json={"notes": "A test note"})
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        detail = client.get("/api/tickets/TKT-001").json()
        user_notes = [n for n in detail["notes"] if n["kind"] == "note"]
        assert len(user_notes) == 1
        assert user_notes[0]["note_text"] == "A test note"

    def test_status_change_creates_system_note(self):
        self._create_one()
        client.put("/api/tickets/TKT-001", json={"status": "In Progress"})

        detail = client.get("/api/tickets/TKT-001").json()
        status_notes = [n for n in detail["notes"] if n["kind"] == "status_change"]
        assert len(status_notes) == 1
        assert "Open" in status_notes[0]["note_text"]
        assert "In Progress" in status_notes[0]["note_text"]

    def test_close_sets_resolved_at(self):
        self._create_one()
        client.put("/api/tickets/TKT-001", json={"status": "Closed"})
        detail = client.get("/api/tickets/TKT-001").json()
        assert detail["resolved_at"] is not None

    def test_reopen_clears_resolved_at(self):
        self._create_one()
        client.put("/api/tickets/TKT-001", json={"status": "Closed"})
        client.put("/api/tickets/TKT-001", json={"status": "Open"})
        detail = client.get("/api/tickets/TKT-001").json()
        assert detail["resolved_at"] is None

    def test_priority_change(self):
        self._create_one()
        resp = client.put("/api/tickets/TKT-001", json={"priority": "Urgent"})
        assert resp.status_code == 200
        detail = client.get("/api/tickets/TKT-001").json()
        assert detail["priority"] == "Urgent"

    def test_note_and_status_in_one_request(self):
        self._create_one()
        resp = client.put("/api/tickets/TKT-001", json={
            "status": "In Progress",
            "notes": "Working on it now",
        })
        assert resp.status_code == 200
        detail = client.get("/api/tickets/TKT-001").json()
        assert detail["status"] == "In Progress"
        notes = detail["notes"]
        assert any(n["kind"] == "note" and n["note_text"] == "Working on it now" for n in notes)
        assert any(n["kind"] == "status_change" for n in notes)

    def test_update_404(self):
        resp = client.put("/api/tickets/TKT-999", json={"notes": "test"})
        assert resp.status_code == 404


class TestStats:
    def test_stats_empty(self):
        resp = client.get("/api/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data == {"all": 0, "open": 0, "in_progress": 0, "closed": 0, "overdue": 0}

    def test_stats_with_tickets(self):
        for i in range(3):
            client.post("/api/tickets", json={
                "customer_name": f"Stats User {i}",
                "customer_email": f"stats{i}@test.com",
                "subject": f"Stats issue {i}",
                "description": f"Description for stats test number {i} with enough length.",
            })
        client.put("/api/tickets/TKT-002", json={"status": "In Progress"})
        client.put("/api/tickets/TKT-003", json={"status": "Closed"})

        resp = client.get("/api/stats")
        data = resp.json()
        assert data["all"] == 3
        assert data["open"] == 1
        assert data["in_progress"] == 1
        assert data["closed"] == 1


class TestHealth:
    def test_health(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
