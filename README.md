# CyberShield AI

Local app for explainable SMS spam, suspicious URL, and file metadata screening.

## Requirements

- Python 3.11 recommended
- Node.js supported by Vite 8

## Run locally

From the project root in PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm install
cd ..
```

Start the API in one terminal:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev -- --port 5173
```

Open <http://127.0.0.1:5173/> and create a local account. The project ZIP includes the trained spam model and evaluation metrics. To retrain, download the UCI SMS Spam Collection and put its `SMSSpamCollection` file at `backend/ml/data/SMSSpamCollection`, then run from `backend`:

```powershell
..\.venv\Scripts\python.exe ml\train_spam_model.py
```

Run checks:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run build
```

See [prd.md](prd.md) for product scope and [srs.md](srs.md) for detailed requirements and API contracts. CyberShield AI is an educational screening tool, not antivirus software; a low-risk result is not proof of safety.