import io
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client
from app.models.skills import SkillCreate, SkillUpdate, SkillResponse, SkillShareToggle
from app.utils.skill_standard import categorize_file, generate_skill_md, parse_skill_md

router = APIRouter(tags=["skills"])


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(body: SkillCreate, user=Depends(get_current_user)):
    """Create a new skill for the current user."""
    supabase = get_supabase_client()
    data = {
        "user_id": user.id,
        "name": body.name,
        "description": body.description,
        "instructions": body.instructions,
        "enabled": body.enabled,
        "license": body.license,
        "compatibility": body.compatibility,
        "metadata": body.metadata,
    }
    result = supabase.table("skills").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create skill")
    return result.data[0]


@router.get("/skills", response_model=list[SkillResponse])
async def list_skills(user=Depends(get_current_user)):
    """List skills visible to the current user (own + global where user_id IS NULL)."""
    supabase = get_supabase_client()
    result = (
        supabase.table("skills")
        .select("*")
        .or_(f"user_id.eq.{user.id},user_id.is.null")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/skills/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str, user=Depends(get_current_user)):
    """Get a single skill by ID (must be own or global)."""
    supabase = get_supabase_client()
    result = (
        supabase.table("skills")
        .select("*")
        .eq("id", skill_id)
        .or_(f"user_id.eq.{user.id},user_id.is.null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found")
    return result.data[0]


@router.patch("/skills/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str, body: SkillUpdate, user=Depends(get_current_user)
):
    """Update a skill (own only)."""
    supabase = get_supabase_client()
    # Verify ownership
    existing = (
        supabase.table("skills")
        .select("id")
        .eq("id", skill_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Skill not found")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("skills")
        .update(update_data)
        .eq("id", skill_id)
        .execute()
    )
    return result.data[0]


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str, user=Depends(get_current_user)):
    """Delete a skill (own only)."""
    supabase = get_supabase_client()
    # Verify ownership
    existing = (
        supabase.table("skills")
        .select("id")
        .eq("id", skill_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Delete associated skill files first, then the skill
    supabase.table("skill_files").delete().eq("skill_id", skill_id).execute()
    supabase.table("skills").delete().eq("id", skill_id).execute()


@router.patch("/skills/{skill_id}/share", response_model=SkillResponse)
async def toggle_share_skill(
    skill_id: str, body: SkillShareToggle, user=Depends(get_current_user)
):
    """Toggle a skill between global (user_id=NULL) and private (user_id=current user)."""
    supabase = get_supabase_client()
    # Fetch skill - must be owned by user or already global
    result = (
        supabase.table("skills")
        .select("*")
        .eq("id", skill_id)
        .or_(f"user_id.eq.{user.id},user_id.is.null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found")

    skill = result.data[0]
    # Toggle: if currently owned by user, make global; if global, claim ownership
    if skill["user_id"] is None:
        new_user_id = user.id
    else:
        new_user_id = None

    updated = (
        supabase.table("skills")
        .update({"user_id": new_user_id})
        .eq("id", skill_id)
        .execute()
    )
    return updated.data[0]


@router.get("/skills/{skill_id}/export")
async def export_skill(skill_id: str, user=Depends(get_current_user)):
    """Export a skill as a ZIP archive containing SKILL.md and associated files."""
    supabase = get_supabase_client()

    # Fetch skill
    result = (
        supabase.table("skills")
        .select("*")
        .eq("id", skill_id)
        .or_(f"user_id.eq.{user.id},user_id.is.null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Skill not found")

    skill = result.data[0]

    # Fetch associated files
    files_result = (
        supabase.table("skill_files")
        .select("*")
        .eq("skill_id", skill_id)
        .execute()
    )
    skill_files = files_result.data or []

    # Build ZIP in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add SKILL.md
        skill_md = generate_skill_md(skill)
        zf.writestr("SKILL.md", skill_md)

        # Add associated files categorized into subdirectories
        for sf in skill_files:
            filename = sf.get("filename", "unknown")
            mime_type = sf.get("mime_type", "application/octet-stream")
            category = categorize_file(filename, mime_type)
            content = sf.get("content", "")
            if isinstance(content, str):
                zf.writestr(f"{category}/{filename}", content)
            else:
                zf.writestr(f"{category}/{filename}", str(content))

    buf.seek(0)
    safe_name = skill["name"].replace(" ", "_").lower()

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}.skill.zip"'
        },
    )


@router.post("/skills/import", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def import_skill(file: UploadFile, user=Depends(get_current_user)):
    """Import a skill from a ZIP archive containing SKILL.md."""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a .zip archive")

    content = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    # Find and parse SKILL.md
    if "SKILL.md" not in zf.namelist():
        raise HTTPException(
            status_code=400, detail="ZIP must contain a SKILL.md file"
        )

    skill_md_content = zf.read("SKILL.md").decode("utf-8")
    try:
        parsed = parse_skill_md(skill_md_content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create skill in database
    supabase = get_supabase_client()
    data = {
        "user_id": user.id,
        "name": parsed["name"],
        "description": parsed["description"],
        "instructions": parsed["instructions"],
        "enabled": True,
        "license": parsed.get("license"),
        "compatibility": parsed.get("compatibility"),
        "metadata": parsed.get("metadata", {}),
    }
    result = supabase.table("skills").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to import skill")

    skill = result.data[0]

    # Import associated files (everything except SKILL.md)
    for name in zf.namelist():
        if name == "SKILL.md" or name.endswith("/"):
            continue
        file_content = zf.read(name).decode("utf-8", errors="replace")
        filename = name.rsplit("/", 1)[-1] if "/" in name else name
        supabase.table("skill_files").insert(
            {
                "skill_id": skill["id"],
                "filename": filename,
                "content": file_content,
                "mime_type": "application/octet-stream",
            }
        ).execute()

    zf.close()
    return skill
