#!/usr/bin/env python
"""
nlp_service/train.py
====================
Fine‑tune de clasificadores de texto con 🤗 Transformers.

✔  Sirve para:
    • Modelo A  – clasificar **categorías**      (label_col = category)
    • Modelos B – clasificar **trámites**        (label_col = subcategory)

✔  Argumentos principales
    --csv-dir     Carpeta con  train.csv / val.csv / test.csv
    --out-dir     Carpeta donde se guardará el modelo
    --label-col   Columna que contiene la etiqueta (category | subcategory …)
    --model-name  Modelo base HF (por defecto MiniLM multilingüe)

✔  Salida
    · config.json, pytorch_model.bin, tokenizer files
    · label_map.json  (id ↔ etiqueta)
    · metrics.json    (métricas del split *test*)
"""

from __future__ import annotations
import json, pathlib, sys, typer
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    DataCollatorWithPadding,
    TrainingArguments,
    Trainer,
)

# métrica propia que ya tenías
from nlp_service.utils import classification_metrics
from transformers import EarlyStoppingCallback

import torch, os
torch.set_num_threads(8)
torch.set_num_interop_threads(2)  # evita sobre-saturar
os.environ.setdefault("TOKENIZERS_PARALLELISM", "true")

app  = typer.Typer(add_completion=False)
BASE = pathlib.Path(__file__).resolve().parents[1]


@app.command()
def run(
    csv_dir:   str = "data/processed/category_dataset",
    out_dir:   str = "nlp_service/models/category_classifier",
    label_col: str = "category",
    epochs:    int = 5,
    batch:     int = typer.Option(16, help="Batch size por dispositivo"),
    lr:        float = 2e-5,
    model_name: str = "microsoft/MiniLM-L12-H384-uncased",
):
    # ───────────────────────── 1) cargar CSVs ──────────────────────────
    csv_path = BASE / csv_dir
    files = {k: str(csv_path / f"{k}.csv") for k in ("train", "val", "test")}
    if not all(pathlib.Path(p).exists() for p in files.values()):
        typer.echo(f"❌  Faltan uno o más CSV en {csv_path}", err=True)
        sys.exit(1)

    ds = load_dataset("csv", data_files=files)

    # ───────────────── 2) verificar columna de etiqueta ────────────────
    if label_col not in ds["train"].column_names:
        typer.echo(
            f"❌  '{label_col}' no está en el dataset. "
            f"Columnas disponibles: {ds['train'].column_names}",
            err=True,
        )
        sys.exit(1)

    # ───────────────── 3) mapear etiquetas <→ id numérico ─────────────
    labels     = sorted(set(ds["train"][label_col]))
    label2id   = {lbl: i for i, lbl in enumerate(labels)}
    id2label   = {i: lbl for lbl, i in label2id.items()}

    out_path = BASE / out_dir
    out_path.mkdir(parents=True, exist_ok=True)
    json.dump(id2label, open(out_path / "label_map.json", "w", encoding="utf8"),
              ensure_ascii=False, indent=2)

    # añade columna numérica
    ds = ds.map(lambda x: {"label": label2id[x[label_col]]})

    # quita columnas sobrantes (¡sin duplicados!)
    cols_to_drop = list(
        {c for c in (label_col, "category", "subcategory")
         if c in ds["train"].column_names}
    )
    for split in ds.keys():            # train / val / test
        ds[split] = ds[split].remove_columns(cols_to_drop)

    # ───────────────── 4) tokenización + padding dinámico ──────────────
    tok            = AutoTokenizer.from_pretrained(model_name)
    data_collator  = DataCollatorWithPadding(tokenizer=tok)
    ds             = ds.map(lambda x: tok(x["text"], truncation=True), batched=True)
    ds.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])

    # ───────────────── 5) modelo base ──────────────────────────────────
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(labels),
        id2label=id2label,
        label2id=label2id,
    )

    # ───────────────── 6) argumentos de entrenamiento ──────────────────
    args = TrainingArguments(
        output_dir=str(out_path),
        evaluation_strategy="epoch",
        save_strategy="epoch",
        learning_rate=lr,
        per_device_train_batch_size=batch,
        per_device_eval_batch_size=batch,
        num_train_epochs=epochs,
        load_best_model_at_end=True,
        metric_for_best_model="f1_weighted",
        save_total_limit=1,
        seed=42,
        dataloader_num_workers=4,  # prueba 4–8
        logging_steps=100,
        report_to="none",          # desactiva WandB/TensorBoard
    )

    # ───────────────── 7) entrenar ─────────────────────────────────────
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=ds["train"],
        eval_dataset=ds["val"],
        tokenizer=tok,
        data_collator=data_collator,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
        compute_metrics=classification_metrics,
    )

    trainer.train()
    metrics = trainer.evaluate(ds["test"])

    # ───────────────── 8) guardar artefactos ───────────────────────────
    json.dump(metrics, open(out_path / "metrics.json", "w", encoding="utf8"),
              ensure_ascii=False, indent=2)
    model.save_pretrained(out_path)
    tok.save_pretrained(out_path)

    print("🏁  Entrenamiento completado – métricas:", metrics)


if __name__ == "__main__":
    app()
