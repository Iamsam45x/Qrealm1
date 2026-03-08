# Educational Platform ? Backend (FastAPI + SQLite)

Simple, beginner?friendly backend that matches the existing frontend API.

## Stack

- Python + FastAPI
- SQLite (single file)
- JWT auth (access + refresh)
- Local file uploads

## Setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` from `.env.example` and update secrets:

```bash
copy .env.example .env
```

Initialize database and create admin user:

```bash
python -m app.seed
```

Run the server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

## API base

- Base URL: `http://localhost:4000/api`
- Auth: JWT in `Authorization: Bearer <token>` or cookie `accessToken`
- Refresh: cookie `refreshToken` or body `refreshToken`

### Auth
- `POST /api/auth/register` ? body: name, email, password, role?, bio?
- `POST /api/auth/login` ? body: email, password
- `POST /api/auth/logout`
- `GET /api/auth/me` ? requires auth
- `POST /api/auth/refresh` ? refresh token in cookie or body

### Blogs
- `GET /api/blogs` ? query: page, limit, search, published
- `GET /api/blogs/popular` ? query: limit
- `GET /api/blogs/:slug`
- `POST /api/blogs` ? ADMIN/PROFESSOR; body: title, content, published?
- `PUT /api/blogs/:id`
- `DELETE /api/blogs/:id`
- `POST /api/blogs/:id/comment` ? body: content, parentId?
- `POST /api/blogs/:id/like`

### Forums
- `GET /api/forums` ? query: page, limit
- `GET /api/forums/:id`
- `POST /api/forums` ? body: title, content
- `POST /api/forums/:id/comment` ? body: content, parentId?
- `POST /api/forums/:id/like`

### Upload (authenticated)
- `POST /api/upload` ? multipart field `file`
- `POST /api/upload/signed-params` ? returns local upload hint

### Admin (ADMIN only)
- `GET /api/admin/users` ? query: page, limit
- `GET /api/admin/analytics`
- `DELETE /api/admin/user/:id`
