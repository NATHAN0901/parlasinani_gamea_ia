from sklearn.metrics import accuracy_score, f1_score
import numpy as np

def classification_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy":     accuracy_score(labels, preds),
        "f1_macro":     f1_score(labels, preds, average="macro"),
        "f1_weighted":  f1_score(labels, preds, average="weighted")
    }
