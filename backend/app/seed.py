"""Seed the database with 28 realistic demo tickets (§4 of PLAN.md)."""

import sys
import argparse
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal, engine, Base
from app.models import Ticket, Note
from app.sla import compute_due_at

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

def seed_demo_data(force_reset=False):
    if force_reset:
        reset_db()
        
    db = SessionLocal()
    try:
        if db.query(Ticket).count() > 0:
            print("Database already seeded. Run with --reset to wipe and reseed.")
            return

        now = datetime.now(timezone.utc)
        
        # Format: (name, email, subject, priority, status, hours_ago_created, resolved_offset_hours)
        # resolved_offset_hours is hours after creation when it was resolved (for closed tickets)
        
        raw = [
            # 3 Overdue (Urgent, High, Medium) - varied times
            ("Aarav Kumar", "aarav@mail.com", "Refund not received after 10 days", "Urgent", "Open", 10.1, None), # SLA 4h. ~6h overdue
            ("Sara Mitchell", "sara.m@inbox.com", "Can't reset my password", "High", "In Progress", 10.5, None), # SLA 8h. ~2h 30m overdue
            ("Rohan Joshi", "rohan.j@company.co", "Invoice PDF is blank", "Medium", "Open", 24.66, None), # SLA 24h. ~40m overdue
            
            # 3 At risk (Under 25% left)
            ("Carlos Rivera", "carlos@webshop.mx", "Shipping tracking not updating", "Urgent", "Open", 3.2, None), # SLA 4h. 0.8h left
            ("Emily Chen", "emily.chen@designlab.com", "Coupon code not applying", "High", "In Progress", 7.0, None), # SLA 8h. 1h left
            ("David Park", "david.park@freelance.net", "API rate limit too low", "Low", "Open", 46.0, None), # SLA 48h. 2h left
            
            # 12 On track (Mix of Open/In Progress, all priorities)
            ("Fatima Al-Hassan", "fatima@enterprise.ae", "Custom domain not resolving", "Medium", "Open", 4, None),
            ("James O'Brien", "james.ob@techcorp.ie", "Export to CSV missing columns", "Low", "Open", 6, None),
            ("Ananya Sharma", "ananya.s@store.in", "Mobile app crashes on login", "High", "In Progress", 3, None),
            ("Liam Wilson", "liam.w@agency.co.uk", "Cannot upload large images", "Medium", "Open", 2, None),
            ("Mei Lin", "mei.lin@shop.cn", "Tax calculation incorrect", "Urgent", "In Progress", 1, None),
            ("Nikolai Petrov", "nikolai@devstudio.ru", "Webhook delivery failing", "High", "In Progress", 2, None),
            ("Omar Hassan", "omar.h@logistics.eg", "Bulk import tool timing out", "Medium", "Open", 5, None),
            ("Isabella Rossi", "isabella.r@fashion.it", "Gift card balance showing zero", "Low", "Open", 12, None),
            ("Arjun Patel", "arjun.p@saas.in", "SSO integration not working", "High", "In Progress", 1.5, None),
            ("Lisa Mueller", "lisa.m@agency.de", "Report scheduler sending wrong time", "Low", "Open", 20, None),
            ("Kevin O'Connor", "kevin.oc@shop.ie", "Payment gateway returns error", "Urgent", "In Progress", 1.2, None),
            ("Zara Ahmed", "zara.a@boutique.pk", "Search returns irrelevant results", "Medium", "In Progress", 8, None),
            
            # 10 Closed (8 within SLA, 2 late)
            ("Sofia Garcia", "sofia.g@retail.es", "Order stuck in processing", "Medium", "Closed", 72, 10), # SLA 24, resolved 10h (met)
            ("Tom Nguyen", "tom.n@consulting.vn", "2FA locked out", "Urgent", "Closed", 48, 2), # SLA 4, resolved 2h (met)
            ("Aisha Bello", "aisha.b@ngo.ng", "Billing address won't update", "Low", "Closed", 96, 20), # SLA 48, resolved 20h (met)
            ("Marcus Johnson", "marcus.j@startup.us", "Dashboard loading slowly", "High", "Closed", 48, 6), # SLA 8, resolved 6h (met)
            ("Yuki Tanaka", "yuki.t@ecommerce.jp", "Duplicate email notifications", "Medium", "Closed", 120, 20), # SLA 24, resolved 20h (met)
            ("Rachel Kim", "rachel.k@brand.kr", "Unable to cancel subscription", "High", "Closed", 36, 5), # SLA 8, resolved 5h (met)
            ("Chen Wei", "chen.w@tech.cn", "Console errors on login", "Low", "Closed", 60, 40), # SLA 48, resolved 40h (met)
            ("Maria Silva", "maria.s@business.br", "Invoice missing VAT number", "Medium", "Closed", 50, 15), # SLA 24, resolved 15h (met)
            
            # Late closed
            ("John Smith", "john@smith.com", "App crashes on launch", "Urgent", "Closed", 30, 8), # SLA 4, resolved 8h (late)
            ("Elena Petrova", "elena@startup.ru", "Missing features in pro plan", "High", "Closed", 40, 12), # SLA 8, resolved 12h (late)
            
            # Add customers with 2-3 tickets (Customer History)
            ("Sofia Garcia", "sofia.g@retail.es", "Another order stuck", "Medium", "Open", 5, None),
            ("Sofia Garcia", "sofia.g@retail.es", "Account merged", "Low", "Closed", 150, 20),
            
            ("Aarav Kumar", "aarav@mail.com", "Missing items in delivery", "High", "In Progress", 2, None),
        ]

        for i, (name, email, subject, priority, status, hours_ago, resolved_offset_h) in enumerate(raw):
            created_at = now - timedelta(hours=hours_ago)
            due_at = compute_due_at(created_at, priority)

            resolved_at = None
            if resolved_offset_h is not None:
                resolved_at = created_at + timedelta(hours=resolved_offset_h)

            ticket = Ticket(
                ticket_id=f"TKT-{i + 1:03d}",
                customer_name=name,
                customer_email=email,
                subject=subject,
                description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                status=status,
                priority=priority,
                due_at=due_at,
                resolved_at=resolved_at,
                created_at=created_at,
                updated_at=created_at + timedelta(minutes=30) if status != "Open" else created_at,
            )
            db.add(ticket)
            db.flush()

            if status in ("In Progress", "Closed"):
                db.add(Note(
                    ticket_id=ticket.id,
                    note_text=f"Status changed from Open to In Progress",
                    kind="status_change",
                    created_at=created_at + timedelta(minutes=15),
                ))

            if status == "Closed":
                db.add(Note(
                    ticket_id=ticket.id,
                    note_text=f"Status changed from In Progress to Closed",
                    kind="status_change",
                    created_at=resolved_at,
                ))

        db.commit()
        print(f"Seeded {len(raw)} demo tickets.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database")
    parser.add_argument("--reset", action="store_true", help="Wipe database and reseed")
    args = parser.parse_args()
    seed_demo_data(args.reset)
