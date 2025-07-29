#!/usr/bin/env python
"""
split_dataset.py
----------------
Parte un CSV en train / val / test (80 / 10 / 10 por defecto).

Detecta automáticamente la columna‑etiqueta:
• Si existe "subcategory"   → se usa esa
• Si no,        "category"
"""
import argparse, pathlib, sys, pandas as pd
from sklearn.model_selection import train_test_split

# ---------------- CLI ----------------
cli = argparse.ArgumentParser()
cli.add_argument("--csv",      required=True, help="CSV fuente")
cli.add_argument("--out-dir",                 help="Directorio salida")
cli.add_argument("--seed", type=int, default=42)
cli.add_argument("--ratio", nargs=3, type=float,
                 default=[0.8, 0.1, 0.1], metavar=("TRAIN","VAL","TEST"))
args = cli.parse_args()

csv_path = pathlib.Path(args.csv).resolve()
if not csv_path.exists():
    sys.exit(f"error  {csv_path} no existe")

out_dir = pathlib.Path(args.out_dir).resolve() if args.out_dir else csv_path.parent
out_dir.mkdir(parents=True, exist_ok=True)

if abs(sum(args.ratio) - 1.0) > 1e-3:
    sys.exit("error   --ratio debe sumar 1.0")

df = pd.read_csv(csv_path)
if len(df) < 10:
    sys.exit(f"alerta   {csv_path.name} tiene menos de 10 filas; no se parte.")

label_col = "subcategory" if "subcategory" in df.columns else "category"
if df[label_col].isna().any():
    sys.exit(f"error  Hay NaN en columna {label_col} de {csv_path.name}")

train_ratio, val_ratio, test_ratio = args.ratio
train, tmp = train_test_split(
    df,
    test_size=val_ratio + test_ratio,
    stratify=df[label_col],
    random_state=args.seed,
)

val, test = train_test_split(
    tmp,
    test_size=test_ratio / (val_ratio + test_ratio),
    stratify=tmp[label_col],
    random_state=args.seed,
)

train.to_csv(out_dir / "train.csv", index=False)
val.to_csv  (out_dir / "val.csv",   index=False)
test.to_csv (out_dir / "test.csv",  index=False)

print(f"✓ Split guardado en {out_dir.relative_to(csv_path.parent.parent)}  "
      f"(train={len(train)}, val={len(val)}, test={len(test)})")
