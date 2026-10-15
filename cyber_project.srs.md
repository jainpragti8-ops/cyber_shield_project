# CyberShield AI – Software Requirements Specification (SRS)

**Project:** CyberShield AI – AI-Powered Spam, Phishing & Malware Detection System
**Version:** 1.0
**Author:** BCA AI/ML student (solo developer)
**Standard followed:** Simplified IEEE 830 structure
**Delivery:** 1-day build

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of CyberShield AI, a local web application that detects suspicious messages, URLs and files and explains its findings. It is written for the developer, evaluators and anyone maintaining the project.

### 1.2 Scope
The system provides three scanners (spam, URL, file), a dashboard, scan history, model evaluation and security awareness content. It runs locally. It does **not** replace antivirus software and makes no guarantee that any input is safe.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| Spam / Ham | Unwanted message / genuine message |
| TF-IDF | Term Frequency–Inverse Document Frequency text features |
| SHA-256 | Cryptographic hash used as a file fingerprint |
| Magic bytes | First bytes of a file identifying its real format |
| ML-based | Prediction produced by a trained model |
| Rule-based | Verdict produced by fixed, human-written checks |

### 1.4 References
- UCI Machine Learning Repository: SMS Spam Collection dataset
- scikit-learn, FastAPI, React, Vite, Tailwind CSS documentation

## 2. Overall Description

### 2.1 Product Perspective
A three-tier local application: React single-page frontend, FastAPI REST backend with scikit-learn model and analyzers, and a SQLite database.

### 2.2 Architecture

```
[ Browser: React + Vite + TS + Tailwind ]
            |  HTTP / JSON (REST, multipart for files)
[ FastAPI backend ]
   |-- Spam service  -> TF-IDF + Logistic Regression (joblib)
   |-- URL analyzer  -> rule-based heuristics
   |-- File analyzer -> metadata, magic bytes, SHA-256
   |-- History/Stats -> SQLite (scans table)
```

### 2.3 User Classes
- **General user:** runs scans and reads explanations.
- **Evaluator:** reviews metrics, history and documentation.

### 2.4 Operating Environment
- Windows, macOS or Linux
- Python 3.10+, Node.js 18+
- Modern browser (Chrome, Edge, Firefox)
- No internet required after dependency install and dataset download

### 2.5 Constraints
- One developer, one day
- Free, open-source tools only
- Local deployment, single user

### 2.6 Assumptions
- The UCI dataset file is downloaded manually into `backend/ml/data/`.
- Users scan English-language SMS text.
- The model is trained once before the backend starts.

## 3. Functional Requirements

### 3.1 Spam Detection (ML-based)

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall accept a text message of 1 to 2,000 characters. |
| FR-1.2 | The system shall classify it as Spam or Genuine using the trained TF-IDF + Logistic Regression model. |
| FR-1.3 | The system shall return the spam probability and a confidence value derived from model probabilities. |
| FR-1.4 | The system shall list the words that contributed most to the prediction. |
| FR-1.5 | The system shall add rule-based hints (urgency words, links, currency symbols) clearly labelled as hints, separate from the ML output. |
| FR-1.6 | The system shall provide safety recommendations based on the verdict. |
| FR-1.7 | A training script shall train the model from the local dataset, save the model file and write evaluation metrics. |

### 3.2 Phishing URL Analysis (rule-based)

| ID | Requirement |
|---|---|
| FR-2.1 | The system shall accept a URL up to 2,048 characters and validate its format. |
| FR-2.2 | The system shall check for: IP address host, excessive length, many subdomains, `@` symbol, many hyphens, missing HTTPS, suspicious keywords, URL shorteners, punycode, suspicious TLDs, and brand names outside the registered domain. |
| FR-2.3 | The system shall compute a risk score from 0 to 100 and map it to Low, Medium or High. |
| FR-2.4 | The system shall list every triggered rule with a plain-language explanation. |
| FR-2.5 | The system shall NOT visit or fetch the URL. |
| FR-2.6 | The result shall be labelled "Rule-based analysis, not machine learning". |

### 3.3 File Safety Analysis (metadata checks)

| ID | Requirement |
|---|---|
| FR-3.1 | The system shall accept a file upload up to a configured limit (default 10 MB). |
| FR-3.2 | The system shall compute the SHA-256 hash, size, extension, guessed MIME type and magic-byte type. |
| FR-3.3 | The system shall flag risky extensions, double extensions and extension/signature mismatches. |
| FR-3.4 | The system shall read the file as bytes only and shall never execute, open or render it. |
| FR-3.5 | The system shall delete the temporary copy after analysis and store only metadata and hash. |
| FR-3.6 | The system shall never state that a file is safe; the lowest verdict is "No obvious red flags found (not a guarantee)". |

### 3.4 Explainable Results

| ID | Requirement |
|---|---|
| FR-4.1 | Every result shall show verdict, risk score, detection method, indicators and recommendations. |
| FR-4.2 | Confidence shall be shown only for the ML spam result. |

### 3.5 Dashboard

| ID | Requirement |
|---|---|
| FR-5.1 | Show total scans, threats detected and counts per scan type. |
| FR-5.2 | Show charts: threats versus clean results and scans per type. |
| FR-5.3 | Show the most recent scans. |

### 3.6 Scan History

| ID | Requirement |
|---|---|
| FR-6.1 | Every scan shall be saved to SQLite with timestamp, type, input summary, verdict, score and details. |
| FR-6.2 | The history page shall list, filter by type, and let the user view details of a past scan. |
| FR-6.3 | The user shall be able to clear history. |

### 3.7 Model Evaluation

| ID | Requirement |
|---|---|
| FR-7.1 | The system shall display accuracy, precision, recall, F1 and the confusion matrix read from the metrics file produced at training time. |
| FR-7.2 | The page shall state dataset size, split ratio and known limitations. |

### 3.8 Supporting Features

| ID | Requirement |
|---|---|
| FR-8.1 | One-click safe sample inputs for each scanner. |
| FR-8.2 | A security awareness page with practical tips. |
| FR-8.3 | Optional: export a scan result as a PDF report. |

## 4. External Interface Requirements

### 4.1 User Interface
- Dark theme with blue-purple gradients, sidebar navigation, icons, cards, animated loaders, charts
- Responsive from phone to desktop widths
- Clear error messages in the interface, never raw stack traces

### 4.2 REST API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/scan/spam` | Classify a message |
| POST | `/api/scan/url` | Analyze a URL |
| POST | `/api/scan/file` | Analyze an uploaded file (multipart) |
| GET | `/api/history` | List scans (optional type filter) |
| GET | `/api/history/{id}` | Single scan detail |
| DELETE | `/api/history` | Clear history |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/model/metrics` | Model evaluation metrics |
| GET | `/api/health` | Service and model status |

### 4.3 Data Model (SQLite)

**Table `scans`**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| scan_type | TEXT | spam, url, file |
| input_summary | TEXT | Truncated input or file name |
| verdict | TEXT | e.g. Spam, Genuine, High Risk |
| risk_score | REAL | 0 to 100 |
| confidence | REAL | Nullable, ML only |
| method | TEXT | ml, rule-based, metadata |
| details_json | TEXT | Indicators and recommendations |
| created_at | TIMESTAMP | UTC |

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Spam and URL scans respond in under 1 second; file scans under 3 seconds for 10 MB |
| NFR-2 | Security | Files never executed; random temp filenames; size limit; input length limits; parameterized SQL; CORS limited to the local frontend |
| NFR-3 | Privacy | Data stays local; only file metadata and hash stored, not file contents |
| NFR-4 | Reliability | Invalid input returns HTTP 4xx with a clear message; backend reports if the model file is missing |
| NFR-5 | Usability | A first-time user completes a scan in under 30 seconds |
| NFR-6 | Portability | Setup with `pip install -r requirements.txt` and `npm install` |
| NFR-7 | Honesty | No scanner outputs "100% safe"; each result names its detection method |
| NFR-8 | Maintainability | Separate router, service and schema modules; typed frontend (TypeScript) |

## 6. System Models

### 6.1 Spam scan sequence
1. User submits text in the React page.
2. Frontend validates length and calls `POST /api/scan/spam`.
3. Backend vectorizes text with the saved TF-IDF and predicts with Logistic Regression.
4. Backend adds top contributing terms and recommendations.
5. Result is saved to SQLite and returned.
6. Frontend animates the result card and updates the dashboard data.

### 6.2 Risk level mapping (URL)

| Score | Level |
|---|---|
| 0 – 29 | Low |
| 30 – 59 | Medium |
| 60 – 100 | High |

## 7. Testing and Acceptance

| ID | Test | Expected result |
|---|---|---|
| T1 | Obvious prize-scam SMS | Classified as Spam |
| T2 | Casual friendly SMS | Classified as Genuine |
| T3 | Empty message | Validation error, no scan saved |
| T4 | `http://192.168.1.5/login@verify-account.example` (demo string, not visited) | High risk, multiple indicators |
| T5 | `https://www.wikipedia.org` | Low risk |
| T6 | Malformed URL | Validation error |
| T7 | Harmless `.txt` file | Correct size, type and SHA-256; no obvious red flags |
| T8 | A text file renamed to `.pdf` | Extension/signature mismatch flagged |
| T9 | File above size limit | Rejected with clear message |
| T10 | Run several scans | Dashboard counts and history match exactly |
| T11 | Evaluation page | Metrics match `metrics.json` from training |
| T12 | Backend started without model file | Clear error telling the user to run the training script |

Automated tests use pytest for the analyzers and the model; the rest are manual demo checks.

## 8. Limitations

- Spam model is trained on an older English SMS dataset.
- URL rules are heuristic and can produce false positives and false negatives.
- File analysis checks metadata only and cannot detect malicious content.
- No external threat-intelligence lookups.
- Single-user local deployment with no authentication.

## 9. Future Enhancements

- Trained URL classifier and larger spam corpora
- Malware hash reputation lookup
- Email header and attachment analysis
- Multilingual and transformer-based models
- Authentication, Docker and cloud deployment

## 10. Requirement Traceability

| PRD feature | SRS requirements |
|---|---|
| F1 Spam detection | FR-1.1 to FR-1.7 |
| F2 URL analysis | FR-2.1 to FR-2.6 |
| F3 File analysis | FR-3.1 to FR-3.6 |
| F4 Explainability | FR-4.1, FR-4.2 |
| F5 History | FR-6.1 to FR-6.3 |
| F6 Dashboard | FR-5.1 to FR-5.3 |
| F9 Evaluation | FR-7.1, FR-7.2 |
| F8, F10, F12 | FR-8.1 to FR-8.3 |
