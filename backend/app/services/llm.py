import anthropic
from app.config import settings


class LLMService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def stream_chat(self, messages: list[dict], system_prompt: str = ""):
        """Stream a chat response from Claude.

        Yields text chunks as they arrive from the API.
        """
        with self.client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text
