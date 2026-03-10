from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    thread_id: Optional[str] = Field(None, description="Existing thread ID")
    message: str = Field(..., description="User message content")


class ThreadCreate(BaseModel):
    title: Optional[str] = Field(None, description="Thread title")


class ThreadUpdate(BaseModel):
    title: str = Field(..., description="New thread title")


class ThreadResponse(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    role: str
    content: str
    tool_calls: Optional[dict] = None
    created_at: datetime
