#!/usr/bin/env python
import pandas as pd, pathlib, sklearn.model_selection as sk

BASE = pathlib.Path(__file__).resolve().parents[1]
df   = pd.read_csv(BASE / "data" / "dataset_v07.csv")

train, tmp = sk.train_test_split(df, test_size=0.2, stratify=df["category"], random_state=42)
val, test  = sk.train_test_split(tmp, test_size=0.5, stratify=tmp["category"], random_state=42)

PROC = BASE / "data" / "processed"
PROC.mkdir(parents=True, exist_ok=True)
train.to_csv(PROC/"train.csv", index=False)
val.to_csv(PROC/"val.csv",   index=False)
test.to_csv(PROC/"test.csv", index=False)
print("✅  Split 80/10/10 guardado en data/processed/")
