import os
import joblib
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(
    title="Abhedya Content Moderation API",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_PATH = "models/comment_classifier.pkl"
VECTORIZER_PATH = "models/tfidf_vectorizer.pkl"


# -----------------------------
# Load trained ML model
# -----------------------------

if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
    clf = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    print("Model and vectorizer loaded successfully into FastAPI!")
else:
    clf = None
    vectorizer = None
    print("Warning: Model files not found!")


# -----------------------------
# Request schema
# -----------------------------

class AnalyzeRequest(BaseModel):
    comments: list[str]
    sensitivity: str = "standard"


# -----------------------------
# Helper functions
# -----------------------------

def normalize_label(label):
    """Convert dataset labels into clean display categories."""

    value = str(label).strip().lower()

    mapping = {
        "safe": "Safe",
        "borderline": "Borderline",

        "abusive": "Abusive",

        "harassment": "Harassment",

        "sexual harassment": "Sexual Harassment",

        "threat": "Threat",

        "possible pii": "Possible PII",
        "fake_pii": "Possible PII",
        "fake pii": "Possible PII",

        "hate": "Hate",
    }

    return mapping.get(value, str(label).strip().title())


def calculate_risk(category, confidence, sensitivity):
    """Convert model category/confidence into a UI-friendly risk score."""

    category_lower = category.lower()

    if category_lower == "safe":
        score = int(max(0, (1 - confidence) * 30))

    elif category_lower == "borderline":
        score = int(35 + confidence * 20)

    elif category_lower == "abusive":
        score = int(55 + confidence * 25)

    elif category_lower == "harassment":
        score = int(65 + confidence * 25)

    elif category_lower == "sexual harassment":
        score = int(70 + confidence * 25)

    elif category_lower == "possible pii":
        score = int(70 + confidence * 25)

    elif category_lower == "threat":
        score = int(80 + confidence * 20)

    elif category_lower == "hate":
        score = int(65 + confidence * 25)

    else:
        score = int(confidence * 100)

    score = max(0, min(100, score))

    # Strict mode makes potentially harmful content slightly more sensitive.
    if sensitivity == "strict" and category_lower != "safe":
        score = min(100, score + 5)

    return score


def risk_level_from_score(score, category):
    """Create the risk level used by the frontend."""

    category_lower = category.lower()

    if category_lower == "threat" and score >= 80:
        return "Critical"

    if score >= 80:
        return "Critical"

    if score >= 60:
        return "High"

    if score >= 35:
        return "Medium"

    return "Low"


def generate_reasons(comment, category, score):
    """Generate transparent reasons shown in the UI."""

    reasons = []
    text = comment.lower()

    category_lower = category.lower()

    if category_lower == "safe":
        reasons.append("No strong harmful-content signal detected")

    elif category_lower == "borderline":
        reasons.append("Borderline language detected")

    elif category_lower == "abusive":
        reasons.append("Abusive or insulting language detected")

    elif category_lower == "harassment":
        reasons.append("Targeted harassment signal detected")

    elif category_lower == "sexual harassment":
        reasons.append("Sexual harassment signal detected")

    elif category_lower == "threat":
        reasons.append("Potential threat language detected")

    elif category_lower == "possible pii":
        reasons.append("Possible personal-information exposure detected")

    elif category_lower == "hate":
        reasons.append("Potential hate or identity-based attack detected")

    # Additional transparent signals
    if any(word in text for word in [
        "kill", "die", "hurt", "attack", "destroy"
    ]):
        reasons.append("Threat-related wording present")

    if any(word in text for word in [
        "address", "phone", "number", "location", "where you live"
    ]):
        reasons.append("Possible personal-information signal")

    if score >= 80:
        reasons.append("High-risk score requires review")

    return reasons[:3]


# -----------------------------
# Root / health endpoints
# -----------------------------

@app.get("/")
def read_root():
    return {
        "message": "Abhedya Content Moderation API is online"
    }


@app.get("/health")
def health():
    return {
        "status": "online",
        "model_loaded": clf is not None and vectorizer is not None
    }


# -----------------------------
# Main batch analysis endpoint
# -----------------------------

@app.post("/analyze")
def analyze_comments(request: AnalyzeRequest):

    if clf is None or vectorizer is None:
        raise HTTPException(
            status_code=500,
            detail="Model or vectorizer not loaded"
        )

    if not request.comments:
        raise HTTPException(
            status_code=400,
            detail="No comments supplied"
        )

    if len(request.comments) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 comments allowed per batch"
        )

    comments = [
        str(comment).strip()
        for comment in request.comments
        if str(comment).strip()
    ]

    if not comments:
        raise HTTPException(
            status_code=400,
            detail="No valid comments supplied"
        )

    # Transform the entire batch at once.
    X = vectorizer.transform(comments)

    predictions = clf.predict(X)

    # Get probabilities when the trained classifier supports them.
    if hasattr(clf, "predict_proba"):
        probabilities = clf.predict_proba(X)
    else:
        probabilities = None

    results = []

    for index, (comment, prediction) in enumerate(
        zip(comments, predictions)
    ):

        category = normalize_label(prediction)

        if probabilities is not None:
            confidence = float(np.max(probabilities[index]))
        else:
            confidence = 0.75

        risk_score = calculate_risk(
            category,
            confidence,
            request.sensitivity
        )

        risk_level = risk_level_from_score(
            risk_score,
            category
        )

        reasons = generate_reasons(
            comment,
            category,
            risk_score
        )

        results.append({
            "comment": comment,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "category": category,
            "reasons": reasons,
            "model_used": "TF-IDF + Logistic Regression"
        })

    return {
        "results": results
    }