import anthropic
from app.config import settings
from app.services.tool_memory import reconstruct_tool_messages


class LLMService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def _prepare_messages(self, messages: list[dict]) -> list[dict]:
        """Prepare messages for the LLM, reconstructing tool call history."""
        return reconstruct_tool_messages(messages)

    def stream_chat(self, messages: list[dict], system_prompt: str = ""):
        """Stream a chat response from Claude.

        Yields text chunks as they arrive from the API.
        Messages with tool_calls are automatically reconstructed into the
        proper assistant + tool_result format that Claude expects.
        """
        prepared = self._prepare_messages(messages)

        with self.client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=prepared,
        ) as stream:
            for text in stream.text_stream:
                yield text
