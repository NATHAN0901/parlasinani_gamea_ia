#!/usr/bin/env python
"""Descarga /procedures/<cat_id>/category y guarda JSON por categoría."""
import requests, json, pathlib, shutil, tqdm, time

BASE = pathlib.Path(__file__).resolve().parents[1]
RAW_DIR = BASE / "data" / "raw" / "procedures"
RAW_DIR.mkdir(parents=True, exist_ok=True)

API_ROOT = "http://ciudadania.elalto.gob.bo/api/procedures"
CAT_IDS = range(1, 9)   # deberia ser 1, 24 actualizar si cambian categorías

# Limpieza previa
shutil.rmtree(RAW_DIR)
RAW_DIR.mkdir()

for cat_id in tqdm.tqdm(CAT_IDS, desc="Descargando procedimientos"):
    url = f"{API_ROOT}/{cat_id}/category"
    try:
        data = requests.get(url, timeout=30).json()
    except Exception as e:
        print(f"⚠️  Error cat {cat_id}: {e}")
        continue

    (RAW_DIR / f"procedures_cat{cat_id}.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf8"
    )
    time.sleep(0.3)  # gentileza con el servidor

print("✅  Descarga completada →", RAW_DIR)