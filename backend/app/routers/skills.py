from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.db.supabase import get_supabase_client
from app.models.skills import SkillCreate, SkillUpdate, SkillResponse, SkillShareToggle

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
