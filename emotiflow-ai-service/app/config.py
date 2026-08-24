import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = os.getenv("MODEL_PATH", str(BASE_DIR / "models" / "hmm_model.joblib"))