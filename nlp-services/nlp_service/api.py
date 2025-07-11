from fastapi import FastAPI
from pydantic import BaseModel
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
import torch, json, pathlib

BASE = pathlib.Path(__file__).resolve().parents[1]
MODEL_DIR = BASE / "nlp_service" / "models" / "category_classifier"

tok   = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
id2cat = json.load(open(MODEL_DIR/"label_map.json"))

app = FastAPI(title="Clasificador de Categorías")

class Query(BaseModel):
    text: str

@app.post("/predict")
def predict(q: Query):
    inputs = tok(q.text, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    pred = int(torch.argmax(logits, 1))
    return {"categoria": id2cat[str(pred)]}
