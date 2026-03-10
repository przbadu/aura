import mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter(tags=["skill-files"])

BUCKET_NAME = "skill-files"
TEXT_MIME_PREFIXES = ("text/", "application/json", "application/xml", "application/javascript")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _verify_skill_access(supabase, skill_id: str, user_id: str):
    """Verify the user owns the skill or it is global."""
    result = (
        supabase.table("skills")
        .select("id, user_id")
        .eq("id", skill_id)
        .or_(f"user_id.eq.{user_id},user_id.is.null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found")
    return result.data[0]


def _verify_skill_ownership(supabase, skill_id: str, user_id: str):
    """Verify the user owns the skill (not global)."""
    result = (
        supabase.table("skills")
        .select("id")
        .eq("id", skill_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found or not owned by you")
    return result.data[0]


def _storage_path(user_id: str, skill_id: str, filename: str) -> str:
    return f"{user_id}/{skill_id}/{filename}"


def _is_text_file(mime_type: str | None) -> bool:
    if not mime_type:
        return False
    return any(mime_type.startswith(p) for p in TEXT_MIME_PREFIXES)


@router.post("/skills/{skill_id}/files", status_code=status.HTTP_201_CREATED)
async def upload_skill_file(
    skill_id: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Upload a file to a skill. Stores in Supabase Storage and records metadata."""
    supabase = get_supabase_client()
    _verify_skill_ownership(supabase, skill_id, user.id)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    filename = file.filename or "untitled"
    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    storage_path = _storage_path(user.id, skill_id, filename)

    # Upload to Supabase Storage
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": mime_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # Check if a record already exists for this skill + filename
    existing = (
        supabase.table("skill_files")
        .select("id")
        .eq("skill_id", skill_id)
        .eq("filename", filename)
        .execute()
    )

    file_data = {
        "skill_id": skill_id,
        "filename": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "mime_type": mime_type,
    }

    if existing.data:
        result = (
            supabase.table("skill_files")
            .update(file_data)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = supabase.table("skill_files").insert(file_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save file metadata")

    return result.data[0]


@router.get("/skills/{skill_id}/files")
async def list_skill_files(skill_id: str, user=Depends(get_current_user)):
    """List all files attached to a skill."""
    supabase = get_supabase_client()
    _verify_skill_access(supabase, skill_id, user.id)

    result = (
        supabase.table("skill_files")
        .select("*")
        .eq("skill_id", skill_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


@router.delete(
    "/skills/{skill_id}/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_skill_file(skill_id: str, file_id: str, user=Depends(get_current_user)):
    """Delete a file from a skill."""
    supabase = get_supabase_client()
    _verify_skill_ownership(supabase, skill_id, user.id)

    # Fetch file record
    file_record = (
        supabase.table("skill_files")
        .select("*")
        .eq("id", file_id)
        .eq("skill_id", skill_id)
        .execute()
    )
    if not file_record.data:
        raise HTTPException(status_code=404, detail="File not found")

    storage_path = file_record.data[0]["storage_path"]

    # Remove from storage
    try:
        supabase.storage.from_(BUCKET_NAME).remove([storage_path])
    except Exception:
        pass  # Storage file may already be gone

    # Remove metadata row
    supabase.table("skill_files").delete().eq("id", file_id).execute()


@router.get("/skills/{skill_id}/files/{file_id}/content")
async def get_skill_file_content(
    skill_id: str, file_id: str, user=Depends(get_current_user)
):
    """Get file content (inline for text) or a signed download URL (for binary)."""
    supabase = get_supabase_client()
    _verify_skill_access(supabase, skill_id, user.id)

    file_record = (
        supabase.table("skill_files")
        .select("*")
        .eq("id", file_id)
        .eq("skill_id", skill_id)
        .execute()
    )
    if not file_record.data:
        raise HTTPException(status_code=404, detail="File not found")

    meta = file_record.data[0]
    storage_path = meta["storage_path"]
    mime_type = meta.get("mime_type", "application/octet-stream")

    if _is_text_file(mime_type):
        # Return text content inline
        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_path)
            text_content = data.decode("utf-8", errors="replace")
            return {
                "type": "text",
                "filename": meta["filename"],
                "mime_type": mime_type,
                "content": text_content,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")
    else:
        # Return signed URL for binary files
        try:
            signed = supabase.storage.from_(BUCKET_NAME).create_signed_url(
                storage_path, expires_in=3600
            )
            return {
                "type": "binary",
                "filename": meta["filename"],
                "mime_type": mime_type,
                "download_url": signed.get("signedURL") or signed.get("signedUrl", ""),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create download URL: {e}")
