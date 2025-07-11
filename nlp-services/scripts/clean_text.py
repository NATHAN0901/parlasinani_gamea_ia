#!/usr/bin/env python
import re, json, unicodedata, csv, pathlib

BASE = pathlib.Path(__file__).resolve().parents[1]
RAW  = BASE / "data" / "raw" / "train_v1.json"
OUT  = BASE / "data" / "dataset_v07.csv"

def normalize(txt):
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()
    txt = re.sub(r"\s+", " ", txt).strip().lower()
    return txt

data = json.loads(RAW.read_text(encoding="utf-8"))  

rows = []
for cat_block in data["datos"]:          # 👈  ahora dentro de "datos"
    cat = cat_block["categoria"]
    for sub in cat_block["subcategorias"]:
        for q in sub["preguntas"]:
            rows.append({
                "text": normalize(q),
                "category": cat,
                "subcategory": sub["nombre"]
            })

with OUT.open("w", newline="", encoding="utf8") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)

print("✅  dataset_v07.csv generado con", len(rows), "filas.")
