from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Status string indicating service health")
    service: str = Field(default="ai-code-review-bot", description="Name of the backend service")
    version: str = Field(default="1.0.0", description="API Version")
    environment: str = Field(default="development", description="Current operating environment")
    database: str = Field(default="connected", description="Database health status")


class MessageResponse(BaseModel):
    """Standard message response schema."""
    message: str
    details: Optional[Dict[str, Any]] = None
