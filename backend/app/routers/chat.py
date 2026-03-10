import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client
from app.models.chat import ChatRequest
from app.services.llm import LLMService

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(request: Request, body: ChatRequest, user=Depends(get_current_user)):
    """Stream an AI chat response via Server-Sent Events.

    Creates a new thread if thread_id is not provided.
    Saves user and assistant messages to the database.
    """
    supabase = get_supabase_client()
    thread_id = body.thread_id

    # Create thread if needed
    if not thread_id:
        # Use first ~50 chars of user message as default title
        default_title = body.message[:50].strip()
        if len(body.message) > 50:
            default_title += "..."
        thread_result = (
            supabase.table("threads")
            .insert({"user_id": user.id, "title": default_title})
            .execute()
        )
        if not thread_result.data:
            raise HTTPException(status_code=500, detail="Failed to create thread")
        thread_id = thread_result.data[0]["id"]
    else:
        # Verify thread ownership
        existing = (
            supabase.table("threads")
            .select("id")
            .eq("id", thread_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Thread not found")

    # Save user message
    supabase.table("messages").insert(
        {"thread_id": thread_id, "role": "user", "content": body.message}
    ).execute()

    # Update thread's updated_at timestamp
    supabase.table("threads").update(
        {"updated_at": "now()"}
    ).eq("id", thread_id).execute()

    # Load conversation history
    history_result = (
        supabase.table("messages")
        .select("role, content")
        .eq("thread_id", thread_id)
        .order("created_at", desc=False)
        .execute()
    )
    messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in history_result.data
    ]

    llm_service = LLMService()

    async def event_generator():
        """Generate SSE events from the LLM stream."""
        full_response = ""

        # Send message_start with thread_id
        yield {
            "event": "message_start",
            "data": json.dumps({"thread_id": thread_id}),
        }

        try:
            for text_chunk in llm_service.stream_chat(messages):
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                full_response += text_chunk
                yield {
                    "event": "text_delta",
                    "data": json.dumps({"content": text_chunk}),
                }

            # Save the complete assistant message
            supabase.table("messages").insert(
                {
                    "thread_id": thread_id,
                    "role": "assistant",
                    "content": full_response,
                }
            ).execute()

            # Update thread's updated_at timestamp
            supabase.table("threads").update(
                {"updated_at": "now()"}
            ).eq("id", thread_id).execute()

            yield {
                "event": "message_end",
                "data": json.dumps({"thread_id": thread_id}),
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())
