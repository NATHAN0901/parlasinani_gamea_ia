#!/usr/bin/env python
import json, jsonschema, pathlib, sys

BASE = pathlib.Path(__file__).resolve().parents[1]
raw_file = BASE / "data" / "raw" / "train_v1.json"
schema   = BASE / "scripts" / "train_schema.json"

try:
    data = json.loads(raw_file.read_text(encoding="utf8"))
    jsonschema.validate(data, json.loads(schema.read_text()))
except jsonschema.exceptions.ValidationError as e:
    print("❌  ERROR de validación:", e.message)
    sys.exit(1)

print("✅  train_v1.json cumple el esquema.")
