#!/usr/bin/env python
"""Construye sub_datasets/*.json combinando preguntas + id + nombre."""
import json
import pathlib
import shutil
import tqdm
import argparse

# --- Configuración base ---
BASE = pathlib.Path(__file__).resolve().parents[1]
PROCS_DIR = BASE / "data/raw/procedures"
QUESTIONS_MASTER = BASE / "data/raw/train_v1.json"
OUT_DIR = BASE / "data/raw/sub_datasets"

# --- Argumentos ---
parser = argparse.ArgumentParser()
parser.add_argument("--debug", action="store_true", help="Mostrar claves del índice")
args = parser.parse_args()

# --- Mapeo fijo de cat_id a nombre de categoría ---
cat_names = {
    1: "ACTIVIDAD ECONÓMICA Y PUBLICIDAD",
    2: "VEHÍCULOS",
    3: "INMUEBLES",
    5: "ADMINISTRACIÓN TERRITORIAL",
    7: "DISCAPACIDAD",
    8: "VIALIDAD",
    # Agrega más si tienes más categorías
}

# --- Preparar salida ---
shutil.rmtree(OUT_DIR, ignore_errors=True)
OUT_DIR.mkdir(parents=True)

# --- Índice de preguntas: (cat_name, sub_name) → preguntas ---
q_data = json.loads(QUESTIONS_MASTER.read_text(encoding="utf8"))
index = {}
for cat in q_data["datos"]:
    for sub in cat["subcategorias"]:
        clave = (cat["categoria"].strip().upper(), sub["nombre"].strip().upper())
        index[clave] = sub.get("preguntas", [])

if args.debug:
    print("🔍 Claves disponibles en el índice:")
    for k in sorted(index.keys()):
        print("→", k)

# --- Procesar cada archivo de procedimientos ---
for proc_file in tqdm.tqdm(sorted(PROCS_DIR.glob("procedures_cat*.json"))):
    cat_id = int(proc_file.stem.split("cat")[-1])
    cat_name = cat_names.get(cat_id, "").strip().upper()

    proc_json = json.loads(proc_file.read_text(encoding="utf8"))
    out_blocks = []

    for proc in proc_json.get("procedures", []):
        sub_name = proc["nombre_tramite"].strip().upper()
        key = (cat_name, sub_name)
        preguntas = index.get(key, [])

        if not preguntas:
            print(f"⚠️  Sin preguntas para {key}")
            if args.debug:
                print("  ↳ Procedimiento:", proc)
            continue

        out_blocks.append({
            "procedure_id": proc["id"],
            "nombre": proc["nombre_tramite"],
            "preguntas": preguntas
        })

    out_path = OUT_DIR / f"sub_cat{cat_id}.json"
    out_path.write_text(json.dumps(out_blocks, indent=2, ensure_ascii=False), encoding="utf8")

print("✅  sub_datasets creados en", OUT_DIR)
