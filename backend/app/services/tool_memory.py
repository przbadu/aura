"""Persistent tool memory: save and reconstruct tool call results."""

MAX_RESULT_SIZE = 50000  # 50KB cap per tool result


def save_tool_result(
    supabase,
    message_id: str,
    tool_call_id: str,
    tool_name: str,
    arguments: dict,
    result: str,
):
    """Save tool call result to message's tool_calls JSONB."""
    if len(result) > MAX_RESULT_SIZE:
        result = result[:MAX_RESULT_SIZE] + "\n\n[Result truncated - exceeded size limit]"

    msg = (
        supabase.table("messages")
        .select("tool_calls")
        .eq("id", message_id)
        .single()
        .execute()
    )
    tool_calls = msg.data.get("tool_calls") or []

    tool_calls.append(
        {
            "tool_call_id": tool_call_id,
            "name": tool_name,
            "arguments": arguments,
            "result": result,
        }
    )

    supabase.table("messages").update({"tool_calls": tool_calls}).eq(
        "id", message_id
    ).execute()


def reconstruct_tool_messages(messages: list[dict]) -> list[dict]:
    """Reconstruct conversation history with tool messages for LLM context.

    When messages contain tool_calls data, this function expands them into
    the proper assistant + tool_result message format that Claude expects.
    """
    reconstructed = []

    for msg in messages:
        if msg["role"] == "assistant" and msg.get("tool_calls"):
            # Build assistant message with tool_use content blocks
            content_blocks: list[dict] = []
            if msg.get("content"):
                content_blocks.append({"type": "text", "text": msg["content"]})

            for tc in msg["tool_calls"]:
                tc_id = tc.get("tool_call_id", f"toolu_{tc['name']}")
                content_blocks.append(
                    {
                        "type": "tool_use",
                        "id": tc_id,
                        "name": tc["name"],
                        "input": tc.get("arguments", {}),
                    }
                )

            reconstructed.append({"role": "assistant", "content": content_blocks})

            # Add corresponding tool result messages
            for tc in msg["tool_calls"]:
                if "result" in tc:
                    tc_id = tc.get("tool_call_id", f"toolu_{tc['name']}")
                    reconstructed.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tc_id,
                                    "content": tc["result"],
                                }
                            ],
                        }
                    )
        else:
            reconstructed.append(
                {
                    "role": msg["role"],
                    "content": msg.get("content", ""),
                }
            )

    return reconstructed
