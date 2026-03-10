from app.db.supabase import get_supabase_client


def save_skill_definition():
    """Tool definition for LLM."""
    return {
        "name": "save_skill",
        "description": "Save a new skill after helping the user create one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Lowercase hyphenated name",
                },
                "description": {
                    "type": "string",
                    "description": "1-2 sentence description (min 20 chars)",
                },
                "instructions": {
                    "type": "string",
                    "description": "Full markdown instructions",
                },
            },
            "required": ["name", "description", "instructions"],
        },
    }


def execute_save_skill(
    name: str, description: str, instructions: str, user_id: str
) -> str:
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("skills")
            .insert(
                {
                    "user_id": user_id,
                    "name": name,
                    "description": description,
                    "instructions": instructions,
                    "enabled": True,
                }
            )
            .execute()
        )
        return f"Skill '{name}' saved successfully! ID: {result.data[0]['id']}"
    except Exception as e:
        return f"Failed to save skill: {str(e)}"
