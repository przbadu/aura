"""Utility for SKILL.md parsing and generation (import/export standard)."""

import re

import yaml


def parse_skill_md(content: str) -> dict:
    """Parse SKILL.md with YAML frontmatter + markdown body."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", content, re.DOTALL)
    if not match:
        raise ValueError("Invalid SKILL.md format: missing YAML frontmatter")

    frontmatter = yaml.safe_load(match.group(1))
    instructions = match.group(2).strip()

    return {
        "name": frontmatter.get("name", ""),
        "description": frontmatter.get("description", ""),
        "license": frontmatter.get("license"),
        "compatibility": frontmatter.get("compatibility"),
        "metadata": frontmatter.get("metadata", {}),
        "instructions": instructions,
    }


def generate_skill_md(skill: dict) -> str:
    """Generate SKILL.md content from skill data."""
    frontmatter: dict = {
        "name": skill["name"],
        "description": skill["description"],
    }
    if skill.get("license"):
        frontmatter["license"] = skill["license"]
    if skill.get("compatibility"):
        frontmatter["compatibility"] = skill["compatibility"]
    if skill.get("metadata"):
        frontmatter["metadata"] = skill["metadata"]

    yaml_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
    return f"---\n{yaml_str}---\n\n{skill.get('instructions', '')}\n"


def categorize_file(filename: str, mime_type: str) -> str:
    """Categorize file into scripts/references/assets subdirectory."""
    code_extensions = {".py", ".js", ".ts", ".sh", ".rb", ".go", ".rs", ".java"}
    text_extensions = {
        ".md",
        ".txt",
        ".pdf",
        ".doc",
        ".docx",
        ".csv",
        ".json",
        ".yaml",
        ".yml",
        ".xml",
        ".html",
    }

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in code_extensions or mime_type.startswith("text/x-"):
        return "scripts"
    elif ext in text_extensions or mime_type.startswith("text/"):
        return "references"
    else:
        return "assets"
