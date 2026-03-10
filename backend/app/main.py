from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import threads, chat, skills, skill_files, sandbox
from app.services.sandbox import sandbox_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.sandbox_enabled:
        await sandbox_manager.start()
    yield
    # Shutdown
    if settings.sandbox_enabled:
        await sandbox_manager.stop()


app = FastAPI(
    title="Chat App API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(threads.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(skill_files.router, prefix="/api")
app.include_router(sandbox.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}
