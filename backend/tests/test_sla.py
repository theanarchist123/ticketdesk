import pytest
from datetime import datetime, timedelta, timezone
from app.sla import compute_sla_state

def test_sla_state_at_risk():
    created_at = datetime.now(timezone.utc) - timedelta(hours=20)
    due_at = created_at + timedelta(hours=24) # Medium priority
    now = created_at + timedelta(hours=17) # 7 hours remaining, > 6h (25% of 24h). So on_track
    
    assert compute_sla_state("Open", due_at, created_at, "Medium", now) == "on_track"
    
    now = created_at + timedelta(hours=19) # 5 hours remaining < 6h. So at_risk
    assert compute_sla_state("Open", due_at, created_at, "Medium", now) == "at_risk"

    now = created_at + timedelta(hours=25) # Overdue
    assert compute_sla_state("Open", due_at, created_at, "Medium", now) == "overdue"
    
    # Check Closed
    assert compute_sla_state("Closed", due_at, created_at, "Medium", now) == "resolved"
