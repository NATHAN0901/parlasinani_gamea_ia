#!/usr/bin/env python
"""
clean_text.py
-------------
Normaliza texto y lo pasa de JSON → CSV.

⚙️  Dos modos de entrada
-----------------------
1. **Modo maestro** (por defecto)  
   `train_v1.json`  → genera columnas:  text,category,subcategory

2. **Modo sub‑categoría** (`--sub-mode`)  
   `sub_catN.json`  → genera columnas:  text,subcategory
   (la subcategoría es el procedure_id zero‑padded)

Uso
~~~
# maestro
python scripts/clean_text.py -i data/raw/train_v1.json -o data/dataset_v07.csv

# sub‑dataset
python scripts/clean_text.py -i data/raw/sub_datasets/sub_cat1.json \
                             -o data/processed/cat1/dataset.csv   \
                             --sub-mode
"""
import re, json, csv, unicodedata, pathlib, argparse, sys

BASE = pathlib.Path(__file__).resolve().parents[1]

# ---------------- CLI ----------------
cli = argparse.ArgumentParser()
cli.add_argument("-i", "--input",  required=True, help="JSON fuente")
cli.add_argument("-o", "--output", required=True, help="CSV destino")
cli.add_argument("--sub-mode", action="store_true",
                 help="Procesa sub_cat*.json (guarda sólo subcategory)")
args = cli.parse_args()

INP  = pathlib.Path(args.input)
OUT  = pathlib.Path(args.output)
OUT.parent.mkdir(parents=True, exist_ok=True)

# -------------- helpers --------------
def norm(txt: str) -> str:
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()
    txt = re.sub(r"\s+", " ", txt).strip().lower()
    return txt

# -------------- carga JSON -----------
try:
    data = json.loads(INP.read_text(encoding="utf8"))
except Exception as e:
    sys.exit(f"error  No pude leer {INP}: {e}")

rows = []

if args.sub_mode:
    # ---------- modo sub‑cat ----------
    for proc in data:                              # lista de procedimientos
        sub_label = f"{proc['procedure_id']:04d}"  # e.g. 0015
        for q in proc.get("preguntas", []):
            if q.strip():
                rows.append({"text": norm(q),
                             "subcategory": sub_label})
else:
    # ---------- modo maestro ----------
    for cat in data["datos"]:
        for sub in cat["subcategorias"]:
            for q in sub.get("preguntas", []):
                if q.strip():
                    rows.append({
                        "text": norm(q),
                        "category": cat["categoria"],
                        "subcategory": sub["nombre"]
                    })

# -------------- guardar --------------
if not rows:
    print(f"  {INP.name} no contenía preguntas. Se omite.")
    sys.exit(0)

with OUT.open("w", encoding="utf8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)

print(f"ok  {OUT.relative_to(BASE)} generado con {len(rows)} filas.")
