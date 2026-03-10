from app.db.supabase import get_supabase_client

BUCKET_NAME = "skill-files"
TEXT_MIME_PREFIXES = ("text/", "application/json", "application/xml", "application/javascript")


def read_skill_file_definition():
    """Tool definition for LLM to read skill file content."""
    return {
        "name": "read_skill_file",
        "description": (
            "Read the content of a file attached to a skill. "
            "Use this after load_skill shows attached files. "
            "Returns file content for text files, or a download URL for binary files."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "skill_name": {
                    "type": "string",
                    "description": "The name of the skill the file belongs to",
                },
                "filename": {
                    "type": "string",
                    "description": "The filename to read",
                },
            },
            "required": ["skill_name", "filename"],
        },
    }


def execute_read_skill_file(skill_name: str, filename: str, user_id: str) -> str:
    """Read a skill file's content and return it as a string."""
    supabase = get_supabase_client()

    # Find the skill
    skill_result = (
        supabase.table("skills")
        .select("id")
        .eq("name", skill_name)
        .eq("enabled", True)
        .or_(f"user_id.eq.{user_id},user_id.is.null")
        .execute()
    )
    if not skill_result.data:
        return f"Skill '{skill_name}' not found or not accessible."

    skill_id = skill_result.data[0]["id"]

    # Find the file
    file_result = (
        supabase.table("skill_files")
        .select("*")
        .eq("skill_id", skill_id)
        .eq("filename", filename)
        .execute()
    )
    if not file_result.data:
        return f"File '{filename}' not found in skill '{skill_name}'."

    meta = file_result.data[0]
    storage_path = meta["storage_path"]
    mime_type = meta.get("mime_type", "application/octet-stream")

    is_text = any(mime_type.startswith(p) for p in TEXT_MIME_PREFIXES)

    if is_text:
        try:
            data = supabase.storage.from_(BUCKET_NAME).download(storage_path)
            return f"# File: {filename}\n\n```\n{data.decode('utf-8', errors='replace')}\n```"
        except Exception as e:
            return f"Failed to read file '{filename}': {e}"
    else:
        try:
            signed = supabase.storage.from_(BUCKET_NAME).create_signed_url(
                storage_path, expires_in=3600
            )
            url = signed.get("signedURL") or signed.get("signedUrl", "")
            return (
                f"File '{filename}' is a binary file ({mime_type}).\n"
                f"Download URL (valid for 1 hour): {url}"
            )
        except Exception as e:
            return f"Failed to generate download URL for '{filename}': {e}"
