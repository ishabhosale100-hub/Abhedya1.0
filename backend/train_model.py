import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

# 1. Perfectly matched comments and labels dataset
comments = [
    # Safe comments (14)
    "Love this post! Keep creating amazing content ❤️",
    "This is genuinely helpful, thank you for sharing!",
    "You look so confident here! ✨",
    "Really inspiring work, keep going!",
    "Such a positive message. More people should see this.",
    "This is beautifully explained 👏",
    "Proud of you! Keep shining!",
    "Your content always motivates me.",
    "Great post, looking forward to more!",
    "This deserves way more appreciation! ❤️",
    "Have a wonderful day ahead!",
    "Amazing video as always.",
    "So glad I found your channel.",
    "Keep up the fantastic work!",
    # Abusive & Insulting comments (15)
    "You are an absolute idiot and a moron",
    "Shut the fuck up you dumbass piece of shit",
    "You suck so bad, delete your stupid channel",
    "What a complete bastard, get lost",
    "You are so fucking annoying and ugly",
    "Go kill yourself you worthless trash",
    "Screw you and your garbage content",
    "You're a fucking loser with no life",
    "Absolute bullshit video, you're a fraud",
    "Damn you are stupid as hell",
    "Shut up you bastard",
    "Fucking idiot, nobody likes you",
    "Get lost you worthless piece of garbage",
    "You have zero talent, go away",
    "Stop posting this crap you asshole",
    # Threat comments (10)
    "I know where you live and I'm coming for you",
    "Watch your back tonight, you're dead",
    "You'll regret posting this, I swear I will hurt you",
    "I'm going to ruin your life and find you",
    "Better lock your doors tonight",
    "You won't survive tomorrow if you don't delete this",
    "Consider yourself warned, I am coming after you",
    "I'm going to track you down",
    "Keep posting and see what happens to your family",
    "Your days are numbered, watch out",
    # Harassment comments (7)
    "Stop spamming my feed every single day",
    "You are a stalker, leave everyone alone",
    "Stop messaging me or I will report you",
    "Constantly harassing people, get a grip",
    "Leave this community immediately",
    "You are a total pest",
    "Stop targeting me with your hate",
    # Sexual Harassment comments (10)
    "Send me nude pictures right now",
    "You look so sexy I want to touch you all over",
    "Creepy comment about body and private parts",
    "Unsolicited vulgar sexual remark",
    "Disgusting sexual harassment text",
    "Inappropriate physical comment about your body",
    "Vile sexual reference, show me some skin",
    "Unwanted sexual advance, let's hook up",
    "Gross sexual remark, you look hot",
    "Stop posting such sexually suggestive trash, slut",
    # Possible PII comments (8)
    "Hey text me on my personal cell 9876543210",
    "My email is creator.secure@gmail.com",
    "Meet me at 123 Main Street Mumbai",
    "Here is my phone number +919876543210",
    "Contact me directly at test@domain.com",
    "My home address is Flat 402 Pune",
    "Call me at 555-0199",
    "Reach out to my personal email admin@safe.org",
    # Fake PII comments (4)
    "Fake phone number 0000000000",
    "Fake email fake@fake.com",
    "Fake address Nowhere Street 00",
    "Not a real phone number 1234567890",
    # Borderline comments (4)
    "Borderline provocative comment",
    "Slightly edgy remark",
    "Maybe offensive maybe not",
    "Borderline safe or unsafe line",
]

labels = (
    ["safe"] * 14
    + ["abusive"] * 15
    + ["threat"] * 10
    + ["harassment"] * 7
    + ["sexual harassment"] * 10
    + ["possible pii"] * 8
    + ["fake pii"] * 4
    + ["borderline"] * 4
)

df = pd.DataFrame({"comment": comments, "label": labels})
print(f"Loaded dataset successfully with {len(df)} rows!")


# 2. Normalize labels function
def clean_label(val):
  if pd.isna(val):
    return "safe"
  val_str = str(val).strip().lower()
  if "abusive" in val_str:
    return "abusive"
  elif "threat" in val_str:
    return "threat"
  elif "sexual" in val_str:
    return "sexual harassment"
  elif "harassment" in val_str:
    return "harassment"
  elif "possible pii" in val_str or "pii" in val_str:
    if "fake" in val_str:
      return "fake pii"
    return "possible pii"
  elif "fake_pii" in val_str or "fake pii" in val_str:
    return "fake pii"
  elif "borderline" in val_str or "safe" in val_str:
    return "borderline"
  elif "safe" in val_str:
    return "safe"
  return val_str


df["clean_label"] = df["label"].apply(clean_label)
print("Normalized label counts:\n", df["clean_label"].value_counts())

X = df["comment"].astype(str)
y = df["clean_label"]

# 3. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4. Vectorize text using TF-IDF
vectorizer = TfidfVectorizer(
    stop_words="english", ngram_range=(1, 2), max_features=1500
)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# 5. Train Classifier
clf = LogisticRegression(class_weight="balanced", max_iter=1000)
clf.fit(X_train_vec, y_train)

# 6. Evaluate
y_pred = clf.predict(X_test_vec)
print("\n--- Model Evaluation ---")
print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")

# 7. Save model and vectorizer
os.makedirs("models", exist_ok=True)
joblib.dump(clf, "models/comment_classifier.pkl")
joblib.dump(vectorizer, "models/tfidf_vectorizer.pkl")
print(
    "\nSuccess! Model and vectorizer saved inside backend/models/ successfully."
)