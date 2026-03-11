from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter(tags=["sandbox"])

BUCKET_NAME = "sandbox-files"


def _get_client(user):
    return get_supabase_client(getattr(user, "access_token", None))


@router.get("/sandbox/executions/{execution_id}/files")
async def list_execution_files(execution_id: str, user=Depends(get_current_user)):
    """List files produced by a code execution."""
    supabase = _get_client(user)

    # Verify the execution belongs to this user
    execution = (
        supabase.table("code_executions")
        .select("id, user_id")
        .eq("id", execution_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not execution.data:
        raise HTTPException(status_code=404, detail="Execution not found")

    # Query files associated with this execution
    files = (
        supabase.table("execution_files")
        .select("*")
        .eq("execution_id", execution_id)
        .execute()
    )
    return files.data


@router.get("/sandbox/files/{file_id}/download")
async def download_execution_file(file_id: str, user=Depends(get_current_user)):
    """Get a signed download URL for a file produced by code execution."""
    supabase = _get_client(user)

    # Fetch file record and verify ownership via execution
    file_record = (
        supabase.table("execution_files")
        .select("*, code_executions!inner(user_id)")
        .eq("id", file_id)
        .execute()
    )
    if not file_record.data:
        raise HTTPException(status_code=404, detail="File not found")

    record = file_record.data[0]
    exec_data = record.get("code_executions", {})
    if exec_data.get("user_id") != user.id:
        raise HTTPException(status_code=404, detail="File not found")

    storage_path = record["storage_path"]

    try:
        signed = supabase.storage.from_(BUCKET_NAME).create_signed_url(
            storage_path, expires_in=3600
        )
        url = signed.get("signedURL") or signed.get("signedUrl", "")
        return {
            "filename": record["filename"],
            "mime_type": record.get("mime_type", "application/octet-stream"),
            "download_url": url,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create download URL: {e}")
