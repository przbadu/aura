<rpg-method>
# Agentic RAG Chat App — Agent Skills & Code Execution Platform

RPG-structured PRD for building a full-stack AI agent platform with customizable skills, file attachments, sandboxed code execution, portable skill format, and persistent tool memory.
</rpg-method>

---

<overview>

## Problem Statement

AI chat applications lack extensibility — users cannot teach the AI new behaviors, attach resource files to those behaviors, or execute code. Tool call results are lost between conversation turns, forcing redundant re-execution. There is no open standard for sharing AI skills between tools.

## Target Users

- **Power users** who want to customize AI behavior for specific domains (legal review, sales analysis, report generation)
- **Developers** who need sandboxed code execution within conversations
- **Teams** who want to share reusable AI skills across members

## Success Metrics

- Users can create, manage, and use skills within conversations
- Code execution completes in sandboxed containers with streaming output
- Skills are portable via the Agent Skills open standard (import/export)
- Tool results persist across conversation turns (zero redundant re-executions)
- UI supports light and dark themes with polished, modern design

</overview>

---

<functional-decomposition>

## Capability Tree

### Capability: Project Foundation
Core infrastructure including project setup, database, authentication, and base UI shell.

#### Feature: Project Scaffolding
- **Description**: Initialize Next.js 15 app with TypeScript, Tailwind CSS v4, and shadcn/ui
- **Inputs**: None
- **Outputs**: Working dev server with base layout
- **Behavior**: Create app router structure, configure Tailwind with CSS variables for theming, install shadcn/ui components

#### Feature: Supabase Integration
- **Description**: Connect to Supabase for auth, database, and storage
- **Inputs**: Supabase project URL and keys
- **Outputs**: Authenticated database client, auth middleware
- **Behavior**: Initialize Supabase client (server + browser), configure RLS policies, setup auth with email/password and OAuth

#### Feature: Database Schema
- **Description**: Create all database tables, indexes, and RLS policies
- **Inputs**: Schema definitions
- **Outputs**: Migrated database with enforced RLS
- **Behavior**: Create tables for users, threads, messages, skills, skill_files, code_executions, sandbox_files. Apply row-level security on all tables.

#### Feature: Theme System
- **Description**: Implement light/dark theme with system preference detection
- **Inputs**: User preference or system setting
- **Outputs**: Themed UI with smooth transitions
- **Behavior**: Use CSS variables with next-themes. Store preference in localStorage. Support system, light, dark modes.

### Capability: Chat Interface
Real-time AI chat with streaming responses, thread management, and rich message rendering.

#### Feature: Thread Management
- **Description**: Create, list, rename, and delete conversation threads
- **Inputs**: User actions (create, select, rename, delete)
- **Outputs**: Thread list in sidebar, active thread state
- **Behavior**: Threads stored in Supabase. Sidebar shows thread list sorted by last activity. New chat button creates a thread. Click to switch. Swipe/right-click to rename or delete.

#### Feature: Message Composing
- **Description**: Rich message input with auto-resize, keyboard shortcuts, and file attachments
- **Inputs**: User text, optional file attachments
- **Outputs**: Submitted message to backend
- **Behavior**: Textarea auto-grows up to 200px. Enter sends, Shift+Enter newline. Attachment button for files. Disable send while streaming.

#### Feature: Message Streaming
- **Description**: Stream AI responses in real-time using Server-Sent Events
- **Inputs**: User message + conversation history
- **Outputs**: Streamed tokens rendered incrementally
- **Behavior**: POST to /api/chat triggers SSE stream. Frontend appends tokens as they arrive. Show typing indicator during generation. Support markdown rendering with syntax highlighting.

#### Feature: Message Display
- **Description**: Render chat messages with markdown, code blocks, and tool call results
- **Inputs**: Message objects with role, content, tool_calls
- **Outputs**: Styled message bubbles with rich content
- **Behavior**: User messages right-aligned, AI messages left-aligned. Render markdown with react-markdown. Syntax highlighting with highlight.js. Copy button on code blocks. Collapsible tool call results.

### Capability: Backend API
FastAPI backend serving the chat, skills, and code execution endpoints.

#### Feature: Chat Endpoint
- **Description**: Stream AI responses via SSE with tool execution
- **Inputs**: Messages array, thread_id, model config
- **Outputs**: SSE stream of tokens, tool calls, and results
- **Behavior**: Load conversation history. Inject system prompt with skill catalog. Call LLM with tools. Stream response tokens. Execute tool calls. Persist messages and tool results.

#### Feature: LLM Integration
- **Description**: Multi-provider LLM client supporting Claude, GPT, Gemini
- **Inputs**: Messages, model config, tools
- **Outputs**: Streamed completion with tool calls
- **Behavior**: Anthropic Claude as primary. Support tool use protocol. Handle streaming responses. Configurable model selection.

#### Feature: System Prompt Builder
- **Description**: Dynamically build system prompt with skill catalog and tool descriptions
- **Inputs**: User's enabled skills, available tools
- **Outputs**: Complete system prompt string
- **Behavior**: Base instructions + skill discovery table (name, description) + tool descriptions + anti-speculation guardrail. Only enabled skills included.

### Capability: Skills Management
CRUD operations for reusable AI behavior units with discovery and activation.

#### Feature: Skills CRUD API
- **Description**: REST endpoints for creating, reading, updating, and deleting skills
- **Inputs**: Skill data (name, description, instructions, enabled, license, metadata)
- **Outputs**: Skill objects with validation
- **Behavior**: POST/GET/PATCH/DELETE on /api/skills. Validate name format (lowercase hyphenated, max 64 chars). Validate description (20-1024 chars). Enforce ownership. Support global skills (user_id=NULL).

#### Feature: Skills UI Page
- **Description**: Two-column skills management page with list and editor
- **Inputs**: User interactions
- **Outputs**: Rendered skills page with full CRUD
- **Behavior**: Left sidebar: searchable skill list with New Skill dropdown (Create with AI, Create Manually, Import). Right side: skill editor form or empty state. Global skills show badge. Disabled skills dimmed.

#### Feature: Skill Discovery & Loading
- **Description**: LLM tools for discovering and loading skills on demand
- **Inputs**: User query context
- **Outputs**: Loaded skill instructions
- **Behavior**: `load_skill` tool fetches full instructions when query matches. `save_skill` tool persists skills from AI-guided creation. Progressive disclosure: catalog in system prompt, full load on demand.

#### Feature: Skill Sharing
- **Description**: Toggle skills between private and global visibility
- **Inputs**: Skill ID, share action
- **Outputs**: Updated skill ownership
- **Behavior**: PATCH /api/skills/{id}/share toggles user_id between current user and NULL. Only skill owner can share. Global skills visible to all authenticated users.

### Capability: Skill Building-Block Files
File attachments for skills — scripts, templates, data files loaded on demand.

#### Feature: File Upload & Storage
- **Description**: Upload files to a skill's dedicated storage path
- **Inputs**: File binary, skill_id
- **Outputs**: Stored file with metadata
- **Behavior**: Store in Supabase Storage at {user_id}/{skill_id}/{filename}. Record metadata in skill_files table. Support any file type.

#### Feature: File Discovery & Reading
- **Description**: LLM tool to list and read skill files on demand
- **Inputs**: Skill ID, filename
- **Outputs**: File content (text) or metadata (binary)
- **Behavior**: `read_skill_file` returns text content inline. Binary files return metadata with note. File list included in load_skill response.

#### Feature: File Preview UI
- **Description**: Side panel for previewing file content in the skill editor
- **Inputs**: Click on file in skill editor
- **Outputs**: Slide-in panel with file content
- **Behavior**: Text files shown in monospace pre block. Binary files show "binary file" message with download button. Copy, download, close buttons in header.

### Capability: Code Execution Sandbox
Secure Python code execution in Docker containers with streaming output.

#### Feature: Docker Sandbox Manager
- **Description**: Manage Docker container lifecycle for code execution sessions
- **Inputs**: Thread ID, code, optional libraries
- **Outputs**: Execution result with stdout/stderr/files
- **Behavior**: Create container per thread (first execution). IPython kernel with variable persistence. Configurable TTL (30 min default). Auto-cleanup expired sessions. Security policy blocks dangerous operations.

#### Feature: Code Execution API
- **Description**: Execute Python code and stream results via SSE
- **Inputs**: Code string, libraries list, expected output filenames
- **Outputs**: SSE events for start/stdout/stderr/complete/error
- **Behavior**: `execute_code` LLM tool. Stream stdout/stderr in real-time. Upload generated files from /sandbox/output/ to Supabase Storage. Record execution in code_executions table.

#### Feature: Code Execution UI
- **Description**: Inline chat component showing code execution with streaming output
- **Inputs**: Code execution SSE events
- **Outputs**: Rendered execution panel
- **Behavior**: Header with Python badge, status spinner/check/error, execution time. Collapsible code preview. Terminal-style output (green stdout, red stderr). Download cards for generated files.

#### Feature: Sandbox File Downloads
- **Description**: Serve generated files via signed download URLs
- **Inputs**: File ID
- **Outputs**: Signed URL for download
- **Behavior**: GET /api/sandbox/files/{file_id}/download returns fresh signed URL. Files scoped by user in sandbox-outputs bucket.

### Capability: Skills Open Standard (Import/Export)
Portable skill format bridging database model with Agent Skills open standard.

#### Feature: Skill Export
- **Description**: Export a skill as a ZIP file in Agent Skills format
- **Inputs**: Skill ID
- **Outputs**: ZIP file with SKILL.md + categorized files
- **Behavior**: Generate SKILL.md with YAML frontmatter + markdown body. Categorize attached files into scripts/, references/, assets/ based on MIME type. Package as ZIP.

#### Feature: Skill Import
- **Description**: Import skills from ZIP files in Agent Skills format
- **Inputs**: ZIP file upload (max 50 MB)
- **Outputs**: Created skill(s) with imported files
- **Behavior**: Support single and bulk imports. Parse YAML frontmatter from SKILL.md. Validate name/description. Upload attached files. Report per-skill results with conflict handling.

### Capability: Persistent Tool Memory
Preserve tool call results across conversation turns.

#### Feature: Tool Result Persistence
- **Description**: Store tool call results in message JSONB for cross-turn reference
- **Inputs**: Tool execution results
- **Outputs**: Persisted results in tool_calls column
- **Behavior**: After tool execution, store full result string alongside call metadata. Cap result size to prevent database bloat. Include tool_call_id for LLM message reconstruction.

#### Feature: History Reconstruction
- **Description**: Rebuild tool call messages when loading conversation history
- **Inputs**: Message history from database
- **Outputs**: Properly formatted LLM message sequence
- **Behavior**: Reconstruct: assistant message with tool_use → tool result messages → assistant text response. Enables AI to reference previous tool outputs without re-execution.

</functional-decomposition>

---

<structural-decomposition>

## Repository Structure

```
chat-app/
├── frontend/                    # Next.js 15 app
│   ├── src/
│   │   ├── app/                 # App router pages
│   │   │   ├── layout.tsx       # Root layout with providers
│   │   │   ├── page.tsx         # Landing/redirect
│   │   │   ├── (auth)/          # Auth pages (login, signup)
│   │   │   ├── chat/            # Chat interface
│   │   │   ├── skills/          # Skills management
│   │   │   └── documents/       # Documents page
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── chat/            # Chat-specific components
│   │   │   ├── skills/          # Skills-specific components
│   │   │   ├── layout/          # Layout components (sidebar, nav)
│   │   │   └── theme/           # Theme provider and toggle
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utility libraries
│   │   │   ├── supabase/        # Supabase client config
│   │   │   ├── api.ts           # API client functions
│   │   │   └── utils.ts         # General utilities
│   │   ├── stores/              # Zustand state stores
│   │   └── types/               # TypeScript type definitions
│   ├── public/                  # Static assets
│   ├── tailwind.config.ts       # Tailwind with theme vars
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings and env vars
│   │   ├── auth/                # Auth middleware
│   │   ├── routers/             # API route handlers
│   │   │   ├── chat.py          # Chat/streaming endpoints
│   │   │   ├── skills.py        # Skills CRUD endpoints
│   │   │   ├── skill_files.py   # Skill file endpoints
│   │   │   └── sandbox.py       # Code execution endpoints
│   │   ├── services/            # Business logic
│   │   │   ├── llm.py           # LLM client (multi-provider)
│   │   │   ├── skills.py        # Skills service
│   │   │   ├── sandbox.py       # Sandbox manager
│   │   │   ├── system_prompt.py # Dynamic prompt builder
│   │   │   └── tool_memory.py   # Tool result persistence
│   │   ├── tools/               # LLM tool definitions
│   │   │   ├── load_skill.py
│   │   │   ├── save_skill.py
│   │   │   ├── read_skill_file.py
│   │   │   └── execute_code.py
│   │   ├── models/              # Pydantic models
│   │   ├── utils/               # Utility modules
│   │   │   └── skill_standard.py # Open standard parser/generator
│   │   └── db/                  # Database utilities
│   ├── tests/                   # pytest test suite
│   ├── Dockerfile               # Backend container
│   ├── requirements.txt
│   └── pyproject.toml
│
├── supabase/                    # Supabase local dev
│   └── migrations/              # SQL migration files
│
├── docker/                      # Docker configs
│   ├── sandbox/                 # Sandbox Docker image
│   │   └── Dockerfile           # Custom Python image with packages
│   └── docker-compose.yml       # Development services
│
├── .env.example
├── CLAUDE.md
└── PRD.md
```

## Module Definitions

### Module: frontend/components/chat
- **Maps to capability**: Chat Interface
- **Responsibility**: All chat UI components
- **Exports**: ThreadSidebar, MessageList, MessageBubble, MessageInput, CodeExecutionPanel

### Module: frontend/components/skills
- **Maps to capability**: Skills Management + Building-Block Files
- **Responsibility**: Skills page UI
- **Exports**: SkillList, SkillEditor, SkillFileManager, FilePreviewPanel

### Module: backend/routers
- **Maps to capability**: Backend API
- **Responsibility**: HTTP route handlers
- **Exports**: chat_router, skills_router, skill_files_router, sandbox_router

### Module: backend/services
- **Maps to capability**: Core business logic
- **Responsibility**: Service layer between routes and database
- **Exports**: LLMService, SkillsService, SandboxManager, SystemPromptBuilder, ToolMemoryService

### Module: backend/tools
- **Maps to capability**: LLM Tool Definitions
- **Responsibility**: Tool schemas and execution handlers
- **Exports**: load_skill, save_skill, read_skill_file, execute_code

</structural-decomposition>

---

<dependency-graph>

## Dependency Chain

### Foundation Layer (Phase 0)
No dependencies — these are built first.

- **Project Scaffolding**: Next.js + FastAPI project setup, tooling, dev environment
- **Database Schema**: Supabase tables, RLS policies, migrations
- **Theme System**: CSS variable-based light/dark theme with next-themes
- **Supabase Client**: Auth + DB + Storage client initialization

### Core Layer (Phase 1)
- **Auth Flow**: Depends on [Supabase Client, Database Schema]
- **Chat Backend (basic)**: Depends on [Database Schema, Supabase Client]
- **LLM Integration**: Depends on [Project Scaffolding]

### Chat Layer (Phase 2)
- **Thread Management UI**: Depends on [Auth Flow, Chat Backend, Theme System]
- **Message Composing**: Depends on [Thread Management UI]
- **Message Streaming**: Depends on [Chat Backend, LLM Integration]
- **Message Display**: Depends on [Message Streaming, Theme System]

### Skills Layer (Phase 3)
- **Skills CRUD API**: Depends on [Database Schema, Auth Flow]
- **Skills UI Page**: Depends on [Skills CRUD API, Theme System]
- **System Prompt Builder**: Depends on [Skills CRUD API, LLM Integration]
- **Skill Discovery & Loading (LLM tools)**: Depends on [System Prompt Builder, Skills CRUD API]

### Skills Files Layer (Phase 4)
- **File Upload & Storage**: Depends on [Skills CRUD API, Supabase Client]
- **File Discovery & Reading (LLM tool)**: Depends on [File Upload & Storage, Skill Discovery & Loading]
- **File Preview UI**: Depends on [File Upload & Storage, Skills UI Page]

### Sandbox Layer (Phase 5)
- **Docker Sandbox Manager**: Depends on [Database Schema]
- **Code Execution API**: Depends on [Docker Sandbox Manager, Chat Backend]
- **Code Execution UI**: Depends on [Code Execution API, Message Display]
- **Sandbox File Downloads**: Depends on [Code Execution API, Supabase Client]

### Portability Layer (Phase 6)
- **Skill Export**: Depends on [Skills CRUD API, File Upload & Storage]
- **Skill Import**: Depends on [Skills CRUD API, File Upload & Storage]

### Memory Layer (Phase 7)
- **Tool Result Persistence**: Depends on [Chat Backend, LLM Integration]
- **History Reconstruction**: Depends on [Tool Result Persistence]

</dependency-graph>

---

<implementation-roadmap>

## Development Phases

### Phase 0: Foundation
**Goal**: Working dev environment with database, auth, and themed UI shell

**Entry Criteria**: Clean repository

**Tasks**:
- [ ] Initialize Next.js 15 with TypeScript, Tailwind CSS v4, shadcn/ui (depends on: none)
  - Acceptance criteria: `npm run dev` serves app on localhost:3000
  - Test strategy: Dev server starts without errors
- [ ] Initialize FastAPI backend with project structure (depends on: none)
  - Acceptance criteria: `uvicorn` serves API on localhost:8000
  - Test strategy: Health check endpoint returns 200
- [ ] Create Supabase database schema with migrations (depends on: none)
  - Acceptance criteria: All tables created with RLS policies
  - Test strategy: Migration runs cleanly, RLS blocks unauthorized access
- [ ] Setup Supabase client (browser + server) with auth helpers (depends on: none)
  - Acceptance criteria: Client can query database and handle auth
  - Test strategy: Integration test authenticates and queries
- [ ] Implement theme system with light/dark/system modes (depends on: Next.js setup)
  - Acceptance criteria: Theme toggle works, preference persists
  - Test strategy: Visual verification of both themes
- [ ] Build app shell layout — sidebar + main content + top nav (depends on: Theme system)
  - Acceptance criteria: Responsive layout with navigation tabs (Chat, Documents, Skills)
  - Test strategy: Layout renders correctly on desktop and mobile

**Exit Criteria**: Developer can run frontend + backend, switch themes, see app shell with navigation

**Delivers**: Development environment and UI skeleton

---

### Phase 1: Authentication
**Goal**: Users can sign up, log in, and access protected routes

**Entry Criteria**: Phase 0 complete

**Tasks**:
- [ ] Implement auth pages (login, signup) with Supabase Auth (depends on: Supabase Client)
  - Acceptance criteria: Email/password auth works, redirects correctly
  - Test strategy: Sign up, log in, log out flow works end-to-end
- [ ] Add auth middleware to FastAPI backend (depends on: Supabase Client)
  - Acceptance criteria: API endpoints reject unauthenticated requests
  - Test strategy: 401 returned without valid token, 200 with valid token
- [ ] Add protected route middleware to Next.js (depends on: Auth pages)
  - Acceptance criteria: Unauthenticated users redirected to login
  - Test strategy: Direct URL access redirects to login when not authenticated

**Exit Criteria**: Authenticated users can access the app, unauthenticated users see login

**Delivers**: Secure access to the application

---

### Phase 2: Chat Interface
**Goal**: Fully functional AI chat with streaming responses and beautiful UI

**Entry Criteria**: Phase 1 complete

**Tasks**:
- [ ] Build chat API endpoint with SSE streaming (depends on: Auth middleware, LLM integration)
  - Acceptance criteria: POST /api/chat streams AI responses via SSE
  - Test strategy: curl/httpie test shows streaming tokens
- [ ] Implement LLM integration service with Anthropic Claude (depends on: Backend setup)
  - Acceptance criteria: Service sends messages to Claude and streams response
  - Test strategy: Unit test with mocked API, integration test with real API
- [ ] Build thread management (create, list, rename, delete) — backend (depends on: Database, Auth)
  - Acceptance criteria: CRUD operations on threads with ownership
  - Test strategy: API tests for all CRUD operations
- [ ] Build thread sidebar UI (depends on: Thread management backend, Theme)
  - Acceptance criteria: Sidebar lists threads, supports create/rename/delete
  - Test strategy: Visual + functional testing in browser
- [ ] Build message input component with auto-resize (depends on: Thread sidebar)
  - Acceptance criteria: Input grows, Enter sends, Shift+Enter newline
  - Test strategy: Keyboard interaction testing
- [ ] Build message display with markdown rendering (depends on: Theme)
  - Acceptance criteria: Messages render markdown, code blocks, copy buttons
  - Test strategy: Render test with various markdown content
- [ ] Integrate streaming — connect frontend to SSE backend (depends on: Chat API, Message display)
  - Acceptance criteria: User sends message, AI response streams in real-time
  - Test strategy: Full end-to-end chat flow works

**Exit Criteria**: User can have streaming AI conversations with thread management

**Delivers**: Core chat experience

---

### Phase 3: Skills Management
**Goal**: Users can create, manage, and use skills to extend AI behavior

**Entry Criteria**: Phase 2 complete

**Tasks**:
- [ ] Build skills CRUD API endpoints (depends on: Database, Auth)
  - Acceptance criteria: POST/GET/PATCH/DELETE /api/skills with validation
  - Test strategy: API tests for all endpoints with valid/invalid data
- [ ] Build skills UI page — two-column layout (depends on: Skills API, Theme)
  - Acceptance criteria: Skill list + editor form, search, new skill dropdown
  - Test strategy: Visual + CRUD flow testing
- [ ] Implement system prompt builder with skill catalog injection (depends on: Skills API, LLM service)
  - Acceptance criteria: System prompt includes enabled skill names/descriptions
  - Test strategy: Verify prompt contains skill catalog table
- [ ] Implement load_skill and save_skill LLM tools (depends on: System prompt builder, Skills API)
  - Acceptance criteria: LLM can load skill instructions and create new skills
  - Test strategy: Conversation test where AI loads a skill
- [ ] Implement skill sharing (toggle global/private) (depends on: Skills API)
  - Acceptance criteria: PATCH /api/skills/{id}/share toggles visibility
  - Test strategy: Shared skill visible to other users
- [ ] Seed skill-creator global skill (depends on: Skills API)
  - Acceptance criteria: Built-in skill-creator skill exists for all users
  - Test strategy: Skill appears in catalog, AI can use it

**Exit Criteria**: Skills appear in system prompt, AI loads them on demand, users manage skills in UI

**Delivers**: Extensible AI behavior system

---

### Phase 4: Skill Building-Block Files
**Goal**: Skills can have attached resource files that the AI reads on demand

**Entry Criteria**: Phase 3 complete

**Tasks**:
- [ ] Build file upload/storage API for skills (depends on: Skills API, Supabase Storage)
  - Acceptance criteria: POST /api/skills/{id}/files uploads and stores file
  - Test strategy: Upload, list, delete file operations
- [ ] Build file management UI in skill editor (depends on: File API, Skills UI)
  - Acceptance criteria: File list with upload button, delete, click-to-preview
  - Test strategy: Upload, preview, delete flow in browser
- [ ] Implement read_skill_file LLM tool (depends on: File API, load_skill tool)
  - Acceptance criteria: LLM can read text file content from a skill
  - Test strategy: Conversation where AI reads a skill file
- [ ] Build file preview side panel (depends on: File management UI)
  - Acceptance criteria: Click file opens slide-in panel with content/download
  - Test strategy: Preview text and binary files

**Exit Criteria**: Skills have file attachments, AI can read them, UI previews them

**Delivers**: Rich skill resources

---

### Phase 5: Code Execution Sandbox
**Goal**: AI can execute Python code in secure Docker containers

**Entry Criteria**: Phase 2 complete (independent of skills)

**Tasks**:
- [ ] Build custom Docker image with pre-installed packages (depends on: none)
  - Acceptance criteria: Image builds with pandas, numpy, matplotlib, etc.
  - Test strategy: Docker build succeeds, packages importable
- [ ] Implement Docker sandbox manager service (depends on: Docker image, Database)
  - Acceptance criteria: Create/manage container sessions with TTL and cleanup
  - Test strategy: Session creation, execution, cleanup lifecycle test
- [ ] Build execute_code LLM tool with SSE streaming (depends on: Sandbox manager, Chat API)
  - Acceptance criteria: Code runs, stdout/stderr stream via SSE events
  - Test strategy: Execute Python code, verify streaming output
- [ ] Build code execution UI panel (depends on: execute_code tool, Message display)
  - Acceptance criteria: Inline panel with code, output, file downloads
  - Test strategy: Visual verification of execution panel
- [ ] Implement sandbox file upload and download (depends on: Sandbox manager, Supabase Storage)
  - Acceptance criteria: Generated files uploaded, signed URLs for download
  - Test strategy: Generate a file via code, download via signed URL

**Exit Criteria**: AI executes code, streams output, serves generated files

**Delivers**: Code execution capability

---

### Phase 6: Skills Open Standard (Import/Export)
**Goal**: Skills are portable via the Agent Skills open standard

**Entry Criteria**: Phase 4 complete

**Tasks**:
- [ ] Build skill export endpoint (depends on: Skills API, File API)
  - Acceptance criteria: GET /api/skills/{id}/export returns ZIP with SKILL.md
  - Test strategy: Export skill, verify ZIP structure and SKILL.md content
- [ ] Build skill import endpoint (depends on: Skills API, File API)
  - Acceptance criteria: POST /api/skills/import creates skills from ZIP
  - Test strategy: Import single and bulk ZIPs, verify created skills
- [ ] Build SKILL.md parser/generator utility (depends on: none)
  - Acceptance criteria: Parse YAML frontmatter + markdown, generate from skill data
  - Test strategy: Round-trip test (export → import → compare)
- [ ] Add import/export UI controls (depends on: Import/Export API, Skills UI)
  - Acceptance criteria: Export button downloads ZIP, import accepts ZIP upload
  - Test strategy: Full import/export flow in browser

**Exit Criteria**: Skills round-trip through ZIP format without data loss

**Delivers**: Skill portability

---

### Phase 7: Persistent Tool Memory
**Goal**: Tool call results survive across conversation turns

**Entry Criteria**: Phase 2 complete

**Tasks**:
- [ ] Implement tool result storage in message JSONB (depends on: Chat backend)
  - Acceptance criteria: Tool results stored with tool_call_id in tool_calls column
  - Test strategy: Execute tool, verify result persisted in database
- [ ] Implement history reconstruction for LLM context (depends on: Tool result storage)
  - Acceptance criteria: Loaded history includes tool_use + tool_result message pairs
  - Test strategy: Multi-turn conversation referencing previous tool results
- [ ] Add result size capping to prevent database bloat (depends on: Tool result storage)
  - Acceptance criteria: Results exceeding size limit are truncated with indicator
  - Test strategy: Large tool result properly capped

**Exit Criteria**: AI references previous tool results without re-executing

**Delivers**: Persistent context across turns

</implementation-roadmap>

---

<test-strategy>

## Test Pyramid

```
        /\
       /E2E\       <- 10% (Browser-based flows)
      /------\
     /Integration\ <- 30% (API + database tests)
    /------------\
   /  Unit Tests  \ <- 60% (Fast, isolated)
  /----------------\
```

## Coverage Requirements
- Line coverage: 80% minimum
- Branch coverage: 70% minimum
- Function coverage: 85% minimum

## Critical Test Scenarios

### Chat Interface
**Happy path**: User sends message, AI response streams, message persists
**Edge cases**: Empty message, very long message, rapid send
**Error cases**: Network failure mid-stream, LLM API error
**Integration**: Full conversation flow with tool calls

### Skills Management
**Happy path**: Create skill, enable it, use in conversation
**Edge cases**: Max length name/description, special characters
**Error cases**: Duplicate name, unauthorized access to global skill
**Integration**: Skill appears in catalog, AI loads and uses it

### Code Execution
**Happy path**: Execute Python code, get output, download file
**Edge cases**: Long-running code (timeout), large output
**Error cases**: Syntax error, security violation, container crash
**Integration**: AI generates code, executes it, returns files

## Test Generation Guidelines
- Use pytest for backend tests
- Use Playwright for E2E tests
- Use React Testing Library for component tests
- Mock external APIs (Supabase, Anthropic) in unit tests
- Use real Supabase (local) for integration tests

</test-strategy>

---

<architecture>

## System Components

```
Browser (Next.js)  ←→  FastAPI Backend  ←→  Supabase (Postgres + Auth + Storage)
                                        ←→  Anthropic Claude API
                                        ←→  Docker Sandbox (Python execution)
```

## Data Models

### threads
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner (FK to auth.users) |
| title | text | Thread title |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last activity |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| thread_id | uuid | FK to threads |
| user_id | uuid | FK to auth.users |
| role | text | user, assistant, system |
| content | text | Message content |
| tool_calls | jsonb | Tool call metadata + results |
| created_at | timestamptz | Creation time |

### skills
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | NULL for global skills |
| name | varchar(64) | Lowercase hyphenated identifier |
| description | varchar(1024) | Short description (min 20 chars) |
| instructions | text | Full markdown instructions |
| enabled | boolean | Whether in discovery catalog |
| license | varchar(64) | Optional license identifier |
| compatibility | varchar(64) | Optional compat descriptor |
| metadata | jsonb | Optional key-value pairs |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Last update |

### skill_files
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| skill_id | uuid | FK to skills |
| user_id | uuid | FK to auth.users |
| filename | text | Original filename |
| file_size | bigint | File size in bytes |
| mime_type | text | MIME type |
| storage_path | text | Path in Supabase Storage |
| created_at | timestamptz | Upload time |

### code_executions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| thread_id | uuid | FK to threads |
| user_id | uuid | FK to auth.users |
| code | text | Executed code |
| stdout | text | Standard output |
| stderr | text | Standard error |
| exit_code | integer | Process exit code |
| status | text | running, completed, failed |
| execution_time_ms | integer | Duration in ms |
| created_at | timestamptz | Execution time |

### sandbox_files
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| execution_id | uuid | FK to code_executions |
| user_id | uuid | FK to auth.users |
| filename | text | Generated filename |
| file_size | bigint | File size in bytes |
| mime_type | text | MIME type |
| storage_path | text | Path in Supabase Storage |
| created_at | timestamptz | Creation time |

## Technology Stack

**Frontend**:
- Next.js 15 (App Router)
- TypeScript 5
- Tailwind CSS v4 with CSS variables
- shadcn/ui component library
- Zustand for state management
- react-markdown + highlight.js for rendering
- next-themes for dark mode

**Backend**:
- Python 3.12 / FastAPI
- Supabase Python client
- Anthropic Python SDK
- llm-sandbox for Docker execution
- SSE via starlette.responses.StreamingResponse

**Infrastructure**:
- Supabase (Postgres, Auth, Storage)
- Docker (sandbox containers)

**Decision: Next.js + FastAPI split**
- **Rationale**: Next.js for excellent React DX and routing. FastAPI for Python ecosystem (LLM SDKs, Docker SDK, data processing). Separation allows independent scaling.
- **Trade-offs**: Two processes to run, CORS configuration needed
- **Alternatives considered**: Full Next.js (limited Python ecosystem), Full Python (worse React DX)

**Decision: shadcn/ui**
- **Rationale**: Accessible, customizable, copy-paste components. Works perfectly with Tailwind CSS variables for theming.
- **Trade-offs**: Manual component management vs package updates
- **Alternatives considered**: Radix UI directly (more work), Material UI (harder to customize)

</architecture>

---

<risks>

## Technical Risks

**Risk**: Docker sandbox security escape
- **Impact**: High
- **Likelihood**: Low
- **Mitigation**: Strict security policy, no network access, filesystem restrictions, resource limits
- **Fallback**: Disable sandbox feature, use external code execution API

**Risk**: SSE streaming reliability
- **Impact**: Medium
- **Likelihood**: Medium
- **Mitigation**: Reconnection logic, heartbeat events, timeout handling
- **Fallback**: Polling-based fallback for streaming

## Dependency Risks

**Risk**: Supabase local dev Docker conflicts with sandbox Docker
- **Impact**: Medium
- **Likelihood**: Low
- **Mitigation**: Separate Docker networks, explicit port mapping

## Scope Risks

**Risk**: Skill system complexity creep
- **Impact**: Medium
- **Likelihood**: Medium
- **Mitigation**: Strict MVP scope per phase, defer advanced features
- **Fallback**: Ship skills without import/export initially

</risks>
