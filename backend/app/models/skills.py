from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re


class SkillCreate(BaseModel):
    name: str = Field(..., max_length=64)
    description: str = Field(..., min_length=20, max_length=1024)
    instructions: str = Field("", max_length=50000)
    enabled: bool = True
    license: Optional[str] = None
    compatibility: Optional[str] = None
    metadata: dict = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", v):
            raise ValueError(
                "Name must be lowercase, hyphenated (e.g., 'my-skill')"
            )
        return v


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, min_length=20, max_length=1024)
    instructions: Optional[str] = Field(None, max_length=50000)
    enabled: Optional[bool] = None
    license: Optional[str] = None
    compatibility: Optional[str] = None
    metadata: Optional[dict] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", v):
            raise ValueError("Name must be lowercase, hyphenated")
        return v


class SkillResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    description: str
    instructions: str
    enabled: bool
    license: Optional[str] = None
    compatibility: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: str
    updated_at: str


class SkillShareToggle(BaseModel):
    """Toggle global/private."""

    pass
