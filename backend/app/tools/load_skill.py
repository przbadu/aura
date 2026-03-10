from app.db.supabase import get_supabase_client


def load_skill_definition():
    """Tool definition for LLM."""
    return {
        "name": "load_skill",
        "description": "Load the full instructions for a skill when the user's request matches it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "skill_name": {
                    "type": "string",
                    "description": "The name of the skill to load",
                }
            },
            "required": ["skill_name"],
        },
    }


def execute_load_skill(skill_name: str, user_id: str) -> str:
    supabase = get_supabase_client()
    result = (
        supabase.table("skills")
        .select("*")
        .eq("name", skill_name)
        .eq("enabled", True)
        .or_(f"user_id.eq.{user_id},user_id.is.null")
        .single()
        .execute()
    )

    if not result.data:
        return f"Skill '{skill_name}' not found or not accessible."

    skill = result.data
    response = f"# Skill: {skill['name']}\n\n{skill['instructions']}"

    # Check for attached files
    files = (
        supabase.table("skill_files")
        .select("filename, file_size, mime_type")
        .eq("skill_id", skill["id"])
        .execute()
    )
    if files.data:
        response += (
            "\n\n## Attached Files\n"
            "| Filename | Size | Type |\n"
            "|----------|------|------|\n"
        )
        for f in files.data:
            size_kb = round(f["file_size"] / 1024, 1)
            response += f"| {f['filename']} | {size_kb}KB | {f['mime_type']} |\n"
        response += "\nUse read_skill_file to read file contents."

    return response
