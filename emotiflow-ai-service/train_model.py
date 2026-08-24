import os
import re
import joblib
import numpy as np
import nltk
from nltk.tokenize import word_tokenize
from datasets import load_dataset
from sklearn.feature_extraction.text import CountVectorizer

# Download required NLTK data quietly
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

GOEMOTIONS_LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral"
]

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return text.strip()

def train_ngram_hmm():
    print("Loading HuggingFace GoEmotions dataset...")
    dataset = load_dataset("google-research-datasets/go_emotions", "simplified")
    train_data = dataset["train"]

    texts = []
    labels = []

    for item in train_data:
        if len(item["labels"]) > 0:
            texts.append(clean_text(item["text"]))
            labels.append(item["labels"][0])  # Take primary emotion label

    labels = np.array(labels)
    num_classes = len(GOEMOTIONS_LABELS)

    # 1. N-Gram Feature Vectorizer (Unigram + Bigram)
    print("Extracting N-Gram features...")
    vectorizer = CountVectorizer(
        ngram_range=(1, 2),
        min_df=2,
        tokenizer=word_tokenize,
        token_pattern=None
    )
    X_counts = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()
    vocab_size = len(feature_names)
    print(f"Vocabulary size: {vocab_size} n-grams extracted.")

    # 2. State Priors P(S)
    print("Computing State Priors P(S)...")
    label_counts = np.bincount(labels, minlength=num_classes)
    priors = (label_counts + 1) / (len(labels) + num_classes)  # Add-1 smoothing

    # 3. Transition Matrix P(S_t | S_{t-1})
    print("Estimating Dynamic Transition Matrix P(S_t | S_{t-1})...")
    transitions = np.ones((num_classes, num_classes))  # Laplace smoothed init
    for i in range(len(labels) - 1):
        prev_s = labels[i]
        curr_s = labels[i + 1]
        transitions[prev_s, curr_s] += 1
    
    transition_matrix = transitions / transitions.sum(axis=1, keepdims=True)

    # 4. Emission Likelihood Matrix P(W | S) - Vectorized Matrix Multiplication
    print("Computing Emission Probabilities P(W | S)...")
    # One-hot encoding for label matrix (N, num_classes)
    Y_onehot = np.zeros((len(labels), num_classes))
    Y_onehot[np.arange(len(labels)), labels] = 1.0

    # Matrix multiplication: (num_classes, N) @ (N, vocab_size) -> returns dense ndarray directly
    emission_counts = Y_onehot.T @ X_counts

    # Laplace smoothing for emission counts
    alpha = 0.1
    emission_probs = (emission_counts + alpha) / (emission_counts.sum(axis=1, keepdims=True) + alpha * vocab_size)
    log_emission_probs = np.log(emission_probs)

    model_artifacts = {
        "labels": GOEMOTIONS_LABELS,
        "vectorizer": vectorizer,
        "priors": priors,
        "transition_matrix": transition_matrix,
        "log_emission_probs": log_emission_probs,
        "vocab_size": vocab_size
    }

    # Ensure models/ folder exists and save artifact
    os.makedirs("models", exist_ok=True)
    save_path = os.path.join("models", "hmm_model.joblib")
    joblib.dump(model_artifacts, save_path)
    print(f"HMM Model successfully trained and saved to {save_path}!")

if __name__ == "__main__":
    train_ngram_hmm()