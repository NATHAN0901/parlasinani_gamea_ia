#!/usr/bin/env python
import typer, json, pathlib
from datasets import load_dataset
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding,            # ← nuevo
)
from nlp_service.utils import classification_metrics

app = typer.Typer(add_completion=False)
BASE = pathlib.Path(__file__).resolve().parents[1]


@app.command()
def run(
    csv_dir: str = "data/processed",
    out_dir: str = "nlp_service/models/category_classifier",
    epochs: int = 4,
    batch: int = typer.Option(16, help="Batch por GPU/CPU"),
    lr: float = 2e-5,
):
    # ---------- 1) cargar dataset CSV -------------------------------------------------
    csv_path = BASE / csv_dir
    ds = load_dataset(
        "csv",
        data_files={k: str(csv_path / f"{k}.csv") for k in ("train", "val", "test")},
    )

    # ---------- 2) mapear etiquetas ---------------------------------------------------
    cats = sorted(set(ds["train"]["category"]))
    cat2id = {c: i for i, c in enumerate(cats)}
    id2cat = {i: c for c, i in cat2id.items()}
    (BASE / out_dir).mkdir(parents=True, exist_ok=True)
    json.dump(id2cat, open(BASE / out_dir / "label_map.json", "w"))

    ds = ds.map(lambda x: {"label": cat2id[x["category"]]})
    ds = ds.remove_columns(["category", "subcategory"])

    # ---------- 3) tokenización + padding dinámico ------------------------------------
    tok = DistilBertTokenizerFast.from_pretrained("distilbert-base-multilingual-cased")
    data_collator = DataCollatorWithPadding(tokenizer=tok)

    ds = ds.map(lambda x: tok(x["text"], truncation=True), batched=True)
    ds.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])

    # ---------- 4) modelo -------------------------------------------------------------
    model = DistilBertForSequenceClassification.from_pretrained(
        "distilbert-base-multilingual-cased", num_labels=len(cats)
    )

    # ---------- 5) argumentos de entrenamiento ----------------------------------------
    args = TrainingArguments(
        output_dir=str(BASE / out_dir),
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
    )

    # ---------- 6) Trainer ------------------------------------------------------------
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=ds["train"],
        eval_dataset=ds["val"],
        compute_metrics=classification_metrics,
        tokenizer=tok,
        data_collator=data_collator,     # ← padding dinámico aquí
    )

    trainer.train()
    metrics = trainer.evaluate(ds["test"])

    json.dump(metrics, open(BASE / out_dir / "metrics.json", "w"), indent=2)
    model.save_pretrained(BASE / out_dir)
    tok.save_pretrained(BASE / out_dir)
    print("🏁 Entrenamiento completado – métricas:", metrics)


if __name__ == "__main__":
    app()
