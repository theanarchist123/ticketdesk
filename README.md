# TicketDesk

**A support ticketing CRM built for the Datastraw Full Stack Developer Assessment.**

🔗 **Live Demo:** [https://ticketdesk-92r3.onrender.com/](https://ticketdesk-92r3.onrender.com/)
📦 **GitHub:** [https://github.com/theanarchist123/ticketdesk](https://github.com/theanarchist123/ticketdesk)

> **Note:** The app is hosted on Render's free tier, so the first load may take ~30 seconds if the server has gone to sleep. After that it's fast.

---

## Why I Chose This Problem Statement

Out of all the options, I picked the **support ticketing CRM** because it felt like a real-world problem I could relate to. Every company I've interacted with — from food delivery apps to SaaS tools — has some kind of ticket system behind the scenes. I wanted to build something that actually solves a tangible problem: **small support teams losing track of customer issues across inboxes and spreadsheets.**

What made this problem statement interesting to me was the **SLA tracking** angle. It's not just a CRUD app — there's actual business logic involved. Every ticket gets a response deadline based on its priority, and the system automatically flags overdue tickets. That compute-on-read SLA engine was something I genuinely enjoyed designing because it's the kind of invisible feature that makes or breaks a support team's workflow.

---

## Tech Stack and Why I Used It

### Backend: Python + FastAPI + SQLAlchemy + PostgreSQL

I went with **FastAPI** because it gives me automatic API documentation out of the box (the `/docs` endpoint), Pydantic validation for request/response schemas, and it's genuinely fast. For a ticketing system where the frontend constantly polls for updates, response time matters.

**SQLAlchemy 2.0** handles the ORM layer. I chose it over raw SQL because the relationships (tickets → notes) and the filtering logic (search across multiple columns, SLA-based filtering, priority sorting) would have been painful to write and maintain in raw SQL.

**PostgreSQL** was the obvious choice for a production database. SQLite would have worked for development, but I wanted the deployed version to use a real database. Render offers managed PostgreSQL, so it was a natural fit.

**pytest** handles the test suite — I have 43 tests covering ticket creation, updates, listing with filters, SLA computation, and edge cases.

### Frontend: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui

I used **React with TypeScript** because type safety catches bugs before they reach the browser. During development, TypeScript actually saved me multiple times — it caught missing imports and mismatched types that would have been silent runtime errors otherwise.

**Vite** is the build tool because it's significantly faster than Create React App for both development (hot module replacement) and production builds.

**Tailwind CSS v4** with **shadcn/ui** gave me a solid component library (buttons, dropdowns, selects, dialogs) without having to build everything from scratch. shadcn/ui is great because the components are copied into my project — I own the code and can customize anything.

I also used **TanStack Query** for data fetching, which handles caching, background refetching, and loading states automatically. **motion** (formerly Framer Motion) handles the animations.

### Why Not Next.js?

I specifically chose a **React SPA + FastAPI** architecture over Next.js because the problem statement asked for a Python backend with specific API endpoints. A separate FastAPI backend gave me full control over the API design, and having FastAPI serve the built React app from a single Docker container simplified deployment significantly.

---

## Deployment: Render

I deployed on **Render** using a single Docker service. Here's why:

1. **Single service architecture:** FastAPI serves both the API (`/api/*`) and the built React frontend (static files from `frontend/dist`). This means no CORS issues in production and only one service to manage.
2. **Managed PostgreSQL:** Render provides a free managed PostgreSQL instance, so I don't have to worry about database backups or maintenance.
3. **Auto-deploy from GitHub:** Every push to `main` triggers an automatic build and deployment.

The **Dockerfile** uses a multi-stage approach:
- First, it installs Node.js and builds the React frontend (`npm run build`)
- Then it sets up the Python backend and copies the built frontend into the backend's static directory
- Finally, it runs uvicorn to serve everything

---

## Design: The "Calm Command Center"

### Color Scheme

I went with a **dark-first design** using deep navy/midnight tones (`#0E1220` background, `#151A2C` surfaces) because support agents stare at this tool for hours. Bright white interfaces cause eye strain over long sessions. The dark theme is the default, and every color was chosen to be low-glare but still readable.

The color palette uses **oklch color space** for consistency across the UI. Key semantic colors:
- **Purple (`#7C7CFF`)** — the brand/primary color. Used for buttons, focus states, and "on track" SLA indicators
- **Rose red (`#F43F5E`)** — overdue/urgent. Immediately draws the eye to tickets that need attention
- **Orange (`#FB7C3C`)** — at-risk/high priority. A warning state between "fine" and "overdue"
- **Green (`#34D399`)** — resolved/closed. Visual reward for completing work

### Typography

I used three fonts from Google Fonts:
- **Bricolage Grotesque** — for headings and display text (it has personality without being distracting)
- **Instrument Sans** — for body text (clean, highly legible at small sizes)
- **JetBrains Mono** — for ticket IDs and timestamps (monospace for easy scanning)

### Design Inspiration

I drew inspiration from tools like **Linear**, **Height**, and **Notion** — apps that feel premium and calm rather than cluttered. The key principles:
- No shadows anywhere — structure comes from borders and background color differences
- Generous whitespace so the eye can rest
- Animations are subtle (fade-ins, not bounces) and respect `prefers-reduced-motion`
- Closed tickets dim to 65% opacity so they visually recede

---

## Architecture — How Everything Fits Together

```
Browser (React SPA on localhost:5173)
   │  fetch /api/...
   ▼
FastAPI (localhost:8000)  ──►  SQLAlchemy ORM  ──►  PostgreSQL (Render)
   │
   └── In production: serves frontend/dist for every non-/api route (SPA fallback)
```

### Backend File Structure

```
backend/
├── app/
│   ├── main.py          → FastAPI app setup, CORS, lifespan (db init + seeding), static file serving
│   ├── config.py        → Environment config using pydantic-settings (DATABASE_URL, etc.)
│   ├── database.py      → SQLAlchemy engine + session factory + get_db dependency
│   ├── models.py        → SQLAlchemy models: Ticket and Note tables
│   ├── schemas.py       → Pydantic v2 request/response schemas with validation
│   ├── crud.py          → All database operations (create, list, get, update, stats)
│   ├── sla.py           → Pure SLA computation functions (no DB access)
│   ├── seed.py          → Generates 32 realistic sample tickets for demo purposes
│   └── routers/
│       └── tickets.py   → API route handlers (POST, GET, PUT for tickets + stats)
├── tests/
│   ├── test_tickets.py  → 42 tests covering all CRUD operations and edge cases
│   └── test_sla.py      → SLA computation unit tests
└── requirements.txt     → Python dependencies
```

### Frontend File Structure

```
frontend/src/
├── App.tsx              → Router setup, QueryClient provider, theme provider
├── main.tsx             → React DOM entry point
├── index.css            → Complete design system (dark/light tokens, typography, semantic colors)
├── pages/
│   ├── dashboard.tsx    → Overview page: stat strip, priority bar, "needs attention" list
│   └── tickets/
│       ├── index.tsx    → Support queue: filterable, sortable ticket list with load-more
│       ├── new.tsx      → New ticket form with live preview and SLA target display
│       └── detail.tsx   → Single ticket view: SLA ring, status stepper, activity timeline
├── components/
│   ├── layout.tsx       → Sidebar nav, top bar with search + notification bell
│   ├── command-palette.tsx → Cmd+K search palette
│   ├── theme-provider.tsx  → Dark/light theme context
│   └── ticket/
│       ├── ticket-row.tsx   → Single row in the queue list (with SLA badge, priority pill)
│       └── queue-toolbar.tsx → Filter tabs, priority dropdown, sort dropdown
├── hooks/
│   ├── useTickets.ts    → TanStack Query hooks for tickets and stats API calls
│   ├── useDebounce.ts   → Debounce hook for search input
│   └── useNow.ts        → Auto-updating timestamp for live SLA countdown
└── lib/
    ├── api.ts           → Fetch wrapper for all API endpoints
    ├── format.ts        → Date formatting utilities (time ago, time left)
    ├── sla.ts           → Frontend SLA color/label computation
    └── types.ts         → TypeScript interfaces for Ticket, Stats, Note, etc.
```

### Key Design Decision: Compute-on-Read SLA

The SLA state (`on_track`, `at_risk`, `overdue`, `resolved`) is **never stored in the database**. Every time a ticket is fetched, the backend computes the SLA state by comparing the current time against the ticket's `due_at` timestamp. This means:
- No background jobs or cron tasks needed
- The SLA state is always accurate to the second
- It's free to host (no worker processes)

The tradeoff is that we can't send proactive alerts when a ticket goes overdue — that would require a scheduled job. But for the scope of this project, compute-on-read was the right call.

---

## The SLA Engine — How It Works

Every ticket gets a response deadline based on its priority:

| Priority | Response Target | Rationale |
|----------|----------------|-----------|
| Urgent   | 4 hours        | System down, security breach — needs immediate response |
| High     | 8 hours        | Major feature broken — within a business day |
| Medium   | 24 hours       | Standard issues — next day response |
| Low      | 48 hours       | Nice-to-haves, general questions |

The SLA state is computed using this logic:
- **Resolved**: Ticket is Closed → green checkmark
- **Overdue**: Current time has passed `due_at` → red, rises to top of queue
- **At-risk**: Less than 25% of the SLA window remains → orange warning
- **On-track**: Everything else → calm purple

This is implemented as a pure function in `backend/app/sla.py` with no database access, making it easy to test independently.

---

## API Endpoints

The backend exposes four core endpoints plus a stats endpoint:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets` | Create a new ticket |
| `GET` | `/api/tickets` | List tickets with filters (status, priority, SLA, search, sort) |
| `GET` | `/api/tickets/{id}` | Get full ticket details with activity timeline |
| `PUT` | `/api/tickets/{id}` | Update ticket (subject, status, priority, or add a note) |
| `GET` | `/api/stats` | Dashboard statistics (counts, SLA %, priority breakdown) |

FastAPI auto-generates interactive docs at `/docs` — you can test every endpoint right there in the browser.

---

## API Testing with Postman

I tested all the API endpoints on the live deployed backend using Postman. Here are the results:

### 1. POST — Creating a New Ticket

![POST request creating a new ticket with 201 Created response](WhatsApp%20Image%202026-09-20%20at%2018.51.48.jpeg)

I sent a `POST` request to `https://ticketdesk-92r3.onrender.com/api/tickets` with a JSON body containing customer details, subject ("Security issues!!"), priority ("Urgent"), and a description. The API responded with `201 Created` and returned the new ticket's ID (`TKT-035`), creation timestamp, and the computed `due_at` deadline. Since the priority is Urgent, the SLA deadline was automatically set to 4 hours from creation.

### 2. PUT — Updating a Ticket's Status and Priority

![PUT request updating ticket status to In Progress and priority to High](WhatsApp%20Image%202026-09-20%20at%2018.53.25.jpeg)

I sent a `PUT` request to update ticket `TKT-016` — changing its status to "In Progress" and priority to "High". The API responded with `200 OK` and confirmed the update timestamp. Behind the scenes, this also created two system notes in the activity timeline ("Status changed from Open to In Progress" and "Priority changed from Medium to High") and recomputed the SLA deadline based on the new priority.

### 3. GET — Fetching a Single Ticket's Full Details

![GET request fetching full details of ticket TKT-014](WhatsApp%20Image%202026-09-20%20at%2018.54.54.jpeg)

I fetched the full details of ticket `TKT-014` ("Gift card balance showing zero"). The response includes all the ticket metadata, the computed `sla_state` ("on_track" because the deadline hasn't passed), timestamps, and the notes array (empty because no notes have been added yet). This is what powers the ticket detail page in the frontend.

### 4. GET — Dashboard Statistics

![GET request fetching dashboard stats showing counts and SLA metrics](WhatsApp%20Image%202026-09-20%20at%2018.55.44.jpeg)

I hit the `/api/stats` endpoint to get the dashboard overview data. The response shows 35 total tickets, with 13 open, 10 in progress, and 12 closed. There are 6 overdue tickets and 2 at risk. The `sla_met_pct` is 83.3%, meaning about 5 out of 6 closed tickets were resolved within their SLA window. The `by_priority` breakdown shows the distribution of active tickets across priority levels.

---

## Errors I Ran Into and How I Fixed Them

### 1. Database Seeding Failure on Render

**The problem:** When I first deployed to Render with PostgreSQL, the app crashed on startup with a `ProgrammingError: relation "tickets" does not exist` error. The seed function was trying to insert data before the database tables were created.

**The fix:** I restructured the FastAPI lifespan handler to call `Base.metadata.create_all()` before the seeding function runs. I also made sure all SQLAlchemy models were imported in `database.py` before `create_all()` is called, because SQLAlchemy only creates tables for models it knows about.

### 2. TypeScript Build Errors During Docker Build

**The problem:** The Docker build failed at `npm run build` with TypeScript errors: `Property 'by_priority' does not exist on type 'Stats'` and `'ChevronLeft' is declared but its value is never read`. The app worked fine in development (Vite doesn't enforce strict TypeScript) but the production build runs `tsc -b` which does.

**The fix:** I added the missing `sla_met_pct` and `by_priority` fields to the `Stats` TypeScript interface in `lib/types.ts`, and removed unused imports (`ChevronLeft`, `ChevronRight`) from the tickets page. Lesson learned: always run `npm run build` locally before pushing to catch these.

### 3. `formatTimeLeft is not defined` Runtime Error

**The problem:** The dashboard page crashed with `ReferenceError: formatTimeLeft is not defined`. The function was being used in the component but its import was missing.

**The fix:** Added the missing import for `formatTimeLeft` from `@/lib/format`. This was a simple oversight during a refactor — the function was moved to a utility file but the import wasn't updated.

### 4. Tickets Page Not Loading

**The problem:** The tickets queue page showed a blank screen. The browser console showed that `useStats` was not defined.

**The fix:** The `useStats` hook was being called in the component but wasn't imported. I added `useStats` to the import statement from `@/hooks/useTickets`.

### 5. PUT Request Not Updating Ticket Subject

**The problem:** When I tried to update a ticket's subject via the PUT endpoint in Postman, the API returned `200 OK` but the subject didn't actually change.

**The fix:** The `TicketUpdate` Pydantic schema only accepted `status`, `priority`, and `notes` fields — the `subject` field wasn't defined, so FastAPI silently ignored it. I added `subject` to the schema, updated the CRUD function to handle subject changes, and added a system note to the activity timeline whenever the subject is modified.

---

## How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (or use SQLite for quick testing)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on `http://localhost:8000`.

---

## Testing

```bash
cd backend
pytest
```

All **43 tests** pass, covering:
- Ticket creation with automatic SLA deadline computation
- Listing with status, priority, search, and SLA filters
- Sorting by priority+SLA (default), newest, and oldest
- Updating status, priority, and subject
- Adding notes and verifying the activity timeline
- SLA state computation (on_track, at_risk, overdue, resolved)
- Edge cases (empty search, invalid ticket IDs, missing fields)

---

## What's Out of Scope

As mentioned in the design document, these features are intentionally excluded:
- **Authentication** — no login system, all agents share access
- **Email/WhatsApp intake** — tickets are created manually through the UI or API
- **File attachments** — not supported on tickets
- **Multi-tenant support** — single team, single database
- **Background jobs and alerts** — SLA tracking is compute-on-read, no proactive notifications
