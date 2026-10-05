from pydantic import BaseModel, Field
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    comments: List[str] = Field(..., description="List of comment strings to analyze")
    sensitivity: Optional[str] = Field("standard", description="Sensitivity level: 'standard' or 'strict'")

class CommentResult(BaseModel):
    comment: str
    risk_level: str
    risk_score: int
    category: str
    reasons: List[str]
    model_used: str

class AnalyzeResponse(BaseModel):
    results: List[CommentResult]
