import joblib
import numpy as np
import re
from typing import List, Dict, Tuple
from app.config import MODEL_PATH

class HMMSequenceClassifier:
    def __init__(self, model_path: str = MODEL_PATH):
        artifacts = joblib.load(model_path)
        self.labels = artifacts["labels"]
        self.label_to_idx = {label: idx for idx, label in enumerate(self.labels)}
        self.vectorizer = artifacts["vectorizer"]
        self.priors = artifacts["priors"]
        self.transition_matrix = artifacts["transition_matrix"]
        self.log_emission_probs = artifacts["log_emission_probs"]

    def _clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
        return text.strip()

    def predict(self, text: str, previous_emotion: str | None = None) -> Tuple[str, float, List[Dict[str, float]]]:
        cleaned = self._clean_text(text)
        features = self.vectorizer.transform([cleaned]).toarray().ravel()

        # Calculate Log Emission Likelihood log P(W | S_i)
        active_indices = np.where(features > 0)[0]
        if len(active_indices) > 0:
            log_likelihoods = (self.log_emission_probs[:, active_indices] * features[active_indices]).sum(axis=1)
        else:
            log_likelihoods = np.zeros(len(self.labels))

        # Calculate Transition Probability P(S_t | S_{t-1})
        if previous_emotion and previous_emotion in self.label_to_idx:
            prev_idx = self.label_to_idx[previous_emotion]
            trans_probs = self.transition_matrix[prev_idx]
        else:
            trans_probs = self.priors

        # Combine Prior/Transition and Likelihood
        log_prior_trans = np.log(trans_probs + 1e-12)
        unnormalized_log_posteriors = log_prior_trans + log_likelihoods

        # Softmax normalization for confidence scoring
        max_log = np.max(unnormalized_log_posteriors)
        exp_scores = np.exp(unnormalized_log_posteriors - max_log)
        probabilities = exp_scores / np.sum(exp_scores)

        best_idx = int(np.argmax(probabilities))
        predicted_emotion = self.labels[best_idx]
        confidence = float(probabilities[best_idx])

        # Top candidate sequence list
        sequence_rankings = [
            {"emotion": self.labels[i], "score": round(float(probabilities[i]), 4)}
            for i in np.argsort(probabilities)[::-1][:5]
        ]

        return predicted_emotion, round(confidence, 4), sequence_rankings