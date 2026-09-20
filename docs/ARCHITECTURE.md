# Architecture: TicketDesk

This document provides a brief overview of the architecture of TicketDesk, intended to explain the technical decisions made during the build.

## Core Stack

- **Backend:** FastAPI, Python, SQLAlchemy 2.0, SQLite
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query

## Deployment Architecture

TicketDesk is designed to be deployed as a single service on platforms like Render.

1. **Single Service:** FastAPI acts as both the API server (handling `/api/*` routes) and the static file server (serving the built React app from `frontend/dist/` for all other routes). This eliminates CORS configuration issues in production and keeps the deployment simple.
2. **Database:** We use a managed PostgreSQL database (like Render PostgreSQL). The `DATABASE_URL` environment variable points to this external database, ensuring data persistence across redeployments without needing to mount local disk volumes.
3. **Multi-stage Docker Build:** A single `Dockerfile` builds both the frontend and backend. Stage 1 uses Node to build the React app, and Stage 2 uses Python to install backend dependencies, copy the built frontend assets, and run the FastAPI server.

## Data Model

We have two main tables:
1. `tickets`: Stores the core ticket information (customer, subject, description, priority, status).
2. `notes`: Stores a running log of activity (both user comments and system status changes) linked to a ticket via a foreign key.

### Compute-on-Read SLA

A key feature of TicketDesk is SLA tracking. However, we do **not** store the current SLA state (e.g., "overdue", "at_risk") in the database. Instead:
- We store the `created_at` timestamp and compute a `due_at` timestamp based on the priority.
- The `sla_state` is calculated **on the fly** when the data is read (both on the backend for API responses, and continuously updated on the frontend via a `useNow` hook).

**Why?** This "compute-on-read" approach eliminates the need for complex background workers (like Celery or cron jobs) that constantly poll the database to update statuses. It keeps the application lightweight and free to host. The tradeoff is that we cannot easily send automated alerts when a ticket goes overdue without adding that background worker later.

## Frontend State Management

- **TanStack Query:** Used for data fetching, caching, and optimistic UI updates. When a ticket is updated (e.g., status changed or note added), we invalidate the relevant queries (`['tickets']`, `['ticket', id]`, `['stats']`) to automatically refresh the data.
- **URL-Driven Search & Filters:** The search query, active status tab, priority filter, and sort order on the queue page are stored in the URL search parameters (`?status=Open&search=refund`). This makes the current view shareable and ensures it survives page reloads.

## Design System

The application uses a custom "calm command center" design system built on top of Tailwind CSS and shadcn/ui. 
- **Dark-First:** Designed to be low-glare for agents who stare at it all day.
- **Semantic Colors:** Colors are strictly tied to meaning (e.g., warm colors like Orange and Rose mean "needs attention" for high-priority or overdue tickets).
- **Motion:** Purposeful animation (via Animate UI and Framer Motion) is used to draw attention to changes (like the SLA ring drawing in) without overwhelming the user with unnecessary movement.
