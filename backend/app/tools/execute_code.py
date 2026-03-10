from app.services.sandbox import sandbox_manager


def execute_code_definition():
    """Tool definition for LLM."""
    return {
        "name": "execute_code",
        "description": (
            "Execute Python code in a sandboxed environment. "
            "Use this for data processing, file generation, calculations, "
            "or any task requiring code execution."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute",
                },
                "libraries": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Additional pip packages to install before execution",
                },
            },
            "required": ["code"],
        },
    }


async def execute_code_tool(
    code: str,
    thread_id: str,
    user_id: str,
    libraries: list[str] | None = None,
) -> str:
    """Execute code and return formatted output string."""
    result = await sandbox_manager.execute_code(thread_id, user_id, code, libraries)

    output_parts = []
    if result["stdout"]:
        output_parts.append(f"STDOUT:\n{result['stdout']}")
    if result["stderr"]:
        output_parts.append(f"STDERR:\n{result['stderr']}")
    output_parts.append(f"Exit code: {result['exit_code']}")
    output_parts.append(f"Execution time: {result['execution_time_ms']}ms")

    return "\n\n".join(output_parts)
