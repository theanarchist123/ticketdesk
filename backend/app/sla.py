"""SLA computation — pure functions, no DB access (§3 of PLAN.md).

Priority → response target hours:
  Urgent: 4h, High: 8h, Medium: 24h, Low: 48h

sla_state is computed on read, never stored. This keeps the app simple
and free to host. The tradeoff: nothing sends an alert when a ticket
goes overdue (first thing to add with a scheduled job + Slack/email).
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

SlaState = Literal["on_track", "at_risk", "overdue", "resolved"]

# Hours until first response is expected.
SLA_HOURS: dict[str, int] = {
    "Urgent": 4,
    "High": 8,
    "Medium": 24,
    "Low": 48,
}


def compute_due_at(created_at: datetime, priority: str) -> datetime:
    """Return the SLA deadline for a given priority."""
    hours = SLA_HOURS.get(priority, 24)
    return created_at + timedelta(hours=hours)


def compute_sla_state(
    status: str,
    due_at: datetime,
    created_at: datetime,
    priority: str,
    now: datetime | None = None,
) -> SlaState:
    """Determine the current SLA state based on ticket timing.

    - resolved: ticket is Closed
    - overdue:  now > due_at
    - at_risk:  less than 25% of the SLA window remains
    - on_track: everything else
    """
    if status == "Closed":
        return "resolved"

    if now is None:
        now = datetime.now(timezone.utc)

    # Make both datetimes offset-aware for comparison.
    if due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    if now > due_at:
        return "overdue"

    # At-risk when less than 25% of the total SLA window remains.
    total_window = timedelta(hours=SLA_HOURS.get(priority, 24))
    remaining = due_at - now
    if remaining < total_window * 0.25:
        return "at_risk"

    return "on_track"
