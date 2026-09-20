# TicketDesk: Build Plan

A support ticketing CRM for the Datastraw assessment.
Stack: **FastAPI + SQLite** (backend) · **React + Vite + TypeScript + Tailwind + shadcn/ui + Animate UI** (frontend) · **Railway** (deploy).

Save this file as `docs/PLAN.md` in the repo. It is the single source of truth for the build.

---

## 1. Product in one paragraph

Small support teams (online stores, SaaS startups) track customer complaints across inboxes and spreadsheets, so tickets get buried, nobody knows what is overdue, and history is lost. TicketDesk gives an agent one place to log an issue, find it in seconds, move it through Open → In progress → Closed, and keep a running record of every action. The stand-out feature is **priority + SLA tracking**: every ticket gets a response deadline, and overdue tickets rise to the top.

**Users:** support agents (log, update, resolve) and support leads (see what is overdue at a glance).

**Success criteria**
- Create a ticket in under 30 seconds.
- Find any ticket in under 2 seconds with search.
- See which tickets are overdue without opening anything.

**Out of scope (say this in the submission email):** authentication, email/WhatsApp intake, attachments, multi-tenant support, background jobs and alerts.

---

## 2. Architecture

One deployable service. FastAPI serves the JSON API under `/api` and also serves the built React app, so there is no CORS setup in production and only one Railway service.

```
Browser (React SPA)
   │  fetch /api/...
   ▼
FastAPI  ──►  SQLAlchemy  ──►  SQLite file on a Railway volume (/data/tickets.db)
   │
   └── serves frontend/dist for every non-/api route (SPA fallback)
```

**Dev:** Vite dev server on `:5173` proxies `/api` to FastAPI on `:8000`.
**Prod:** multi-stage Dockerfile builds the frontend, copies `dist/` into the Python image, runs `uvicorn`.

### Repo structure

```
ticketdesk/
├── README.md
├── .env.example
├── .gitignore
├── Dockerfile
├── railway.json              (optional)
├── docs/
│   ├── PLAN.md               (this file)
│   └── ARCHITECTURE.md       (short, written for the demo video)
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py           app factory, CORS (dev only), static mount, error handlers
│   │   ├── config.py         env settings (DATABASE_URL, SEED_DEMO, CORS_ORIGINS)
│   │   ├── database.py       engine, session, Base, init on startup
│   │   ├── models.py         Ticket, Note
│   │   ├── schemas.py        Pydantic v2 request/response models
│   │   ├── sla.py            SLA hours, due_at, sla_state (pure functions, unit tested)
│   │   ├── crud.py           list/create/get/update, ticket_id generation
│   │   ├── routers/tickets.py
│   │   └── seed.py           demo data, runs only if table is empty and SEED_DEMO=true
│   └── tests/test_tickets.py
└── frontend/
    ├── package.json
    ├── vite.config.ts        proxy /api → :8000, alias @ → src
    ├── components.json       shadcn + Animate UI registry config
    └── src/
        ├── main.tsx
        ├── App.tsx           router + providers
        ├── index.css         design tokens (Tailwind v4 @theme + CSS variables)
        ├── pages/            QueuePage, NewTicketPage, TicketDetailPage, NotFoundPage
        ├── components/
        │   ├── layout/       AppShell, SideRail, MobileNav, ThemeToggle, CommandPalette
        │   ├── ticket/       TicketRow, TicketCard, StatusBadge, PriorityMark, SlaRing,
        │   │                 StatusStepper, ActivityTimeline, NoteComposer, TicketPreview,
        │   │                 QueueToolbar, EmptyState, ErrorState
        │   ├── ui/           shadcn components
        │   └── animate-ui/   Animate UI components
        ├── lib/              api.ts, utils.ts, sla.ts, format.ts
        ├── hooks/            useDebouncedValue, useTickets, useTicket, useNow
        └── types.ts
```

---

## 3. Data model (2 tables)

**tickets**

| column | type | notes |
|---|---|---|
| id | integer PK | autoincrement |
| ticket_id | text unique | `TKT-001`, built from `id` after insert, in the same transaction |
| customer_name | text | required, 2–80 chars |
| customer_email | text | required, valid email |
| subject | text | required, 3–120 chars |
| description | text | required, 10–4000 chars |
| status | text | `Open` \| `In Progress` \| `Closed`, default `Open` |
| priority | text | `Low` \| `Medium` \| `High` \| `Urgent`, default `Medium` |
| due_at | timestamp | `created_at + SLA hours` |
| resolved_at | timestamp, nullable | set when status becomes Closed, cleared if reopened |
| created_at | timestamp | UTC |
| updated_at | timestamp | UTC, bumped on any change |

Indexes: `status`, `due_at`, `created_at`.

**notes**

| column | type | notes |
|---|---|---|
| id | integer PK | |
| ticket_id | integer FK → tickets.id | `ON DELETE CASCADE` |
| note_text | text | |
| kind | text | `note` \| `status_change` (system entries so the timeline shows history) |
| created_at | timestamp | UTC |

### SLA rules (`sla.py`)

| Priority | Response target |
|---|---|
| Urgent | 4 hours |
| High | 8 hours |
| Medium | 24 hours |
| Low | 48 hours |

`sla_state` is **computed on read**, never stored:
- `resolved`: status is Closed
- `overdue`: now > due_at
- `at_risk`: less than 25% of the SLA window remains
- `on_track`: everything else

Changing priority recomputes `due_at` from `created_at`. Compute-on-read keeps the app simple and free to host; the tradeoff is that nothing sends an alert when a ticket goes overdue. That is the first thing to add with more time (a scheduled job plus email or Slack).

---

## 4. API

All errors return `{ "detail": "human-readable message", "errors": [{ "field": "...", "message": "..." }] }` (the `errors` array only on 422). Unknown ticket returns 404.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/api/tickets` | `{ customer_name, customer_email, subject, description, priority? }` | `201 { ticket_id, created_at, due_at }` |
| GET | `/api/tickets` | `?status=&search=&priority=&sort=&limit=&offset=` | `[{ ticket_id, customer_name, customer_email, subject, status, priority, due_at, sla_state, created_at }]` and header `X-Total-Count` |
| GET | `/api/tickets/{ticket_id}` | none | `{ ticket_id, customer_name, customer_email, subject, description, status, priority, due_at, sla_state, created_at, updated_at, notes: [{ id, note_text, kind, created_at }] }` (notes newest first) |
| PUT | `/api/tickets/{ticket_id}` | `{ status?, priority?, notes? }` (at least one) | `{ success: true, updated_at }` |
| GET | `/api/stats` | none | `{ all, open, in_progress, closed, overdue }` (feeds the queue tabs) |
| GET | `/api/health` | none | `{ ok: true }` (Railway health check) |

The first four match the assignment exactly. `stats` and `health` are small additions.

**Behaviour details**
- `search` is case-insensitive and matches `ticket_id`, `customer_name`, `customer_email`, `subject`, `description`. Escape `%` and `_` so user input cannot act as wildcards.
- Default `sort=priority_sla`: open and in-progress tickets first ordered by `due_at` ascending (overdue naturally on top), then closed tickets by `created_at` descending. Other options: `newest`, `oldest`.
- `PUT` with `notes` inserts a `note` row. If `status` changed, also insert a `status_change` row ("Status changed from Open to In progress"). Set or clear `resolved_at` accordingly.
- Default `limit=50`, max 200.

**Seed data:** 25 realistic tickets across all statuses and priorities, created at staggered times so at least 3 are overdue, 3 are at risk, and several are closed. Runs only when the table is empty and `SEED_DEMO=true`.

**Tests (pytest):** SLA function (each state and boundary), create returns `TKT-001` then `TKT-002`, search matches each field, status filter, PUT adds a note and a status_change row, 404 and 422 shapes.

---

## 5. Design system

### 5.1 Direction

TicketDesk is a **calm command center**. Agents stare at it for hours, so it is dark-first, low-glare, dense enough to scan hundreds of rows, and quiet everywhere except where something needs attention. The one memorable element is the **SLA ring**, a small circular countdown that appears on every ticket row and grows into the centerpiece of the detail page. Everything else stays disciplined so the ring reads as the signature.

Avoid: generic gradient washes on cards, identical rounded cards everywhere, tracked-out ALL-CAPS labels above every heading, numbered markers on non-sequences, one accent word in every headline.

### 5.2 Color

Dark is the default; light is a full alternate theme. Both are defined as CSS variables in `index.css` and mapped to shadcn tokens.

| Role | Dark | Light | Why |
|---|---|---|---|
| Background ("Midnight") | `#0E1220` | `#F4F6FB` | Deep blue-navy instead of neutral black; cool grey-white instead of pure white or cream |
| Surface ("Deck") | `#151A2C` | `#FFFFFF` | Panels, table, side panel |
| Raised ("Lift") | `#1D2340` | `#EEF1FA` | Hover rows, inputs, popovers |
| Border | `#2A3152` | `#DEE3F0` | Structure without shadows |
| Text ("Frost") | `#E8ECF8` | `#12162B` | Primary text |
| Muted ("Mist") | `#8E97B8` | `#5B6385` | Secondary text, meta |
| Primary ("Signal") | `#7C7CFF` | `#5B5BF0` | Buttons, focus ring, active tab, on-track SLA. The only brand color |

**Semantic colors** (each always paired with an icon or text, never color alone):

| Meaning | Dark | Light |
|---|---|---|
| Open | Sky `#38BDF8` | `#0284C7` |
| In progress | Amber `#FACC15` | `#A16207` |
| Closed | Mint `#34D399` | `#047857` (closed rows also dim slightly so resolved work recedes) |
| Urgent / overdue | Rose `#F43F5E` | `#E11D48` |
| High / at risk | Orange `#FB7C3C` | `#C2410C` |
| Low / Medium priority | Mist (neutral) | Mist (neutral) |

**The rule:** warm colors (orange, rose) mean "needs attention sooner", and only appear for High/Urgent priority and at-risk/overdue SLA. Cool colors and neutrals describe state. A lead scanning the list sees red and orange first, which is the point.

**Where gradients are allowed:** only the SLA ring stroke on the detail page and one soft Signal glow behind it. Nowhere else.

### 5.3 Typography

| Role | Font | Notes |
|---|---|---|
| Display (page titles, ticket subject, big SLA time) | **Bricolage Grotesque** | Variable font, weight 600–700, slightly tight tracking |
| Body and UI | **Instrument Sans** | 400/500/600 |
| Ticket IDs and timestamps only | **JetBrains Mono** | `tabular-nums`, so columns align. Not used for other labels |

Load through `@fontsource-variable/*` packages (no external requests at runtime).

Scale: 12 / 13 / 14 (body) / 16 / 20 / 28 (page title) / 36 (ticket subject on desktop) / 44 (SLA time). Body line-height 1.55, line length under 75 characters in reading areas (description, notes). Sentence case everywhere. No ALL CAPS labels.

### 5.4 Shape, spacing, depth

- **Radius by hierarchy:** 8px controls (inputs, buttons), 12px panels, 18px the live preview and SLA panel, full pill for badges. Not one radius on everything.
- **Spacing:** 4px base. Table rows 56px tall on desktop. Page gutters 24px desktop, 16px mobile.
- **Depth:** borders and a 1px inner highlight (`inset 0 1px 0 rgb(255 255 255 / 0.04)` in dark). No stacked grey drop shadows. Popovers and the command palette get one soft, larger shadow.

### 5.5 Motion (Animate UI + Motion)

Budget: motion answers what the person did, plus one orchestrated moment.

- **One entrance moment:** on first load of the queue, rows stagger in once (each about 30ms apart, 350ms total) and the SLA rings draw in. Never repeated on filter or search.
- **Action-driven (welcome):** status tabs with a sliding indicator, row hover highlight that glides between rows, stepper fill when status changes, badge cross-fade on status change, new note sliding into the timeline, toast entrance, command palette open, button press.
- **Everything else is still.** No fade-up on every section, no hover lift on every card.
- Durations 150–250ms, ease-out. Respect `prefers-reduced-motion` (disable stagger and ring draw, keep instant state changes).
- The SLA ring re-computes every 30 seconds on the client (`useNow` hook), so it ticks without polling the server.

### 5.6 Icons and imagery

`lucide-react`, 16px in rows and 18px in navigation, stroke 1.75. Customer avatars are initials on a tinted circle, with a hue derived from the email (deterministic, muted, never one of the semantic colors). No stock illustrations. Empty states use a simple inline SVG built from the ring motif.

### 5.7 Microcopy

Plain verbs, sentence case, one name per action across the whole flow.

| Moment | Copy |
|---|---|
| Primary button, new ticket | "Create ticket" → toast "Ticket TKT-015 created" |
| Note button | "Save note" → toast "Note saved" |
| Status action | "Move to In progress" / "Close ticket" / "Reopen ticket" |
| Empty queue | "No tickets yet. Create the first one." + button |
| Empty search | "Nothing matches "refund". Try a name, email, or ticket ID." + "Clear search" |
| Network error | "Couldn't load tickets. Check your connection and try again." + "Retry" |
| Validation | "Enter a valid email, like name@company.com" (say what to fix, never "Invalid input") |
| Not found | "This ticket doesn't exist. It may have been mistyped." + "Back to queue" |

---

## 6. Pages

Global shell: a slim **side rail** on desktop (logo mark, Queue, New ticket, theme toggle at the bottom) and a **bottom nav** on mobile. A **command palette** (`⌘K` or `Ctrl+K`) searches tickets and jumps to pages from anywhere. Keyboard: `/` focuses search, `n` opens New ticket, `Esc` closes overlays.

### 6.1 Queue (home, `/`)

The status filter and the summary are the same control, so there is no separate row of stat cards.

```
┌────┬───────────────────────────────────────────────────────────────────────┐
│ ◈  │ Support queue                              [ Search…       ⌘K ] [+ New ticket]
│    │ 5 tickets are past their response time · Show them                    │
│ ▤  │                                                                       │
│ ＋ │ All 42   Open 18   In progress 9   Closed 15         Priority ▾  Sort ▾
│    │ ━━━━━━━                                                               │
│    │ ID        Customer            Subject                Priority  Status    Due          Created
│    │ TKT-042  (AK) Aarav K.        Refund not received…   ▂▄▆█ Urgent  ● Open   ◔ Overdue 1h   2h ago
│    │ TKT-039  (SM) Sara M.         Can't reset password…  ▂▄▆  High    ◐ In progress ◔ 3h 10m   5h ago
│ ☾  │ TKT-031  (RJ) Rohan J.        Invoice PDF is blank   ▂▄   Medium  ✓ Closed   Resolved     1d ago
└────┴───────────────────────────────────────────────────────────────────────┘
```

- Header: page title in Bricolage 28px. The subline is live and clickable ("5 tickets are past their response time · Show them" applies the overdue filter). If none are overdue: "Nothing is overdue."
- Tabs (Animate UI tabs with sliding indicator) show counts from `/api/stats`. Active tab uses Signal.
- Search: debounced 250ms, server-side, the result count is announced in an `aria-live` region. Matching text in the row is highlighted subtly.
- Row anatomy: mono ticket ID, initials avatar + name + email (muted), subject (single line, truncated), priority mark (bar glyph plus label), status badge, **SLA ring (20px) + time text**, relative created date with the full timestamp in a tooltip.
- Row hover: a highlight that glides between rows (Animate UI highlight). Whole row is a link to the detail page.
- Closed rows are dimmed (opacity about 0.65) so open work dominates.
- Mobile: rows become stacked cards (ID + status on top, subject, customer, SLA at the bottom). Filters move into a bottom sheet.
- Pagination: "Load more" button using `limit/offset` and `X-Total-Count`.
- States: skeleton rows while loading (same height as real rows, no layout shift), empty, empty search, error with retry.

### 6.2 New ticket (`/new`)

Two columns on desktop: the form on the left, a **live preview** on the right that updates as you type. On mobile the preview collapses into a "Preview" section under the form.

```
┌────┬────────────────────────────────────────────────────────────────────────┐
│    │ New ticket                                                             │
│    │ Log an issue in under a minute.                                        │
│    │                                                                        │
│    │ Customer name  [                    ]     ┌ Preview ────────────────┐  │
│    │ Customer email [                    ]     │ TKT-043 (next)          │  │
│    │ Subject        [                    ]     │ (AK) Aarav K.           │  │
│    │ Description    [                    ]     │ Refund not received…    │  │
│    │                [                    ]     │ ▂▄▆█ Urgent  ● Open     │  │
│    │ Priority                                  │      ◔ Respond within 4h│  │
│    │ ( Low 48h ) ( Medium 24h ) ( High 8h ) ( Urgent 4h )                  │  │
│    │                                           └─────────────────────────┘  │
│    │ [ Create ticket ]   Cancel                                             │
└────┴────────────────────────────────────────────────────────────────────────┘
```

- Priority is a segmented control (Animate UI or shadcn toggle group) where each option shows its response target. Selecting one animates the preview's ring and deadline.
- Validation with react-hook-form + zod: inline, on blur, messages say what to fix. Description shows a character counter.
- Submit: button shows a loading state, then navigates to the new ticket's detail page with the toast "Ticket TKT-043 created".
- Server errors (422) map back onto the matching fields.

### 6.3 Ticket detail (`/tickets/:ticketId`)

This is the showpiece. Two columns on desktop; the right panel is sticky.

```
┌────┬────────────────────────────────────────────────────────────────────────┐
│    │ ← Queue                                            [ Copy link ]       │
│    │ TKT-042                                                                │
│    │ Refund not received after 10 days                    (Bricolage 36px)  │
│    │                                                                        │
│    │ Open ━━━━━● In progress ─────○ Closed             (stepper = status)   │
│    │                                                                        │
│    │ ┌──────────────────────────────────────┐ ┌────────────────────────┐    │
│    │ │ Description                          │ │        ◔               │    │
│    │ │ I returned my order on the 2nd…      │ │   (large SLA ring)     │    │
│    │ │                                      │ │     1h 12m over        │    │
│    │ │ Activity                             │ │   Urgent · 4h target   │    │
│    │ │  ● Status changed to In progress     │ │ ────────────────────── │    │
│    │ │  ● "Called the courier…"             │ │ Customer               │    │
│    │ │  ● Ticket created                    │ │ (AK) Aarav K.          │    │
│    │ │                                      │ │ aarav@mail.com  [copy] │    │
│    │ │ [ Add a note…                     ]  │ │ ────────────────────── │    │
│    │ │ Status [In progress ▾] [Save note]   │ │ Created / Updated      │    │
│    │ └──────────────────────────────────────┘ └────────────────────────┘    │
└────┴────────────────────────────────────────────────────────────────────────┘
```

- The **status stepper** is a real sequence (Open → In progress → Closed), so it is the one place a stepper is justified. Clicking a step moves the ticket there. It fills with a short animation and cross-fades the badge.
- The **SLA panel** is the memorable moment: a 160px ring with a Signal gradient stroke and a soft Signal glow behind it, the time in Display 44px inside or beneath it, and the priority and target below. Ring color follows `sla_state` (Signal / orange / rose / mint). Changing priority animates the ring to its new value.
- **Activity timeline:** vertical line with dots, newest first. `status_change` entries are muted and compact; notes are readable blocks at 15px. A new note slides in at the top after saving.
- **Composer:** textarea, status select, one "Save note" button. Submit with `Ctrl+Enter`. A note and a status change in the same submit are sent in one `PUT`.
- Priority can be changed from a small dropdown in the side panel.
- Mobile: single column, the SLA panel becomes a compact bar under the title, and the composer sticks to the bottom.
- States: skeleton layout, 404 state, save error with retry, optimistic note insert that rolls back on failure.

### 6.4 Not found (`*`)

Centered composition using the ring motif as a broken/empty ring illustration, the not-found copy above, and a "Back to queue" button. Keep it short and on brand.

### 6.5 Command palette (overlay)

shadcn `Command` in a dialog. Empty query shows "Create new ticket", "Go to queue", "Switch theme", and the 5 most recent tickets. Typing searches tickets via the API (debounced) and lists ID, name, subject, status. `Enter` opens the ticket.

---

## 7. Frontend libraries

| Purpose | Library |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (`button input textarea badge table select dropdown-menu command dialog sheet sonner skeleton tooltip avatar separator label popover toggle-group`) |
| Animated components | **Animate UI** (installed via the shadcn CLI registry). Use it for tabs with a sliding indicator, the gliding hover highlight, animated counting numbers, animated toggles/segmented controls. Check `animate-ui.com/docs` (or its MCP server) for current component names before installing |
| Animation engine | `motion` (Animate UI is built on it), used directly only for the ring draw and stagger |
| Data fetching | TanStack Query (caching, retry, optimistic updates) |
| Routing | React Router |
| Forms | react-hook-form + zod + `@hookform/resolvers` |
| Icons | lucide-react |
| Dates | `date-fns` |
| Fonts | `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/instrument-sans`, `@fontsource-variable/jetbrains-mono` |

Register the Animate UI registry in `components.json`:

```json
"registries": { "@animate-ui": "https://animate-ui.com/r/{name}.json" }
```

Then install with `npx shadcn@latest add @animate-ui/<component>`. Verify the exact registry name and component list in the Animate UI docs first; if a component you need does not exist, build it with `motion` and shadcn primitives instead of forcing a substitute.

**Data flow:** `lib/api.ts` is a thin typed `fetch` wrapper that throws a typed `ApiError`. Query keys: `['tickets', filters]`, `['ticket', id]`, `['stats']`. Mutations invalidate `tickets`, `ticket`, and `stats`. Search state lives in the URL (`?q=&status=&priority=&sort=`) so filtered views are shareable and survive refresh.

**Accessibility floor:** visible focus ring in Signal on every interactive element, AA contrast in both themes, keyboard reachable tabs/rows/stepper, `aria-live` for result counts and toasts, reduced-motion honored, tap targets at least 44px on mobile.

---

## 8. Build phases

Each phase ends with a check. Commit at the end of every phase.

| # | Phase | Output | Check |
|---|---|---|---|
| 0 | Scaffold | Repo, Vite app, FastAPI app, Tailwind, shadcn init, Animate UI registry, fonts, tokens in `index.css` | Both dev servers run; `/api/health` returns ok through the Vite proxy |
| 1 | Backend core | Models, schemas, `sla.py`, crud, 4 endpoints + stats + health, seed, pytest | `pytest` passes; Swagger at `/docs` shows every endpoint working |
| 2 | Design system | Tokens for both themes, typography, `StatusBadge`, `PriorityMark`, `SlaRing`, `AppShell`, theme toggle | A temporary `/dev/kit` page shows every component in both themes |
| 3 | Queue page | Tabs, search, filters, sort, rows/cards, states, URL-synced filters, first-load motion | Search feels instant; all four states visible; mobile layout works |
| 4 | New ticket | Form, validation, live preview, priority control, redirect + toast | Create a ticket in under 30 seconds; server errors map to fields |
| 5 | Ticket detail | Stepper, SLA panel, timeline, composer, priority change, optimistic notes | Status + note in one save; ring updates; 404 state works |
| 6 | Polish | Command palette, keyboard shortcuts, 404 page, skeleton audit, reduced motion, a11y pass, remove the kit page | Lighthouse accessibility 95+; no layout shift; both themes clean |
| 7 | Ship | Dockerfile, Railway service + volume, env vars, seed on first boot, README, `.env.example`, `ARCHITECTURE.md` | Public URL works end to end from a private browser window |
| 8 | Submit | Demo video, submission email | Checklist in section 10 complete |

---

## 9. Deployment (Railway)

1. **Dockerfile (multi-stage):** stage 1 `node:22-alpine` runs `npm ci && npm run build` in `frontend/`. Stage 2 `python:3.12-slim` installs `requirements.txt`, copies `backend/` and the built `dist/` into `backend/static`, then runs `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
2. **Static serving:** mount `/assets` from the build output and return `index.html` for any non-`/api` path so React Router deep links work on refresh.
3. **Persistence:** SQLite lives on a file, and container filesystems reset on every deploy. Attach a **Railway volume** mounted at `/data` and set `DATABASE_URL=sqlite:////data/tickets.db`. Without this, tickets vanish on redeploy and the evaluators may see an empty app.
4. **Env vars:** `DATABASE_URL`, `SEED_DEMO=true`, `CORS_ORIGINS` (dev only). Commit `.env.example`, never `.env`.
5. **Health check:** `/api/health`.
6. Check Railway's current free-trial and pricing limits before you rely on it. If it is not workable, Render supports the same Dockerfile, and the assignment allows either.

Deployment note from the PDF: do not spend hours on this. Getting it live matters more than perfecting it.

---

## 10. Deliverables checklist

**Repo:** README (what it is, screenshots, features, stack, run locally in 5 commands, env vars, API table, deploy notes, what I would do next), `.env.example`, `.gitignore` (node_modules, `.env`, `*.db`, `__pycache__`, `dist`), clean folder structure, meaningful commits.

**Demo video (3–5 min):**

| Time | Content |
|---|---|
| 0:00 | The problem in two sentences, then the finished app |
| 0:30 | Create a ticket (show the live preview and validation) |
| 1:15 | Search as you type, status tabs, overdue shortcut |
| 1:50 | Open a ticket: change status, add a note, watch the ring and timeline |
| 2:30 | Stand-out feature: priority + SLA, and why compute-on-read |
| 3:00 | Code walkthrough: schema → `sla.py` → one endpoint → the React query hook |
| 4:00 | Challenges solved (ticket ID generation, SQLite persistence on deploy, debounced search) |
| 4:40 | What I would add next (alerts, auth, email intake) |

**Submission email** (to `ozair.shaikh@datastraw.in` and `aryan.jaiswal@datastraw.in`, CC `talent@datastraw.in`): live URL, GitHub link, video link, working LinkedIn link, 2–3 sentences on approach, the stand-out feature with **what / why / tradeoff**, the out-of-scope list, challenges, and next improvements. The PDF's submission section says "Google Apps Script web application", which looks like a template leftover; mention your actual stack (FastAPI on Railway) clearly.

**Be ready to explain (the PDF says they will check):** how `TKT-###` is generated, why SLA is computed on read, how search is escaped, why one service serves both API and frontend, why the volume is needed, and how TanStack Query invalidation keeps the queue and detail page in sync. Keep comments in the code short and in your own words, and modify what the AI generates so it is yours.

---

## 11. Definition of done

- [ ] All 5 required features work on the deployed URL
- [ ] The stand-out feature (priority + SLA) works and is explained
- [ ] Data survives a redeploy
- [ ] Both themes look finished on every page
- [ ] Mobile layout works on queue, new ticket, and detail
- [ ] Loading, empty, and error states exist on every page
- [ ] `pytest` passes; `/docs` works
- [ ] README lets a stranger run it locally in 5 minutes
- [ ] Demo video recorded and uploaded; email drafted
