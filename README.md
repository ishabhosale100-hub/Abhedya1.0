# ABHEDYA — Digital Safety for Your Digital Identity

**ABHEDYA** is an AI-assisted digital safety platform designed for women creators. It provides four integrated safety modules: **Photo Protection**, **Image Investigation**, **Comment Safety**, and **Evidence Vault**.

---

## 1. System Architecture Matrix

| Screen | Route | Frontend Components | Backend Need | State Management |
| :--- | :--- | :--- | :--- | :--- |
| **Intro** | `/intro` | `IntroPage.jsx` | None | Public Gateway |
| **Login** | `/login` | `LoginPage.jsx` | None | `localStorage.abhedya_logged_in` |
| **Language** | `/language` | `LanguagePage.jsx` | None | `localStorage.abhedya_lang` |
| **Home (Workspace)** | `/workspace` | `HomePage.jsx`, `Header.jsx`, `Sidebar.jsx` | None | `evidenceStore.js` (Real counts) |
| **Photo Protection** | `/photo-protection` | `PhotoProtectionPage.jsx`, `Header.jsx`, `Sidebar.jsx` | None (Canvas API) | React State + `hash.js` + `evidenceStore.js` |
| **Image Investigation**| `/image-investigation`| `ImageInvestigationPage.jsx`, `Header.jsx`, `Sidebar.jsx` | None (Canvas API) | React State + `imageDiff.js` + `evidenceStore.js` |
| **Comment Safety** | `/comment-safety` | `CommentSafetyPage.jsx`, `Header.jsx`, `Sidebar.jsx` | `POST /analyze` | `api.js` + `evidenceStore.js` + `report.js` |
| **Evidence Vault** | `/evidence-vault` | `EvidenceVaultPage.jsx`, `Header.jsx`, `Sidebar.jsx` | None | `evidenceStore.js` + `report.js` |

---

## 2. Directory Structure & File Map

```
abhedya/
├── frontend/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── .env.example
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── IntroPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── LanguagePage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── PhotoProtectionPage.jsx
│   │   │   ├── ImageInvestigationPage.jsx
│   │   │   ├── CommentSafetyPage.jsx
│   │   │   └── EvidenceVaultPage.jsx
│   │   ├── services/
│   │   │   ├── api.js           (ALL backend fetch calls only)
│   │   │   └── evidenceStore.js (ALL localStorage evidence read/write)
│   │   └── utils/
│   │       ├── hash.js          (Web Crypto SHA-256)
│   │       ├── i18n.js          (English, Hindi, Marathi translations)
│   │       ├── imageDiff.js     (Canvas per-pixel diff & heatmap)
│   │       └── report.js        (jsPDF Incident Report generator)
│   └── package.json
├── backend/
│   ├── main.py                  (FastAPI app, CORS, router registration)
│   ├── routes/
│   │   └── analyze.py           (POST /analyze endpoint)
│   ├── services/
│   │   └── comment_analyzer.py  (Hugging Face model pipeline + rule engine)
│   ├── models/
│   │   └── schemas.py           (Pydantic schemas)
│   ├── utils/
│   │   └── pii.py               (Indian phone numbers, emails, addresses, threats)
│   └── requirements.txt
├── design-reference/            (Visual reference screens & DESIGN.md)
└── README.md
```

---

## 3. Exact Windows Commands

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+

### Option A: Running Backend
1. Open PowerShell or Command Prompt:
   ```cmd
   cd c:\Users\Isha Bhosale\OneDrive\Documents\Abhedya\backend
   ```
2. Activate existing virtual environment (or create one):
   ```cmd
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
4. Start FastAPI uvicorn server:
   ```cmd
   python -m uvicorn main:app --reload --port 8000
   ```
   *Backend runs at `http://localhost:8000`.*

### Option B: Running Frontend
1. Open a second PowerShell or Command Prompt window:
   ```cmd
   cd c:\Users\Isha Bhosale\OneDrive\Documents\Abhedya\frontend
   ```
2. Install dependencies (if not installed):
   ```cmd
   npm install
   ```
3. Run Vite dev server:
   ```cmd
   npm run dev
   ```
4. Open your browser and navigate to:
   `http://localhost:5173`

---

## 4. How to Swap the AI Model & Deploy

### A. Swapping the Hugging Face AI Model
The model is loaded modularly in `backend/services/comment_analyzer.py`.
To use a different Hugging Face classification model (e.g. `cardiffnlp/twitter-roberta-base-hate` or `facebook/roberta-hate-speech-dynabench-r4-target`):
1. Open `backend/services/comment_analyzer.py`.
2. Change the constant at the top of the file:
   ```python
   MODEL_NAME = "your-desired-huggingface-model-name"
   ```
3. Save the file. The pipeline will automatically lazy-load the new model on the next request.

### B. Deployment Configuration (`VITE_API_BASE_URL`)
- **Frontend (Vercel / Netlify):** Set Environment Variable in Vercel project settings:
  ```env
  VITE_API_BASE_URL=https://your-backend-service.onrender.com
  ```
- **Backend (Hugging Face Spaces / Render / Railway):**
  Ensure CORS origins in `backend/main.py` allow your deployed Vercel domain or `*`.

---

## 5. Manual Test Checklist

Execute these test cases through the `/comment-safety` interface or directly via `POST http://localhost:8000/analyze`:

| Test Input Comment | Expected Risk Level | Expected Category | Key Reason Signal |
| :--- | :--- | :--- | :--- |
| `"Your content is amazing!"` | **Low** | **Safe** | No harm signals detected |
| `"You are completely useless, stop posting."` | **Medium** | **Abusive** | Insult / Toxic score |
| `"I know where you live and which studio you work in."` | **Critical** | **Threat** | Threat phrase detected |
| `"Send me your phone number right now."` | **High** | **Harassment** | Unsolicited contact demand detected |
| `"Call me on 9876543210"` | **High** | **Possible PII** | Indian phone number detected |

---

## 6. Truthfulness & Honesty Compliance

In compliance with project directives:
- All sample legal claims (e.g. "Rule 65B compliant", "ISO 27001", "ECDSA ledger", "EAL-4+", "tamper-proof") have been replaced with accurate statements:
  - Header: `"Local session"`
  - Sidebar: `"Records stay in this browser"`
  - Photo Protection Notice: *"A visible watermark helps show ownership and discourages casual reuse. It does not prevent cropping, editing or misuse. Always keep your original high-resolution files."*
  - Image Investigation Disclaimer: *"This analysis highlights visual differences. It does not by itself prove AI manipulation or establish authenticity."*
  - Comment Safety Privacy Note: *"Comments are sent to the Abhedya analysis server for scoring. This prototype does not store them. It works on pasted comments and does not connect to Instagram or YouTube."*
  - Evidence Vault Fingerprint: *"SHA-256 fingerprint of this record, computed in your browser when saved. It helps you notice later changes. It is not a legal certification."*
  - PDF Report Legal Disclaimer: *"This is a user-generated evidence record created with Abhedya. It is not an official legal document and does not guarantee any legal outcome."*
