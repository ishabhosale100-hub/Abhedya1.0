import os
import logging
from typing import List, Dict, Any
from utils.pii import scan_pii_and_threats

MODEL_NAME = "unitary/toxic-bert"

_nlp_pipeline = None
_model_failed = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("abhedya.comment_analyzer")

def get_pipeline():
    """
    Lazy-load the Hugging Face pipeline once.
    Falls back gracefully if transformers or PyTorch is not available.
    """
    global _nlp_pipeline, _model_failed
    if _nlp_pipeline is not None:
        return _nlp_pipeline
    if _model_failed:
        return None

    try:
        from transformers import pipeline
        logger.info(f"Loading Hugging Face model pipeline '{MODEL_NAME}'...")
        _nlp_pipeline = pipeline("text-classification", model=MODEL_NAME, top_k=None, truncation=True)
        logger.info(f"Model '{MODEL_NAME}' loaded successfully.")
        return _nlp_pipeline
    except Exception as e:
        logger.warning(f"Could not load Hugging Face model '{MODEL_NAME}': {e}. Falling back to rule engine.")
        _model_failed = True
        return None


def analyze_single_comment(comment: str, sensitivity: str = "standard") -> Dict[str, Any]:
    """
    Analyze a single comment text and compute risk_score, risk_level, category, reasons, model_used.
    """
    pipe = get_pipeline()
    model_used = f"{MODEL_NAME} + rules" if pipe is not None else "rules only (language model unavailable)"

    reasons = []
    categories_found = []

    # 1. Rule Engine (PII, threats, address patterns, phone numbers)
    rule_cats, rule_reasons, rule_score_boost = scan_pii_and_threats(comment)
    categories_found.extend(rule_cats)
    reasons.extend(rule_reasons)

    model_max_score = 0.0
    model_top_label = ""

    # 2. Hugging Face AI Pipeline Evaluation (if available)
    if pipe is not None:
        try:
            preds = pipe(comment)
            # preds format: [[{'label': 'toxic', 'score': 0.9}, ...]]
            if preds and isinstance(preds, list) and len(preds) > 0:
                scores_list = preds[0] if isinstance(preds[0], list) else preds
                score_dict = {item['label'].lower(): item['score'] for item in scores_list}

                # Find highest scoring label
                for label, sc in score_dict.items():
                    if sc > model_max_score:
                        model_max_score = sc
                        model_top_label = label

                    # Human-readable reasons for noticeable model scores (> 0.40)
                    if sc >= 0.40:
                        reasons.append(f"{label.capitalize()} score {sc:.2f}")

                # Map top model label to Abhedya categories
                if score_dict.get('threat', 0) > 0.4:
                    categories_found.append("Threat")
                if score_dict.get('identity_hate', 0) > 0.4:
                    categories_found.append("Hate")
                if score_dict.get('severe_toxic', 0) > 0.4 or score_dict.get('insult', 0) > 0.5:
                    categories_found.append("Harassment")
                if score_dict.get('obscene', 0) > 0.5:
                    categories_found.append("Sexual Harassment")
                if score_dict.get('toxic', 0) > 0.4 and not categories_found:
                    categories_found.append("Abusive")
        except Exception as err:
            logger.warning(f"Error during model inference: {err}")
            reasons.append("Language model inference error, using rule-based engine")
            model_used = "rules only (language model unavailable)"
    else:
        reasons.append("Language model unavailable, using rule-based engine")

    # 3. Calculate 0-100 Score
    model_score_100 = int(model_max_score * 100)
    raw_score = max(model_score_100, rule_score_boost)

    # Sensitivity adjustments
    if sensitivity == "strict" and raw_score > 0:
        raw_score = min(100, raw_score + 15)

    final_score = min(100, max(0, raw_score))

    # Category determination
    if not categories_found:
        if final_score < 25:
            category = "Safe"
        elif final_score < 50:
            category = "Abusive"
        elif final_score < 75:
            category = "Harassment"
        else:
            category = "Threat"
    else:
        # Hierarchy: Threat > Sexual Harassment > Hate > Harassment > Possible PII > Abusive > Safe
        category_order = ["Threat", "Sexual Harassment", "Hate", "Harassment", "Possible PII", "Abusive", "Safe"]
        category = "Safe"
        for cat_cand in category_order:
            if cat_cand in categories_found:
                category = cat_cand
                break

    # Risk Level by score
    if final_score >= 75:
        risk_level = "Critical"
    elif final_score >= 50:
        risk_level = "High"
    elif final_score >= 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Format reasons cleanly
    if not reasons:
        reasons = ["No harm signals detected"]

    return {
        "comment": comment,
        "risk_level": risk_level,
        "risk_score": final_score,
        "category": category,
        "reasons": reasons,
        "model_used": model_used
    }


def analyze_comments_batch(comments: List[str], sensitivity: str = "standard") -> List[Dict[str, Any]]:
    """
    Process a batch of comments.
    """
    results = []
    for comment in comments:
        res = analyze_single_comment(comment, sensitivity=sensitivity)
        results.append(res)
    return results
