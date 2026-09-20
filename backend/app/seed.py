"""Seed the database with 25 realistic demo tickets (§4 of PLAN.md).

Tickets are spread across all statuses and priorities, with staggered
created_at times so that at least 3 are overdue, 3 are at-risk, and
several are closed. Only runs when the table is empty and SEED_DEMO=true.
"""

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import Ticket, Note
from app.sla import compute_due_at


def seed_demo_data():
    db = SessionLocal()
    try:
        if db.query(Ticket).count() > 0:
            return  # already seeded

        now = datetime.now(timezone.utc)

        # Each tuple: (name, email, subject, description, priority, status,
        #              hours_ago_created, resolved_offset_hours_or_None)
        raw = [
            # Overdue tickets (created long enough ago that SLA has passed)
            ("Aarav Kumar", "aarav@mail.com", "Refund not received after 10 days",
             "I returned my order on the 2nd of this month and was told the refund would take 3-5 days. It has been 10 days now and nothing shows in my bank account.",
             "Urgent", "Open", 8, None),

            ("Sara Mitchell", "sara.m@inbox.com", "Can't reset my password",
             "I've tried the password reset link five times and it always says the token has expired. I need access to my account urgently.",
             "High", "In Progress", 14, None),

            ("Rohan Joshi", "rohan.j@company.co", "Invoice PDF is blank",
             "When I download the invoice for order #4521, the PDF opens but every page is completely blank. I need this for my expense report.",
             "Medium", "Open", 30, None),

            ("Priya Nair", "priya.nair@startup.io", "Double charged for subscription",
             "My credit card was charged twice for the monthly plan. I can see two identical transactions on my statement dated the 15th.",
             "Urgent", "Open", 6, None),

            # At-risk tickets (close to their SLA deadline)
            ("Carlos Rivera", "carlos@webshop.mx", "Shipping tracking not updating",
             "The tracking number shows the package hasn't moved in 4 days. It was supposed to arrive by yesterday. Can you check with the carrier?",
             "High", "Open", 7, None),

            ("Emily Chen", "emily.chen@designlab.com", "Coupon code not applying at checkout",
             "I have a 20% discount code SUMMER20 but the checkout page says it is invalid. The code should be valid until end of month.",
             "Medium", "In Progress", 20, None),

            ("David Park", "david.park@freelance.net", "API rate limit too low",
             "Our integration is hitting the 100 requests per minute limit during peak hours. We need at least 500 rpm to keep our sync running smoothly.",
             "High", "Open", 6, None),

            # On-track tickets (recently created, plenty of SLA time)
            ("Fatima Al-Hassan", "fatima@enterprise.ae", "Custom domain not resolving",
             "I added the CNAME record three hours ago as instructed but my custom domain still shows a DNS error. The TTL should have propagated by now.",
             "Medium", "Open", 4, None),

            ("James O'Brien", "james.ob@techcorp.ie", "Export to CSV missing columns",
             "When I export the sales report to CSV, the 'discount' and 'tax' columns are missing. They show fine on screen but disappear in the download.",
             "Low", "Open", 6, None),

            ("Ananya Sharma", "ananya.s@store.in", "Mobile app crashes on login",
             "The Android app crashes immediately after I enter my credentials and tap Sign In. I'm on a Pixel 8 running Android 15. It started after the last update.",
             "High", "In Progress", 3, None),

            ("Liam Wilson", "liam.w@agency.co.uk", "Cannot upload images larger than 2MB",
             "I need to upload product photos that are around 5MB each but the uploader rejects anything over 2MB. The documentation says the limit should be 10MB.",
             "Medium", "Open", 2, None),

            ("Mei Lin", "mei.lin@shop.cn", "Incorrect tax calculation for international orders",
             "Orders shipped to Singapore are being charged 18% GST instead of the correct 9%. This has affected about 15 orders this week.",
             "Urgent", "In Progress", 2, None),

            ("Nikolai Petrov", "nikolai@devstudio.ru", "Webhook delivery failing silently",
             "Our webhook endpoint is not receiving any events since yesterday. The dashboard shows all deliveries as successful but our server logs show zero incoming requests.",
             "High", "In Progress", 4, None),

            # Closed tickets (resolved at various times)
            ("Sofia Garcia", "sofia.g@retail.es", "Order stuck in processing",
             "My order #7832 has been in 'Processing' status for three days. Usually it ships within 24 hours.",
             "Medium", "Closed", 72, 48),

            ("Tom Nguyen", "tom.n@consulting.vn", "Two-factor authentication locked out",
             "I lost my phone and can't receive 2FA codes. I need to regain access to my admin account. I have my backup codes but they aren't working either.",
             "Urgent", "Closed", 12, 3),

            ("Aisha Bello", "aisha.b@ngo.ng", "Billing address won't update",
             "I'm trying to change my billing address but the save button stays greyed out. I've tried different browsers.",
             "Low", "Closed", 96, 72),

            ("Marcus Johnson", "marcus.j@startup.us", "Dashboard loading extremely slowly",
             "The analytics dashboard takes over 30 seconds to load. It used to load in 2-3 seconds. This started after the last deployment on Friday.",
             "High", "Closed", 48, 40),

            ("Yuki Tanaka", "yuki.t@ecommerce.jp", "Duplicate email notifications",
             "I'm receiving every order confirmation email twice. This is confusing my customers and making us look unprofessional.",
             "Medium", "Closed", 120, 100),

            ("Rachel Kim", "rachel.k@brand.kr", "Unable to cancel subscription",
             "The cancel subscription button leads to a 404 page. I've been trying for a week and I'm about to be charged for the next cycle.",
             "High", "Closed", 36, 30),

            # More open/in-progress tickets
            ("Omar Hassan", "omar.h@logistics.eg", "Bulk import tool timing out",
             "When I try to import a CSV with 5000 products, the import tool times out after 3 minutes with no error message. Smaller files of 100 products work fine.",
             "Medium", "Open", 10, None),

            ("Isabella Rossi", "isabella.r@fashion.it", "Gift card balance showing zero",
             "I received a $50 gift card for my birthday. When I try to redeem it, the balance shows as $0. The card number is GC-889921.",
             "Low", "Open", 20, None),

            ("Arjun Patel", "arjun.p@saas.in", "SSO integration not working with Okta",
             "We configured SAML SSO with Okta following the documentation but the redirect loop never resolves. The Okta logs show a successful assertion but your app rejects it.",
             "High", "In Progress", 5, None),

            ("Lisa Mueller", "lisa.m@agency.de", "Report scheduler sending at wrong time",
             "The daily report is set for 9:00 AM CET but it arrives at 9:00 AM UTC instead. The timezone setting in my profile is correct.",
             "Low", "Open", 30, None),

            ("Kevin O'Connor", "kevin.oc@shop.ie", "Payment gateway returns generic error",
             "About 20% of credit card transactions fail with 'An error occurred'. No specific error code is shown. This is costing us sales.",
             "Urgent", "In Progress", 3, None),

            ("Zara Ahmed", "zara.a@boutique.pk", "Product search returns irrelevant results",
             "Searching for 'red dress' returns items like 'blue jeans' and 'green scarf'. The search used to work correctly last month.",
             "Medium", "In Progress", 12, None),
        ]

        for i, (name, email, subject, desc, priority, status, hours_ago, resolved_h) in enumerate(raw):
            created_at = now - timedelta(hours=hours_ago)
            due_at = compute_due_at(created_at, priority)

            resolved_at = None
            if resolved_h is not None:
                resolved_at = now - timedelta(hours=resolved_h)

            ticket = Ticket(
                ticket_id=f"TKT-{i + 1:03d}",
                customer_name=name,
                customer_email=email,
                subject=subject,
                description=desc,
                status=status,
                priority=priority,
                due_at=due_at,
                resolved_at=resolved_at,
                created_at=created_at,
                updated_at=created_at + timedelta(minutes=30) if status != "Open" else created_at,
            )
            db.add(ticket)
            db.flush()

            # Add some notes to tickets that are in-progress or closed
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
                    created_at=created_at + timedelta(hours=2),
                ))

            # Add a sample user note to some tickets
            if i % 3 == 0 and status != "Open":
                sample_notes = [
                    "Called the customer and confirmed the details. Working on a resolution.",
                    "Escalated to the engineering team for investigation.",
                    "Customer confirmed the issue is resolved after our fix.",
                    "Verified the fix in staging before deploying to production.",
                ]
                db.add(Note(
                    ticket_id=ticket.id,
                    note_text=sample_notes[i % len(sample_notes)],
                    kind="note",
                    created_at=created_at + timedelta(minutes=45),
                ))

        db.commit()
        print(f"Seeded {len(raw)} demo tickets.")
    finally:
        db.close()
