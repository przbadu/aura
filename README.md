# AgentChat

AI-powered chat application with customizable skills, code execution, and document management. Built with Next.js, FastAPI, and Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| UI | shadcn/ui (Base UI), Zustand, Lucide icons |
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| LLM | Anthropic SDK + OpenAI SDK (dual provider) |
| Database | Supabase (Postgres + Auth + Storage) |
| Infra | Docker Compose, Kong API Gateway |

## Features

- **Chat** — Real-time streaming via SSE, thread management, markdown rendering with syntax highlighting
- **Skills** — Create reusable AI behavior units with instructions, import/export as ZIP (Agent Skills standard)
- **Skill Files** — Attach building-block files (scripts, templates, assets) to skills
- **Code Execution** — Python sandbox in Docker containers with streaming output
- **Documents** — Drag-and-drop file upload and management
- **Auth** — Supabase JWT auth with RLS, auto-refresh on 401
- **Themes** — Dark/light/system with OKLCH color variables

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (for self-hosted Supabase or code execution)

### 1. Clone and configure

```bash
git clone <repo-url> && cd chat-app
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required: Set a strong password and JWT secret
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-at-least-32-characters

# LLM: Use a local model (OpenAI-compatible) or Anthropic
LLM_PROVIDER=openai          # or "anthropic"
LLM_BASE_URL=http://localhost:11434/v1  # Ollama, vLLM, etc.
LLM_API_KEY=not-needed        # or your API key
LLM_MODEL=llama3              # model name

# Supabase: Use cloud or self-hosted (see Docker section)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8443
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 2. Install dependencies

```bash
# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && cd ..
```

### 3. Start the database

**Option A: Supabase Cloud**

Create a project at [supabase.com](https://supabase.com), run the migration in the SQL editor, and update `.env` with your project URL and keys.

**Option B: Self-hosted (Docker)**

```bash
docker compose up -d db auth rest storage kong
```

Then apply the migration:

```bash
# Connect to the database and run:
psql -h localhost -p 5432 -U supabase_admin -d postgres -f supabase/migrations/20240101000000_initial_schema.sql
```

### 4. Run the app

**Development (with hot reload):**

```bash
# Install foreman: gem install foreman (or use overmind/hivemind)
foreman start -f Procfile.dev
```

This starts:
- Backend at `http://localhost:8001`
- Frontend at `http://localhost:5100`

**Or run separately:**

```bash
# Terminal 1: Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Terminal 2: Frontend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev -- --port 5100
```

## Docker Production Deployment

```bash
docker compose up -d
```

Services:
- Frontend → `http://localhost:3000`
- Backend → `http://localhost:8000`
- Supabase API (Kong) → `http://localhost:8443`
- Postgres → `localhost:5432`

## Project Structure

```
chat-app/
├── frontend/                   # Next.js application
│   └── src/
│       ├── app/
│       │   ├── (app)/         # Authenticated: /chat, /skills, /documents
│       │   └── (auth)/        # Public: /login, /signup
│       ├── components/        # UI components
│       ├── stores/            # Zustand state (chat-store, skills-store)
│       └── lib/api.ts         # API client with auth + retry
│
├── backend/                    # FastAPI application
│   └── app/
│       ├── routers/           # API endpoints
│       ├── services/          # LLM, sandbox, system prompt
│       ├── models/            # Pydantic schemas
│       └── auth/              # JWT auth dependency
│
├── supabase/migrations/        # Database schema
├── docker-compose.yml          # Production deployment
└── Procfile.dev                # Development processes
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check with DB status |
| `POST` | `/api/chat` | Stream chat response (SSE) |
| `GET` | `/api/threads` | List user's threads |
| `POST` | `/api/threads` | Create thread |
| `PATCH` | `/api/threads/:id` | Update thread |
| `DELETE` | `/api/threads/:id` | Delete thread + messages |
| `GET` | `/api/threads/:id/messages` | Get thread messages |
| `GET` | `/api/skills` | List skills |
| `POST` | `/api/skills` | Create skill |
| `PATCH` | `/api/skills/:id` | Update skill |
| `DELETE` | `/api/skills/:id` | Delete skill |
| `GET` | `/api/skills/:id/export` | Export skill as ZIP |
| `POST` | `/api/skills/import` | Import skill from ZIP |
| `POST` | `/api/execute-code` | Execute Python in sandbox (SSE) |

## Database Schema

Six tables with Row Level Security:

- **threads** — Conversation threads (user_id, title)
- **messages** — Chat messages (thread_id, role, content, tool_calls)
- **skills** — AI behavior definitions (name, description, instructions, enabled)
- **skill_files** — Files attached to skills (filename, storage_path)
- **code_executions** — Execution audit log (code, stdout, stderr, exit_code)
- **sandbox_files** — Generated output files

## LLM Configuration

Supports two providers, configured via environment variables:

**Anthropic (Claude):**
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
```

**OpenAI-compatible (Ollama, vLLM, LM Studio, etc.):**
```env
LLM_PROVIDER=openai
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=not-needed
LLM_MODEL=llama3
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | JWT signing secret (32+ chars) |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key |
| `LLM_PROVIDER` | No | `openai` | `openai` or `anthropic` |
| `LLM_BASE_URL` | No | — | OpenAI-compatible API URL |
| `LLM_API_KEY` | No | — | LLM API key |
| `LLM_MODEL` | No | — | Model name |
| `LLM_MAX_TOKENS` | No | `4096` | Max response tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase URL for frontend |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API URL |
| `SANDBOX_ENABLED` | No | `false` | Enable code execution |
| `DISABLE_SIGNUP` | No | `false` | Disable new user registration |

## License

Private
