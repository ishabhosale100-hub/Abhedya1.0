import re
from typing import List, Tuple

# Indian Phone Numbers: 10 digits starting 6-9, optional +91 or 0, spaces/dashes
INDIAN_PHONE_REGEX = re.compile(r'(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b[6-9]\d{9}\b')

# Emails
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')

# Indian PIN Codes (6 digits, not starting with 0)
PIN_CODE_REGEX = re.compile(r'\b[1-9][0-9]{5}\b')

# Location / Address indicators
ADDRESS_KEYWORDS = [
    "flat no", "house no", "plot no", "street no", "near ", "road", "colony",
    "nagar", "marg", "apartment", "society", "sector", "block"
]

# High-severity explicit threat phrases
THREAT_PHRASES = [
    "i know where you live",
    "studio you work in",
    "i will find you",
    "i will kill",
    "kill you",
    "you will regret",
    "leak your photos",
    "leak your pictures",
    "watch your back",
    "track you down",
    "know your address",
    "come to your house"
]

# Unsolicited contact / info demands
CONTACT_DEMANDS = [
    "send me your number",
    "call me on",
    "give me your number",
    "share your number",
    "send your location",
    "dm me your number",
    "whatsApp me on",
    "whatsapp number"
]

def scan_pii_and_threats(text: str) -> Tuple[List[str], List[str], int]:
    """
    Scans input comment for PII leaks, location patterns, explicit threat phrases, and contact demands.
    Returns: (categories_detected, reasons_list, score_boost)
    """
    reasons = []
    categories = []
    score_boost = 0

    text_lower = text.lower()

    # 1. Indian Phone Numbers
    phone_matches = INDIAN_PHONE_REGEX.findall(text)
    if phone_matches:
        categories.append("Possible PII")
        reasons.append("Indian phone number detected")
        score_boost = max(score_boost, 75)

    # 2. Email Address
    email_matches = EMAIL_REGEX.findall(text)
    if email_matches:
        categories.append("Possible PII")
        reasons.append("Email address pattern detected")
        score_boost = max(score_boost, 70)

    # 3. Location / Address / PIN Code
    pin_matches = PIN_CODE_REGEX.findall(text)
    has_addr_kw = any(kw in text_lower for kw in ADDRESS_KEYWORDS)
    if pin_matches or has_addr_kw:
        categories.append("Possible PII")
        reasons.append("Location or address pattern detected")
        score_boost = max(score_boost, 65)

    # 4. Explicit Threat Phrases
    found_threats = [phrase for phrase in THREAT_PHRASES if phrase in text_lower]
    if found_threats:
        categories.append("Threat")
        reasons.append(f"Possible threat phrase detected: '{found_threats[0]}'")
        score_boost = max(score_boost, 90)

    # 5. Contact Demands
    found_demands = [demand for demand in CONTACT_DEMANDS if demand in text_lower]
    if found_demands:
        categories.append("Harassment")
        reasons.append(f"Unsolicited contact demand detected: '{found_demands[0]}'")
        score_boost = max(score_boost, 75)

    return categories, reasons, score_boost
