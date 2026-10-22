# 🛡️ CyberShield AI — Spam & Threat Detection Suite

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)

**CyberShield AI** is an explainable, local-first cybersecurity screening platform. It empowers users to inspect suspicious text messages, URLs, and files with transparent signals, probability breakdowns, and actionable security recommendations.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Model Performance](#-model-performance)
- [Project Structure](#-project-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Testing](#-testing)
- [Security & Privacy By Design](#-security--privacy-by-design)
- [Disclaimer](#-disclaimer)

---

## 🚀 Key Features

### 1. 💬 Explainable Message Spam Detection (Machine Learning)
- Built on a **TF-IDF + Class-Weighted Logistic Regression** pipeline trained on the UCI SMS Spam Collection.
- Outputs calibrated **spam probability**, **verdict**, **confidence score**, and **risk score (0–100)**.
- **Explainability**: Extracts top contributing model vocabulary terms and flags separate heuristic cues (urgency pressure, suspicious links, monetary demands).

### 2. 🔗 Heuristic Link & URL Inspection
- **11 Rule-Based Checks**: Evaluates raw IP hosts, abnormal URL lengths, excessive subdomains, disguised credentials (`@`), non-HTTPS schemes, suspicious TLDs (`.zip`, `.mov`, `.click`), URL shorteners, punycode lookalikes (`xn--`), and brand impersonation (e.g. `paypal-login.attacker.example`).
- **Zero External Requests**: Evaluated strictly offline without resolving, querying, or visiting target addresses.

### 3. 📁 File Metadata & Signature Sniffing
- Reads files entirely in memory (10 MB strict limit).
- Inspects **Magic Byte signatures** (PDF, PNG, JPEG, ZIP, PE executable) and cross-references against MIME types.
- Detects dangerous executable extensions and deceptive double extensions (e.g., `invoice.pdf.exe`).
- Generates cryptographic **SHA-256** checksums without executing or persisting file bytes.

### 4. 👤 Account & Session Security
- Local account registration with salted **PBKDF2-HMAC-SHA256** password hashing (420,000 iterations).
- Expiring **HttpOnly `SameSite=Lax` session cookies** with server-side SHA-256 token hashing.
- Strictly isolated multi-tenant scan records and dashboard telemetry.
- **Account Settings**: Edit profile display name, upload custom profile images with instant crop/preview, pick from 4 CyberShield avatar presets, and change passwords.

### 5. 📊 Model Evaluation Card & Security Awareness
- Interactive model performance card detailing held-out test metrics and a 2×2 confusion matrix.
- Field notes with actionable guidance on handling phishing, malicious attachments, and social engineering.

---

## 🛠️ Architecture & Tech Stack

```text
React 18 + TypeScript + Vite (Port 5173)
       │  HTTP / JSON + Multipart Uploads
       │  HttpOnly Session Cookie
FastAPI + Python 3.11 Backend (Port 8000)
  ├── Auth System: PBKDF2-HMAC-SHA256, Session Token Hashing
  ├── Message Classifier: Scikit-learn TF-IDF + Logistic Regression
  ├── URL Analyzer: Local RFC & Security Heuristic Engine
  ├── File Inspector: Byte Signature Sniffing (No Execution)
  └── Database: SQLite3 (users, sessions, scans)
```

| Component | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 8, Lucide React, Modern Vanilla CSS |
| **Backend** | FastAPI, Pydantic v2, Uvicorn, Python-Multipart |
| **Machine Learning** | Scikit-learn, Joblib, Pandas, NumPy |
| **Database** | SQLite3 (Parameterized, WAL mode capable) |
| **Test Suite** | Pytest, HTTPX, Starlette TestClient |

---

## 📈 Model Performance

Trained on the **UCI SMS Spam Collection** (5,572 records) using a deterministic stratified 80/20 train/test split:

| Metric | Result |
|---|---|
| **Accuracy** | **97.49%** |
| **Precision** | **89.54%** |
| **Recall** | **91.95%** |
| **F1 Score** | **90.73%** |

#### Confusion Matrix (1,115 Held-out Messages):
```text
               Predicted Ham    Predicted Spam
Actual Ham          950               15
Actual Spam          13              137
```

---

## 📂 Project Structure

```text
spam_detection_project/
├── backend/
│   ├── app/
│   │   └── main.py              # FastAPI endpoints, auth, analysis logic, SQLite DB
│   ├── ml/
│   │   ├── train_spam_model.py  # Model training & metrics generation script
│   │   └── models/
│   │       ├── spam_model.joblib # Serialized scikit-learn pipeline
│   │       └── metrics.json     # Precomputed held-out evaluation metrics
│   ├── tests/
│   │   └── test_api.py          # Pytest acceptance & regression tests
│   ├── requirements.txt         # Python dependencies
│   └── cybershield.sqlite3      # Local SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main dashboard, navigation, scanner workbenches
│   │   ├── AuthScreen.tsx       # Login & signup authentication gate
│   │   ├── AccountModal.tsx     # Profile editing, image upload & password modal
│   │   ├── main.tsx             # React DOM entry point
│   │   ├── style.css            # Base design system & typography
│   │   ├── background.css       # Cyberpunk dark theme, modal, & layout styles
│   │   └── auth.css             # Authentication screen styles & animations
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── srs.md                       # Software Requirements Specification (SRS)
├── prd.md 2 vs code cyber.md    # Product Requirements Document (PRD)
└── README.md                    # Project documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: Version 3.11 or higher
- **Node.js**: Version 18 or higher (LTS recommended)
- **Git**

---

### 1. Backend Setup

From the project root:

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Start the FastAPI backend server
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: **`http://127.0.0.1:8000`**  
Interactive API Docs (Swagger): **`http://127.0.0.1:8000/docs`**

---

### 2. Frontend Setup

In a new terminal window:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch the Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend will be available at: **`http://127.0.0.1:5173`**

---

## 🧪 Testing

### Backend Acceptance Tests (Pytest)
Run all 12 acceptance tests covering authentication, session cookies, multi-user isolation, spam classification, URL rules, file byte checks, profile updating, and password change:

```bash
cd backend
pytest -v
```

### Frontend Typecheck & Production Build
```bash
cd frontend
npm run build
```

---

## 🔒 Security & Privacy By Design

- **Offline-First Analysis**: Never makes external calls to submitted URLs or third-party threat APIs.
- **No File Persistence**: Uploaded files are processed strictly in memory and discarded immediately after metadata extraction.
- **Secure Credentials**: Passwords are never stored in plaintext. They use PBKDF2-HMAC-SHA256 with 420,000 iterations and unique 16-byte random salts.
- **Session Protection**: Bearer tokens are stored only as SHA-256 hashes and transferred over secure, HttpOnly, SameSite cookies.
- **Account Isolation**: SQLite queries strictly scope scan history and telemetry by authenticated user ID.

---

## ⚠️ Disclaimer

CyberShield AI is an **educational and awareness-focused screening tool**. A low-risk result is not a guarantee of absolute safety. It does not replace antivirus software, sandbox execution engines, or enterprise endpoint protection.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
