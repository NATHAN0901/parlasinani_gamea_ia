#!/usr/bin/env python
"""
train_all_subsets.py
--------------------
• Recorre data/processed/catN/ que contengan train/val/test.csv
• Entrena un clasificador de sub‑categorías por carpeta
• Guarda el modelo en nlp_service/models/subcategory_N/
"""
import subprocess, pathlib, sys, re, csv

BASE        = pathlib.Path(__file__).resolve().parents[1]
PROCESSED   = BASE / "data" / "processed"
MODEL_ROOT  = BASE / "nlp_service" / "models"
TRAIN_MOD   = "nlp_service.train"            # ← módulo ya existente

# ---- helpers -----------------------------------------------------------------
def cat_number(path: pathlib.Path) -> str:
    """Extrae N de catN/"""
    m = re.search(r"cat(\d+)", path.name, re.I)
    return m.group(1) if m else "X"

def csv_has_rows(csv_path: pathlib.Path, min_rows=10) -> bool:
    try:
        with csv_path.open(encoding="utf8") as f:
            return sum(1 for _ in csv.reader(f)) - 1 >= min_rows
    except FileNotFoundError:
        return False

# ------------------------------------------------------------------------------
for cat_dir in sorted(PROCESSED.glob("cat*")):
    n        = cat_number(cat_dir)
    traincsv = cat_dir / "train.csv"
    if not csv_has_rows(traincsv):
        print(f"alerta  cat{n} sin datos suficientes; se omite.")
        continue

    out_dir  = MODEL_ROOT / f"subcategory_{n}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"📚  Entrenando sub‑modelo cat{n} …")
    cmd = [
        sys.executable, "-m", TRAIN_MOD,
        "--csv-dir",   str(cat_dir),
        "--out-dir",   str(out_dir),
        "--label-col", "subcategory",          
        "--epochs",    "4",
        "--batch",     "8",
        "--model-name","distilbert-base-multilingual-cased"
    ]
    if subprocess.call(cmd):
        sys.exit(f"❌  Falló el entrenamiento de cat{n}")

print("ok  Todos los modelos B entrenados")
