from app.config import settings
from app.services.tool_memory import reconstruct_tool_messages


class LLMService:
    def __init__(self):
        if settings.llm_provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(
                api_key=settings.anthropic_api_key or settings.llm_api_key
            )
        else:
            from openai import OpenAI
            self.client = OpenAI(
                base_url=settings.llm_base_url,
                api_key=settings.llm_api_key,
            )

    def _prepare_messages(self, messages: list[dict]) -> list[dict]:
        """Prepare messages for the LLM, reconstructing tool call history."""
        return reconstruct_tool_messages(messages)

    def stream_chat(self, messages: list[dict], system_prompt: str = ""):
        """Stream a chat response.

        Yields text chunks as they arrive from the API.
        Supports both Anthropic and OpenAI-compatible providers.
        """
        prepared = self._prepare_messages(messages)

        if settings.llm_provider == "anthropic":
            yield from self._stream_anthropic(prepared, system_prompt)
        else:
            yield from self._stream_openai(prepared, system_prompt)

    def _stream_anthropic(self, messages: list[dict], system_prompt: str):
        """Stream via Anthropic API."""
        with self.client.messages.stream(
            model=settings.llm_model,
            max_tokens=settings.llm_max_tokens,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def _stream_openai(self, messages: list[dict], system_prompt: str):
        """Stream via OpenAI-compatible API (works with local LLMs)."""
        # Build message list with system prompt
        openai_messages = []
        if system_prompt:
            openai_messages.append({"role": "system", "content": system_prompt})
        else:
            openai_messages.append({"role": "system", "content": "You are a helpful AI assistant."})

        # Convert messages to OpenAI format
        for msg in messages:
            content = msg.get("content", "")
            role = msg.get("role", "user")

            # Handle Anthropic-style content blocks
            if isinstance(content, list):
                # Extract text from content blocks
                text_parts = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text_parts.append(block["text"])
                    elif isinstance(block, dict) and block.get("type") == "tool_result":
                        text_parts.append(f"[Tool result]: {block.get('content', '')}")
                content = "\n".join(text_parts) if text_parts else str(content)

            if role in ("user", "assistant", "system"):
                openai_messages.append({"role": role, "content": content})

        stream = self.client.chat.completions.create(
            model=settings.llm_model,
            messages=openai_messages,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
