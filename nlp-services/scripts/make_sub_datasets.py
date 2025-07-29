#!/usr/bin/env python
"""
make_sub_datasets.py
Genera train/val/test por categoría a partir de data/raw/sub_datasets/*.json
"""
import subprocess, pathlib, shutil, sys, re, csv

BASE      = pathlib.Path(__file__).resolve().parents[1]
RAW_DIR   = BASE / "data/raw/sub_datasets"
OUT_ROOT  = BASE / "data/processed"

clean_py  = BASE / "scripts/clean_text.py"
split_py  = BASE / "scripts/split_dataset.py"

def cat_number(path: pathlib.Path) -> str:
    m = re.search(r"sub_cat(\d+)\.json$", path.name, re.I)
    return f"cat{m.group(1)}" if m else "catX"

def run(cmd: list[str]) -> None:
    if subprocess.call(cmd) != 0:
        sys.exit(1)

def csv_has_rows(csv_path: pathlib.Path) -> bool:
    try:
        with csv_path.open(encoding="utf8") as f:
            return sum(1 for _ in csv.reader(f)) > 1          # header + ≥1 fila
    except FileNotFoundError:
        return False

def main() -> None:
    if not RAW_DIR.exists():
        sys.exit(f"{RAW_DIR} no existe; primero ejecuta build_sub_dataset.py")

    for json_file in sorted(RAW_DIR.glob("sub_cat*.json")):
        cat_folder = OUT_ROOT / cat_number(json_file)
        shutil.rmtree(cat_folder, ignore_errors=True)
        cat_folder.mkdir(parents=True, exist_ok=True)

        csv_path = cat_folder / "dataset.csv"

        # 1️⃣  Clean (ahora SÍ con --sub-mode)
        print(f"[clean] {json_file.name} → {csv_path.relative_to(BASE)}")
        run([
            sys.executable, clean_py,
            "-i", str(json_file),
            "-o", str(csv_path),
            "--sub-mode"
        ])

        if not csv_has_rows(csv_path):
            print(f"alerta  {csv_path.name} vacío; se omite split.\n")
            continue

        # 2️⃣  Split 80/10/10
        print(" [split] train/val/test …")
        run([
            sys.executable, split_py,
            "--csv", str(csv_path),
            
        ])

        print(f"  ✓ {cat_folder.relative_to(BASE)} listo\n")

    print("ok  Todos los catN contienen train/val/test.csv")

if __name__ == "__main__":
    main()
