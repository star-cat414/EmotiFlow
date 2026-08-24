from pydantic import BaseModel, Field
from typing import List, Optional

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Message string to analyze")
    previous_emotion: Optional[str] = Field(default="neutral", description="Previous message state for transition calculation")

class EmotionScore(BaseModel):
    emotion: str
    score: float

class PredictResponse(BaseModel):
    emotion: str
    confidence: float
    sequence: List[EmotionScore]

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool