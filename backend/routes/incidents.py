from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.comment_analyzer import analyze_single_comment
from services.incident_tracker import record_incident

router = APIRouter()


class IncidentRequest(BaseModel):
    account_id: str = Field(..., min_length=1, max_length=100)
    platform: str = Field(..., min_length=1, max_length=50)
    comment: str = Field(..., min_length=1, max_length=1000)
    sensitivity: str = "standard"


@router.post("/incidents/analyze")
def analyze_incident_endpoint(payload: IncidentRequest):
    if payload.sensitivity not in ("standard", "strict"):
        raise HTTPException(
            status_code=400,
            detail="Sensitivity must be standard or strict.",
        )

    analysis = analyze_single_comment(
        payload.comment,
        sensitivity=payload.sensitivity,
    )

    try:
        return record_incident(
            payload.account_id.strip(),
            payload.platform.strip(),
            analysis,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))