from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

# Temporary demo storage; resets when the backend restarts.
_incidents = []
_lock = Lock()

SEVERITY = {
    "Safe": 0,
    "Abusive": 1,
    "Harassment": 2,
    "Hate": 2,
    "Sexual Harassment": 3,
    "Possible PII": 3,
    "Threat": 4,
}


def record_incident(account_id, platform, analysis):
    if not isinstance(account_id, str) or not account_id.strip():
        raise ValueError("A demo account ID is required.")

    if not isinstance(platform, str) or not platform.strip():
        raise ValueError("A platform identifier is required.")

    category = analysis.get("category", "Abusive")
    if category not in SEVERITY:
        category = "Abusive"

    severity = SEVERITY[category]
    harmful = category != "Safe"

    high_priority = (
        category == "Threat"
        or (
            category == "Possible PII"
            and analysis.get("risk_score", 0) >= 50
        )
    )

    with _lock:
        previous = [
            item for item in _incidents
            if item["account_id"] == account_id
            and item["platform"] == platform
            and item["harmful"]
        ]

        previous_max = max(
            (item["severity"] for item in previous),
            default=0,
        )

        incident = {
            "incident_id": str(uuid4()),
            "account_id": account_id,
            "platform": platform,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "comment": analysis.get("comment", ""),
            "category": category,
            "risk_score": analysis.get("risk_score", 0),
            "severity": severity,
            "harmful": harmful,
            "repeat_harassment": harmful and bool(previous),
            "escalating": (
                harmful
                and bool(previous)
                and severity > previous_max
            ),
            "previous_harmful_incidents": len(previous),
            "priority": (
                "HIGH" if high_priority
                else "ELEVATED" if harmful and previous
                else "NORMAL" if harmful
                else "LOW"
            ),
        }

        history = [
            dict(item) for item in _incidents
            if item["account_id"] == account_id
            and item["platform"] == platform
        ]

        _incidents.append(incident)

    return {
        "incident": incident,
        "history": history,
    }