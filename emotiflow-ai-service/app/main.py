from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.schemas import PredictRequest, PredictResponse, HealthResponse
from app.model import HMMSequenceClassifier

classifier: Optional[HMMSequenceClassifier] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global classifier
    try:
        classifier = HMMSequenceClassifier()
        print("Model successfully loaded from models/hmm_model.joblib")
    except Exception as e:
        print(f"Warning: Model not loaded on startup. Ensure train_model.py is executed. Details: {e}")
    yield

app = FastAPI(
    title="EmotiFlow AI Microservice",
    description="Custom N-gram + HMM 28-Class Emotion Predictor API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=classifier is not None
    )

@app.post("/predict", response_model=PredictResponse)
def predict_emotion(payload: PredictRequest):
    if not classifier:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HMM model is not initialized or loaded."
        )

    emotion, confidence, sequence = classifier.predict(
        text=payload.text,
        previous_emotion=payload.previous_emotion
    )

    return PredictResponse(
        emotion=emotion,
        confidence=confidence,
        sequence=sequence
    )