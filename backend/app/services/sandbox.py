import asyncio
import os
import subprocess
import tempfile
import time
from typing import Optional

from app.config import settings
from app.db.supabase import get_supabase_client


class SandboxSession:
    """Represents an active sandbox session."""

    def __init__(self, thread_id: str, user_id: str):
        self.thread_id = thread_id
        self.user_id = user_id
        self.created_at = time.time()
        self.last_used = time.time()
        self.variables: dict = {}

    @property
    def is_expired(self) -> bool:
        ttl = 30 * 60  # 30 minutes
        return time.time() - self.last_used > ttl


class SandboxManager:
    """Manages sandbox sessions for code execution."""

    def __init__(self):
        self.sessions: dict[str, SandboxSession] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the cleanup background task."""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self):
        """Stop the cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    async def _cleanup_loop(self):
        """Periodically clean up expired sessions."""
        while True:
            await asyncio.sleep(60)
            expired = [k for k, v in self.sessions.items() if v.is_expired]
            for k in expired:
                del self.sessions[k]

    def get_or_create_session(self, thread_id: str, user_id: str) -> SandboxSession:
        if thread_id not in self.sessions:
            self.sessions[thread_id] = SandboxSession(thread_id, user_id)
        session = self.sessions[thread_id]
        session.last_used = time.time()
        return session

    async def execute_code(
        self,
        thread_id: str,
        user_id: str,
        code: str,
        libraries: list[str] | None = None,
    ) -> dict:
        """Execute Python code. Returns dict with stdout, stderr, exit_code, execution_time_ms, files."""
        session = self.get_or_create_session(thread_id, user_id)
        supabase = get_supabase_client()

        # Record execution start
        execution = (
            supabase.table("code_executions")
            .insert(
                {
                    "thread_id": thread_id,
                    "user_id": user_id,
                    "code": code,
                    "status": "running",
                }
            )
            .execute()
        )
        execution_id = execution.data[0]["id"]

        start_time = time.time()

        try:
            # Install libraries if requested
            if libraries:
                for lib in libraries:
                    # Sanitize: only allow alphanumeric, hyphens, underscores, dots, brackets
                    safe_lib = lib.strip()
                    if safe_lib and all(
                        c.isalnum() or c in "-_.[]<>=!,; " for c in safe_lib
                    ):
                        subprocess.run(
                            ["pip", "install", safe_lib],
                            capture_output=True,
                            timeout=30,
                        )

            # Write code to temp file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".py", delete=False
            ) as f:
                f.write(code)
                temp_path = f.name

            try:
                result = subprocess.run(
                    ["python3", temp_path],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    cwd=tempfile.gettempdir(),
                )

                execution_time = int((time.time() - start_time) * 1000)

                # Update execution record
                supabase.table("code_executions").update(
                    {
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "exit_code": result.returncode,
                        "status": "completed" if result.returncode == 0 else "failed",
                        "execution_time_ms": execution_time,
                    }
                ).eq("id", execution_id).execute()

                return {
                    "execution_id": execution_id,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "execution_time_ms": execution_time,
                    "status": "completed" if result.returncode == 0 else "failed",
                    "files": [],
                }
            finally:
                os.unlink(temp_path)

        except subprocess.TimeoutExpired:
            execution_time = int((time.time() - start_time) * 1000)
            supabase.table("code_executions").update(
                {
                    "stderr": "Execution timed out (60s limit)",
                    "exit_code": -1,
                    "status": "failed",
                    "execution_time_ms": execution_time,
                }
            ).eq("id", execution_id).execute()

            return {
                "execution_id": execution_id,
                "stdout": "",
                "stderr": "Execution timed out (60s limit)",
                "exit_code": -1,
                "execution_time_ms": execution_time,
                "status": "failed",
                "files": [],
            }
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            supabase.table("code_executions").update(
                {
                    "stderr": str(e),
                    "exit_code": -1,
                    "status": "failed",
                    "execution_time_ms": execution_time,
                }
            ).eq("id", execution_id).execute()

            return {
                "execution_id": execution_id,
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "execution_time_ms": execution_time,
                "status": "failed",
                "files": [],
            }


# Global singleton
sandbox_manager = SandboxManager()
