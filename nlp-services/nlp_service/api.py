# nlp_service/api.py
import os, json, pathlib
from typing import Optional, Dict, Any
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ────────────────────────────────────────────────────────────────────
# Rutas base
# ────────────────────────────────────────────────────────────────────
BASE = pathlib.Path(__file__).resolve().parents[1]
MODELS_DIR = BASE / "nlp_service" / "models"
CAT_BASE   = MODELS_DIR / "category_classifier"

# ────────────────────────────────────────────────────────────────────
# Utilidades
# ────────────────────────────────────────────────────────────────────
def resolve_model_dir(base: pathlib.Path) -> Optional[pathlib.Path]:
    """
    Si no hay config.json en la raíz del out_dir, usa el mejor checkpoint-XX.
    """
    if (base / "config.json").exists():
        return base
    cpts = [base / d for d in os.listdir(base) if str(d).startswith("checkpoint-")]
    if not cpts:
        return None
    def _num(p: pathlib.Path) -> int:
        try:
            return int(str(p).split("-")[-1])
        except Exception:
            return -1
    return max(cpts, key=_num)

def load_json_guess(path: pathlib.Path) -> Dict[str, Any]:
    """
    Carga JSON probando varios encodings comunes en Windows.
    Normaliza claves a str.
    """
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            with open(path, encoding=enc) as f:
                data = json.load(f)
            return {str(k): v for k, v in data.items()}
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"No pude decodificar {path}. Regrábalo como UTF-8.")

def softmax(x: torch.Tensor) -> torch.Tensor:
    e = torch.exp(x - torch.max(x))
    return e / e.sum(dim=-1, keepdim=True)

# ────────────────────────────────────────────────────────────────────
# Carga Modelo A (Categoría)
# ────────────────────────────────────────────────────────────────────
cat_dir = resolve_model_dir(CAT_BASE)
if not cat_dir:
    raise RuntimeError(f"No encontré modelo de categorías en {CAT_BASE}")

tok_cat = AutoTokenizer.from_pretrained(str(cat_dir))
mdl_cat = AutoModelForSequenceClassification.from_pretrained(str(cat_dir)).eval()

# label_map.json puede estar en la raíz del out_dir o en el checkpoint
id2cat: Dict[str, Any] = {}
for cand in (CAT_BASE / "label_map.json", cat_dir / "label_map.json"):
    if cand.exists():
        id2cat = load_json_guess(cand)
        break

# ────────────────────────────────────────────────────────────────────
# Cache de Modelos B (Subcategoría)
# ────────────────────────────────────────────────────────────────────
SUB_CACHE: Dict[int, Any] = {}

def load_sub_model(cat_id: int):
    """
    Carga perezosa del modelo de subcategoría según cat_id.
    Busca en nlp_service/models/subcategory_{cat_id} y, si solo hay checkpoints,
    elige el de mayor número.
    """
    base = MODELS_DIR / f"subcategory_{cat_id}"
    model_dir = resolve_model_dir(base)
    if not model_dir:
        return None
    if cat_id in SUB_CACHE:
        return SUB_CACHE[cat_id]

    tok  = AutoTokenizer.from_pretrained(str(model_dir))
    mdl  = AutoModelForSequenceClassification.from_pretrained(str(model_dir)).eval()

    id2sub: Dict[str, Any] = {}
    for cand in (base / "label_map.json", model_dir / "label_map.json"):
        if cand.exists():
            id2sub = load_json_guess(cand)
            break

    SUB_CACHE[cat_id] = (tok, mdl, id2sub)
    return SUB_CACHE[cat_id]

# ────────────────────────────────────────────────────────────────────
# FastAPI + CORS (desarrollo)
# ────────────────────────────────────────────────────────────────────
app = FastAPI(title="Clasificador Municipal (A: categoría, B: subcategoría)")

origins_dev = [
    "http://localhost:8000",  # Laravel Vite
    "http://localhost:5173",  # Vite
    "http://localhost:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_dev,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ────────────────────────────────────────────────────────────────────
# Schemas
# ────────────────────────────────────────────────────────────────────
class QueryCat(BaseModel):
    text: str

class QuerySub(BaseModel):
    text: str
    cat_id: int

# ────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True}

# después de cargar id2cat
idx2ext = {}
p = CAT_BASE / "idx2ext.json"
if p.exists():
    idx2ext = load_json_guess(p)

@app.post("/predict_category")
def predict_category(q: QueryCat):
    X = tok_cat(q.text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        probs = softmax(mdl_cat(**X).logits)[0]
    idx  = int(torch.argmax(probs))
    conf = float(probs[idx])
    name = id2cat.get(str(idx), str(idx))
    ext  = int(idx2ext.get(str(idx), idx + 1))   # fallback si falta el mapping

    return {
        "categoria": {
            "id_model": idx,     # índice interno del modelo (0..N-1)
            "id": ext,           # id EXTERNO (el que usa tu API municipal)
            "name": name,
            "confidence": round(conf, 4)
        }
    }


@app.post("/predict_subcategory")
def predict_subcategory(q: QuerySub):
    bundle = load_sub_model(q.cat_id)
    if not bundle:
        return {"error": f"No hay modelo de subcategoría para cat_id={q.cat_id}"}
    tok, mdl, id2sub = bundle

    X = tok(q.text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        logits = mdl(**X).logits
        probs = softmax(logits)[0]

    idx = int(torch.argmax(probs))
    conf = float(probs[idx])

    # Valor guardado en label_map.json para este índice
    raw_val = id2sub.get(str(idx), str(idx))

    # Si el valor es numérico -> es un ID externo de trámite; si no, es un nombre ya legible
    ext_id = None
    disp_name = None
    if isinstance(raw_val, (int, float)) or (isinstance(raw_val, str) and raw_val.isdigit()):
        ext_id = int(raw_val)
        # (Opcional) intentar resolver un nombre amigable leyendo un mapa local si existe:
        #  - busca data/raw/procedures/procedures_cat{q.cat_id}.json y mapea ext_id -> nombre
        try:
            import json, pathlib
            proc_file = BASE / "data" / "raw" / "procedures" / f"procedures_cat{q.cat_id}.json"
            if proc_file.exists():
                procs = json.load(open(proc_file, encoding="utf-8"))
                # intenta encontrar un nombre por alguna clave típica
                for item in procs:
                    if str(item.get("id")) == str(ext_id) or str(item.get("id_procedimiento")) == str(ext_id) or str(item.get("id_tramite")) == str(ext_id):
                        disp_name = item.get("nombre") or item.get("nombre_tramite") or item.get("nombre_procedimiento")
                        break
        except Exception:
            pass
    else:
        # ya tenemos un nombre legible en el label_map
        disp_name = str(raw_val)

    return {
        "subcategoria": {
            "id_model": idx,
            "ext_id": ext_id,
            "name": disp_name,             # puede ser None si no se pudo resolver
            "confidence": round(conf, 4)
        }
    }