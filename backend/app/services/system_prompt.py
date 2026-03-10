from app.db.supabase import get_supabase_client


class SystemPromptBuilder:
    def __init__(self, user_id: str):
        self.user_id = user_id

    def build(self) -> str:
        """Build the complete system prompt with skill catalog."""
        base = self._base_instructions()
        catalog = self._skill_catalog()
        return f"{base}\n\n{catalog}" if catalog else base

    def _base_instructions(self) -> str:
        return (
            "You are a helpful AI assistant with access to specialized skills. "
            "When a user's request matches one of your available skills, use the "
            "load_skill tool to fetch its full instructions before responding.\n"
            "Only load a skill when there's a clear match with the user's intent. "
            "Do not speculatively load skills."
        )

    def _skill_catalog(self) -> str:
        supabase = get_supabase_client()
        # Get enabled skills visible to user (own + global)
        result = (
            supabase.table("skills")
            .select("name, description")
            .eq("enabled", True)
            .or_(f"user_id.eq.{self.user_id},user_id.is.null")
            .execute()
        )

        if not result.data:
            return ""

        lines = [
            "## Available Skills",
            "| Skill | Description |",
            "|-------|-------------|",
        ]
        for skill in result.data:
            lines.append(f"| {skill['name']} | {skill['description']} |")

        return "\n".join(lines)
