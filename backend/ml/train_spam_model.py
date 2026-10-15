import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "SMSSpamCollection"
MODEL_DIR = ROOT / "ml" / "models"


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset not found: {DATA_PATH}. Download the UCI SMS Spam Collection and place its SMSSpamCollection file there.")
    dataset = pd.read_csv(DATA_PATH, sep="\t", header=None, names=["label", "message"], encoding="latin-1")
    train_x, test_x, train_y, test_y = train_test_split(dataset.message, dataset.label, test_size=0.2, random_state=42, stratify=dataset.label)
    model = Pipeline([("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=2)), ("classifier", LogisticRegression(class_weight="balanced", max_iter=1000))])
    model.fit(train_x, train_y)
    predictions = model.predict(test_x)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_DIR / "spam_model.joblib")
    metrics = {"dataset_size": len(dataset), "train_size": len(train_x), "test_size": len(test_x), "split": "80/20 stratified", "accuracy": accuracy_score(test_y, predictions), "precision": precision_score(test_y, predictions, pos_label="spam"), "recall": recall_score(test_y, predictions, pos_label="spam"), "f1": f1_score(test_y, predictions, pos_label="spam"), "confusion_matrix": confusion_matrix(test_y, predictions, labels=["ham", "spam"]).tolist(), "limitations": "Older English SMS dataset; results do not guarantee detection of modern scams."}
    (MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Model and metrics saved under {MODEL_DIR}")


if __name__ == "__main__":
    main()