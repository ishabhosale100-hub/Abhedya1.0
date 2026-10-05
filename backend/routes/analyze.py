from fastapi import APIRouter, HTTPException, status
from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.comment_analyzer import analyze_comments_batch

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(payload: AnalyzeRequest):
    comments = payload.comments

    if not comments or not isinstance(comments, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'comments' must be a non-empty list of strings."
        )

    if len(comments) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum batch size exceeded. Please submit 50 or fewer comments per request."
        )

    for i, c in enumerate(comments):
        if not isinstance(c, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Comment at index {i} must be a string."
            )
        if len(c) > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Comment at index {i} exceeds the maximum length of 1000 characters."
            )

    sensitivity = payload.sensitivity or "standard"
    results = analyze_comments_batch(comments, sensitivity=sensitivity)
    return AnalyzeResponse(results=results)
