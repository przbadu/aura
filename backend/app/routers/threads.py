from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client
from app.models.chat import ThreadCreate, ThreadUpdate, ThreadResponse, MessageResponse

router = APIRouter(tags=["threads"])


def _get_client(user):
    """Get an authenticated Supabase client for the current user."""
    return get_supabase_client(getattr(user, "access_token", None))


@router.post("/threads", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(body: ThreadCreate, user=Depends(get_current_user)):
    """Create a new chat thread."""
    supabase = _get_client(user)
    data = {"user_id": user.id}
    if body.title:
        data["title"] = body.title

    result = supabase.table("threads").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create thread")
    return result.data[0]


@router.get("/threads", response_model=list[ThreadResponse])
async def list_threads(user=Depends(get_current_user)):
    """List all threads for the current user, ordered by most recently updated."""
    supabase = _get_client(user)
    result = (
        supabase.table("threads")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(thread_id: str, user=Depends(get_current_user)):
    """Get a specific thread by ID."""
    supabase = _get_client(user)
    result = (
        supabase.table("threads")
        .select("*")
        .eq("id", thread_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Thread not found")
    return result.data[0]


@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: str, body: ThreadUpdate, user=Depends(get_current_user)
):
    """Update a thread's title."""
    supabase = _get_client(user)
    existing = (
        supabase.table("threads")
        .select("id")
        .eq("id", thread_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    result = (
        supabase.table("threads")
        .update({"title": body.title})
        .eq("id", thread_id)
        .execute()
    )
    return result.data[0]


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(thread_id: str, user=Depends(get_current_user)):
    """Delete a thread and its messages."""
    supabase = _get_client(user)
    existing = (
        supabase.table("threads")
        .select("id")
        .eq("id", thread_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    supabase.table("messages").delete().eq("thread_id", thread_id).eq("user_id", user.id).execute()
    supabase.table("threads").delete().eq("id", thread_id).eq("user_id", user.id).execute()


@router.get("/threads/{thread_id}/messages", response_model=list[MessageResponse])
async def get_thread_messages(thread_id: str, user=Depends(get_current_user)):
    """Get all messages for a thread, ordered by creation time."""
    supabase = _get_client(user)
    existing = (
        supabase.table("threads")
        .select("id")
        .eq("id", thread_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Thread not found")

    result = (
        supabase.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data
