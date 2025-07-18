# nlp_service/api.py
import json, pathlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
)
import torch

BASE       = pathlib.Path(__file__).resolve().parents[1]
MODEL_DIR  = BASE / "nlp_service" / "models" / "category_classifier"

tok        = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
model      = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
id2cat     = json.load(open(MODEL_DIR / "label_map.json"))

app = FastAPI(title="Clasificador de Categorías v1")

# ─── CORS SOLO PARA DESARROLLO ──────────────────────────────────
origins_dev = [
    "http://localhost:8000",  # Laravel Vite
    "http://localhost:5173",  # Vite puro (por si usas otro puerto)
    "http://localhost:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_dev,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ─── Esquemas y endpoint ────────────────────────────────────────
class Query(BaseModel):
    text: str

@app.post("/predict")
def predict(q: Query):
    inputs = tok(q.text, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    pred = int(torch.argmax(logits, 1))
    return {"categoria": id2cat[str(pred)]}
