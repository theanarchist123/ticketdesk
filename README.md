# TicketDesk

A customer support ticketing CRM with priority-based SLA tracking.

> Full documentation coming in Phase 7.

## Quick start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173
