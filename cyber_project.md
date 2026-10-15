# CyberShield AI – Product Requirements Document (PRD)

**Project:** CyberShield AI – AI-Powered Spam, Phishing & Malware Detection System
**Type:** BCA AI/ML college project competition entry
**Team:** 1 student developer
**Timeline:** 1 day (about 12 working hours), with a second day as buffer
**Version:** 1.0

## 1. Product Overview

CyberShield AI is a local web application that helps ordinary users check whether a message, URL or file looks dangerous. It combines three different detection approaches and labels each one honestly:

- **ML-based detection** for SMS or message spam (TF-IDF + Logistic Regression trained on the UCI SMS Spam Collection).
- **Rule-based analysis** for phishing URLs (transparent heuristics, not machine learning).
- **File metadata checks** for uploaded files (type, size, SHA-256 hash, extension and signature checks, never executed).

Every result shows a verdict, a risk score, the reasons behind it and safety recommendations.

## 2. Problem Statement

Spam, phishing links and malicious files are common attack paths for students and non-technical users. Most free tools give a verdict with no explanation, so users do not learn to spot threats themselves. CyberShield AI explains *why* something is suspicious and teaches safe behaviour.

## 3. Goals and Non-Goals

### Goals
1. Working end-to-end system: React frontend, FastAPI backend, trained scikit-learn model, SQLite storage.
2. Explainable results: indicators, scores and recommendations on every scan.
3. Honest security claims: never state that something is "100% safe".
4. Easy to run locally with a few commands.
5. Impressive, professional demo for judges.

### Non-Goals
- No real antivirus engine, malware sandboxing or signature database.
- No live threat-intelligence feeds or paid APIs.
- No user accounts, authentication or multi-user cloud deployment.
- No claim of production-grade protection.

## 4. Target Users

| Persona | Need |
|---|---|
| Student / general user | Quickly check a suspicious SMS, link or download |
| Competition judge | See a working ML pipeline, metrics and clear explanations |
| Developer / teacher | Read clean code, architecture and documentation |

## 5. Features and Priorities

### P0 – Must have (Day 1 morning to afternoon)

| ID | Feature | Acceptance criteria |
|---|---|---|
| F1 | Spam detection | Model trained on the UCI SMS Spam Collection; returns label, spam probability, confidence and top contributing words |
| F2 | Phishing URL analysis | Rule-based checks return risk level (Low / Medium / High), score 0–100 and a list of triggered reasons |
| F3 | File safety analysis | Upload returns file name, size, detected type, SHA-256, extension/signature mismatch and risk flags; file is never executed |
| F4 | Explainability | Each result page lists indicators and recommendations |
| F5 | Scan history | Every scan saved to SQLite and listed with type, input summary, verdict, score and time |
| F6 | Dashboard | Total scans, threats found, per-type breakdown, charts, recent scans |
| F7 | Input validation and errors | Empty input, oversized files and bad URLs return clear messages; no crashes |

### P1 – Should have (Day 1 evening)

| ID | Feature | Acceptance criteria |
|---|---|---|
| F8 | Sample inputs | One-click safe demo examples for each scanner |
| F9 | Model evaluation page | Shows accuracy, precision, recall, F1 and confusion matrix from the real test split |
| F10 | Security awareness section | Tips on phishing, spam and safe downloads |
| F11 | Premium UI | Dark theme, blue-purple gradients, sidebar, icons, animations, loading states, responsive layout |

### P2 – Nice to have (Day 2 buffer)

| ID | Feature |
|---|---|
| F12 | PDF report export of a scan |
| F13 | Delete history / clear all |
| F14 | Automated tests (pytest) for the model, URL rules and file checks |

## 6. Detection Design Summary

### 6.1 Spam detection (ML)
- Dataset: UCI SMS Spam Collection (about 5,574 labelled messages, spam vs ham).
- Pipeline: text cleaning, TF-IDF vectorizer, Logistic Regression with class weighting.
- Evaluation: stratified train/test split, accuracy, precision, recall, F1, confusion matrix saved as JSON.
- Explanation: highest-weight TF-IDF terms present in the message.
- Label this clearly as **ML-based**. Confidence is the model's predicted probability, not a guarantee.

### 6.2 URL analysis (rule-based)
Checks include: IP address as host, very long URL, many subdomains, `@` symbol, excessive hyphens, missing HTTPS, suspicious keywords (login, verify, update, secure), URL shorteners, punycode, suspicious TLDs, and brand names appearing outside the real domain. Each rule adds to a score; the score maps to a risk level. Labelled **rule-based, not ML**.

### 6.3 File analysis (metadata only)
Checks include: size, extension, MIME type, magic-byte signature, extension-versus-signature mismatch, double extensions, risky extensions (.exe, .js, .bat, .scr, .vbs, .ps1, macro-enabled Office files), and SHA-256. Files are read as bytes only and never opened or run. The result is worded as "no obvious red flags found", never "safe".

## 7. User Flow

1. User opens the dashboard and sees statistics and recent scans.
2. User chooses Spam, URL or File scanner from the sidebar.
3. User enters input or clicks a sample.
4. A loading animation plays while the backend processes the request.
5. The result screen shows verdict, risk score, indicators and recommendations.
6. The scan is stored and appears in history and dashboard charts.

## 8. Success Metrics

| Metric | Target |
|---|---|
| Spam model accuracy on held-out test set | Report the real measured value (typically high 90s %); do not hard-code |
| Features working end to end | 100% of P0 |
| Setup time on a fresh machine | Under 15 minutes |
| Demo length | 5–7 minutes without errors |
| Fake or hard-coded predictions | Zero |

## 9. One-Day Delivery Plan

| Time | Task |
|---|---|
| Hour 1 | Project setup, folder structure, install dependencies |
| Hours 2–3 | Dataset download, train and evaluate spam model, save artifacts |
| Hours 4–5 | FastAPI endpoints, SQLite schema, URL and file analyzers |
| Hours 6–8 | React app: layout, scanners, result screens, API connection |
| Hours 9–10 | Dashboard, charts, history, evaluation page |
| Hour 11 | Polish: animations, samples, awareness page, error handling |
| Hour 12 | README, tests, rehearse demo |
| Day 2 buffer | PDF export, extra tests, presentation practice |

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Not enough time | Strict P0, P1, P2 order; cut P2 first |
| Dataset download problems | Document the manual download link and exact file path |
| Judges question accuracy | Show real confusion matrix and state limitations openly |
| URL rules produce false positives | Show reasons so users can judge; state it is heuristic |
| Unsafe file handling | Read bytes only, size cap, random temp names, delete after hashing |

## 11. Limitations (to state openly)

- The SMS dataset is English and older; it may not match modern phishing text.
- URL rules are heuristics and can miss new attacks or flag legitimate sites.
- File checks cannot detect real malware content; they only check metadata and hash.
- No reputation or threat-intelligence lookup.

## 12. Future Improvements

- ML model for URLs trained on a labelled phishing dataset.
- Hash lookup against a malware reputation service.
- Email header and attachment analysis.
- Multilingual spam detection and transformer models.
- User accounts, browser extension, Docker deployment.

## 13. Proposed Folder Structure

```
cybershield-ai/
├── README.md
├── docs/
│   ├── PRD.md
│   └── SRS.md
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── schemas.py
│   │   ├── routers/ (spam.py, url.py, file.py, history.py, stats.py)
│   │   └── services/ (spam_service.py, url_analyzer.py, file_analyzer.py)
│   ├── ml/
│   │   ├── train_spam_model.py
│   │   ├── data/SMSSpamCollection
│   │   └── models/ (spam_model.joblib, metrics.json)
│   └── tests/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx, App.tsx
        ├── api/client.ts
        ├── components/ (Sidebar, ResultCard, RiskMeter, Loader, Charts)
        └── pages/ (Dashboard, SpamScan, UrlScan, FileScan, History, Evaluation, Awareness)
```
