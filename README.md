# TicketDesk

A calm command center for customer support teams. Built for small teams (online stores, SaaS startups) to log issues, find them instantly, and ensure nothing falls through the cracks. 

The standout feature is **Priority + SLA tracking**. Every ticket gets a computed response deadline based on its priority. Overdue and at-risk tickets rise to the top automatically, using compute-on-read so there are no background jobs required for state calculation.

## Features
- **Instant Search**: Find any ticket instantly by name, email, or ID using the command palette (⌘K) or search bar.
- **SLA Tracking**: Clear visual indicators (SLA ring) show how much time is left to respond based on priority.
- **Live Preview**: When creating tickets, a live side-by-side preview shows how it will look in the queue.
- **Activity Timeline**: Full history of what happened and who did what, combining system status changes with agent notes.
- **Calm Design**: Dark-first, low-glare interface with semantic colors only used where attention is needed.

## Stack
- **Backend**: Python, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite, pytest
- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui, Animate UI, TanStack Query, React Router, react-hook-form + zod
- **Deploy**: Railway (single Docker service)

## Running Locally (5 Commands)

1. **Install backend dependencies:**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
```

2. **Start the backend (with demo data seed):**
```bash
uvicorn app.main:app --reload --port 8000
```
*(The database will seed automatically on first run if `SEED_DEMO=true` in `.env`)*

3. **Install frontend dependencies:**
```bash
# In a new terminal
cd frontend
npm install
```

4. **Start the frontend:**
```bash
npm run dev
```

5. **Open the app:**
Navigate to `http://localhost:5173`

## Environment Variables

See `.env.example` for details. You need:
- `DATABASE_URL=postgresql://user:password@hostname/dbname` (or sqlite for local testing)
- `SEED_DEMO=true`
- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tickets` | Create a new ticket |
| `GET` | `/api/tickets` | List tickets (with filters: status, search, priority, sort) |
| `GET` | `/api/tickets/{id}` | Get ticket details including activity timeline |
| `PUT` | `/api/tickets/{id}` | Update status, priority, or add a note |
| `GET` | `/api/stats` | Get queue statistics |
| `GET` | `/api/health` | Health check endpoint |

## Next Steps / Future Improvements
- **Authentication**: Add JWT-based auth for agents.
- **Background Alerts**: Send email or Slack notifications when a ticket becomes overdue.
- **Email Intake**: Automatically convert incoming support emails to tickets via webhooks.
- **File Attachments**: Support for image/document uploads in ticket descriptions and notes.
