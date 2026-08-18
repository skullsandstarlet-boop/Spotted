from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator


class BaseSchema(BaseModel):
    """Base schema with common Pydantic configuration"""

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

    @model_validator(mode="before")
    @classmethod
    def reject_null_bytes(cls, data: Any) -> Any:
        """Reject null bytes in string values to prevent database errors."""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and "\x00" in value:
                    raise ValueError(
                        f"Null bytes are not allowed in field '{key}'"
                    )
        return data


class TimestampMixin(BaseModel):
    """Mixin for entities with created_at/updated_at fields"""

    created_at: datetime
    updated_at: datetime


class SpotPostBase(BaseSchema):
    body: str
    category: str = "general"
    latitude: float
    longitude: float
    location_hint: str | None = None


class SpotPostCreate(SpotPostBase):
    duration_hours: int = 6


class SpotPostRead(SpotPostBase):
    id: int
    created_at: datetime
    expires_at: datetime
    distance_m: int | None = None


class SpotPostListResponse(BaseSchema):
    posts: list[SpotPostRead]
    radius_m: int
    count: int


# Define your Pydantic schemas here
# Pattern: EntityBase -> EntityCreate/EntityUpdate -> Entity (response)
