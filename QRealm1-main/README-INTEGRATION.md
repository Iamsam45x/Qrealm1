Integration notes and local run instructions

1) Prerequisites
- Install Node.js (>=20) and npm, or use Bun.
- PostgreSQL and Redis for the backend (Docker Compose is provided in `backend/docker-compose.yml`).

2) Quick local run (recommended)

Backend:
```bash
cd backend
# install
npm ci
# copy .env.example -> .env and update DATABASE_URL
# run migrations and seed
npm run db:migrate:dev
npm run db:seed
# run dev server
npm run dev
```

Frontend:
```bash
cd <repo-root>
npm ci
# create .env from .env.example and ensure NEXT_PUBLIC_API_URL points to backend (include /api)
npm run dev
```

3) Notes for integration
- The frontend API client is at `lib/api.ts`. It reads `NEXT_PUBLIC_API_URL` and expects backend endpoints under `/blogs`, `/forums`, `/auth`, etc.
- Backend CORS is configured via `FRONTEND_ORIGIN` in the backend `.env` (see `backend/.env.example`). Set it to your Next app origin (e.g. `http://localhost:3000`).
- The backend serves API under `/api` (see `backend/src/server.ts`). If `NEXT_PUBLIC_API_URL` points to `http://localhost:4000/api`, frontend calls will map directly to `/blogs` paths.

4) When you have Node/npm available here, I can:
- Run `npm ci` and builds for both frontend and backend and run smoke tests.
- Apply small UI changes to call the API endpoints from pages (optional).
