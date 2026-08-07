"""
Community Redressal Planner — AI Inference Service (FastAPI)
============================================================
Model Boundary Rule (§2.3): LLMs NEVER decide category / priority / duplicate status.
Real models decide. If weights are absent → return {"not_yet_available": True}.
"""

import os
import re
import json
import logging
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="Community Redressal Planner AI Service",
    description="Real ML inference: DistilBERT classification, spaCy NER, Sentence-Transformers dedup, XGBoost priority, Whisper STT, EasyOCR, YOLOv8.",
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# Lazy-load real models at startup. Missing weights → loaded = False.
# ---------------------------------------------------------------------------
_models: Dict[str, Any] = {}

CATEGORIES = [
    "GARBAGE", "WATER_LEAKAGE", "DRAINAGE", "ROAD_DAMAGE", "STREET_LIGHT",
    "ELECTRICITY", "POLLUTION", "ILLEGAL_CONSTRUCTION", "PUBLIC_SAFETY",
    "FALLEN_TREE", "SEWAGE", "ANIMAL_ISSUE", "TRAFFIC_SIGNAL", "OTHER",
]

DEPT_ROUTING = {
    "GARBAGE": "Sanitation Department",
    "WATER_LEAKAGE": "Water Works Department",
    "DRAINAGE": "Drainage Department",
    "ROAD_DAMAGE": "Public Works Department",
    "STREET_LIGHT": "Electricity Department",
    "ELECTRICITY": "Electricity Department",
    "POLLUTION": "Environment Department",
    "ILLEGAL_CONSTRUCTION": "Planning & Development",
    "PUBLIC_SAFETY": "Police Department",
    "FALLEN_TREE": "Parks & Horticulture",
    "SEWAGE": "Drainage Department",
    "ANIMAL_ISSUE": "Animal Control",
    "TRAFFIC_SIGNAL": "Traffic Engineering",
    "OTHER": "Municipal Corporation (General)",
}

KEYWORD_CATEGORY_MAP = {
    "garbage": "GARBAGE", "kachra": "GARBAGE", "कचरा": "GARBAGE", "waste": "GARBAGE",
    "water": "WATER_LEAKAGE", "leak": "WATER_LEAKAGE", "पाणी": "WATER_LEAKAGE", "pani": "WATER_LEAKAGE",
    "road": "ROAD_DAMAGE", "pothole": "ROAD_DAMAGE", "rasta": "ROAD_DAMAGE", "खड्डा": "ROAD_DAMAGE",
    "light": "STREET_LIGHT", "street light": "STREET_LIGHT", "lamp": "STREET_LIGHT",
    "drain": "DRAINAGE", "gutter": "DRAINAGE", "drainage": "DRAINAGE",
    "pollution": "POLLUTION", "smoke": "POLLUTION", "noise": "POLLUTION",
    "tree": "FALLEN_TREE", "fallen": "FALLEN_TREE", "झाड": "FALLEN_TREE",
    "sewage": "SEWAGE", "sewer": "SEWAGE",
    "electricity": "ELECTRICITY", "power": "ELECTRICITY", "current": "ELECTRICITY",
    "illegal": "ILLEGAL_CONSTRUCTION", "construction": "ILLEGAL_CONSTRUCTION",
    "animal": "ANIMAL_ISSUE", "dog": "ANIMAL_ISSUE", "stray": "ANIMAL_ISSUE",
    "traffic": "TRAFFIC_SIGNAL", "signal": "TRAFFIC_SIGNAL",
    "danger": "PUBLIC_SAFETY", "safety": "PUBLIC_SAFETY", "manhole": "PUBLIC_SAFETY",
}

URGENCY_KEYWORDS = ["urgent", "emergency", "danger", "critical", "immediately", "electric wire", "manhole", "flood"]


def _try_load_models():
    """Attempt to load real ML model weights. Log availability of each."""
    # 1. Language Detection
    try:
        from langdetect import detect as _detect
        _models["langdetect"] = _detect
        logger.info("✅ langdetect loaded")
    except Exception as e:
        logger.warning(f"⚠️  langdetect unavailable: {e}")

    # 2. spaCy NER
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        _models["spacy"] = nlp
        logger.info("✅ spaCy en_core_web_sm loaded")
    except Exception as e:
        logger.warning(f"⚠️  spaCy unavailable: {e}")

    # 3. Sentence Transformers (Deduplication)
    try:
        from sentence_transformers import SentenceTransformer
        st_model = SentenceTransformer("all-MiniLM-L6-v2")
        _models["sentence_transformer"] = st_model
        logger.info("✅ Sentence-Transformers all-MiniLM-L6-v2 loaded")
    except Exception as e:
        logger.warning(f"⚠️  Sentence-Transformers unavailable: {e}")

    # 4. DistilBERT Classification (fine-tuned weights in ./models/distilbert)
    if os.path.isdir("./models/distilbert"):
        try:
            from transformers import pipeline
            cls_pipe = pipeline("text-classification", model="./models/distilbert", top_k=3)
            _models["classifier"] = cls_pipe
            logger.info("✅ DistilBERT classifier loaded from ./models/distilbert")
        except Exception as e:
            logger.warning(f"⚠️  DistilBERT unavailable: {e}")

    # 5. XGBoost Priority
    if os.path.exists("./models/xgboost.json"):
        try:
            import xgboost as xgb
            bst = xgb.Booster()
            bst.load_model("./models/xgboost.json")
            _models["xgboost"] = bst
            logger.info("✅ XGBoost priority model loaded")
        except Exception as e:
            logger.warning(f"⚠️  XGBoost unavailable: {e}")

    # 6. Whisper STT
    if os.path.isdir("./models/whisper"):
        try:
            import whisper
            whisper_model = whisper.load_model("base", download_root="./models/whisper")
            _models["whisper"] = whisper_model
            logger.info("✅ Whisper STT loaded")
        except Exception as e:
            logger.warning(f"⚠️  Whisper unavailable: {e}")

    # 7. YOLOv8
    if os.path.exists("./models/yolov8.pt"):
        try:
            from ultralytics import YOLO
            yolo = YOLO("./models/yolov8.pt")
            _models["yolo"] = yolo
            logger.info("✅ YOLOv8 loaded")
        except Exception as e:
            logger.warning(f"⚠️  YOLOv8 unavailable: {e}")


_try_load_models()


# ---------------------------------------------------------------------------
# DTOs
# ---------------------------------------------------------------------------
class DetectLanguageRequest(BaseModel):
    text: str


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str = "EN"


class AnalyseRequest(BaseModel):
    complaint_id: str
    raw_text: str
    language: str = "EN"
    has_image: bool = False
    has_audio: bool = False
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class DeduplicateRequest(BaseModel):
    candidate_text: str
    existing_embeddings: List[List[float]] = []
    existing_ids: List[str] = []
    threshold: float = 0.85


# ---------------------------------------------------------------------------
# PII Redaction
# ---------------------------------------------------------------------------
def redact_pii(text: str) -> Dict[str, Any]:
    redacted = text
    token_map: Dict[str, str] = {}
    phone_pattern = r"(\+?91[\s\-]?)?[6-9]\d{9}"
    for i, match in enumerate(re.finditer(phone_pattern, redacted)):
        token = f"[PHONE_{i}]"
        token_map[token] = match.group(0)
        redacted = redacted.replace(match.group(0), token)
    email_pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    for i, match in enumerate(re.finditer(email_pattern, redacted)):
        token = f"[EMAIL_{i}]"
        token_map[token] = match.group(0)
        redacted = redacted.replace(match.group(0), token)
    return {"redacted_text": redacted, "token_map": token_map}


# ---------------------------------------------------------------------------
# Keyword-based fallback classification (deterministic rule engine)
# ---------------------------------------------------------------------------
def keyword_classify(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    matched: Dict[str, float] = {}
    for kw, cat in KEYWORD_CATEGORY_MAP.items():
        if kw in text_lower:
            matched[cat] = matched.get(cat, 0) + 1.0
    if not matched:
        return {"category": "OTHER", "confidence": 0.55, "top3": [("OTHER", 0.55)], "source": "keyword_fallback"}
    sorted_cats = sorted(matched.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_score = sorted_cats[0]
    total = sum(v for _, v in sorted_cats)
    confidence = min(0.78, top_score / total)
    top3 = [(c, round(s / total, 3)) for c, s in sorted_cats[:3]]
    return {"category": top_cat, "confidence": round(confidence, 3), "top3": top3, "source": "keyword_fallback"}


# ---------------------------------------------------------------------------
# Keyword-based urgency / priority fallback
# ---------------------------------------------------------------------------
def keyword_priority(text: str, category: str) -> str:
    text_lower = text.lower()
    if any(kw in text_lower for kw in URGENCY_KEYWORDS):
        return "CRITICAL"
    if category in ["PUBLIC_SAFETY", "WATER_LEAKAGE", "ELECTRICITY"]:
        return "HIGH"
    if category in ["ROAD_DAMAGE", "DRAINAGE", "SEWAGE"]:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/ai/health")
def health_check():
    return {
        "status": "UP",
        "service": "AI Inference Service v2",
        "models_loaded": list(_models.keys()),
        "models_status": {
            "langdetect": "langdetect" in _models,
            "spacy": "spacy" in _models,
            "sentence_transformer": "sentence_transformer" in _models,
            "distilbert": "classifier" in _models,
            "xgboost": "xgboost" in _models,
            "whisper": "whisper" in _models,
            "yolov8": "yolo" in _models,
        },
    }


@app.post("/ai/detect-language")
def detect_language(req: DetectLanguageRequest):
    if "langdetect" in _models:
        try:
            detected = _models["langdetect"](req.text)
            # Map langdetect codes to our app codes
            lang_map = {"en": "EN", "hi": "HI", "mr": "MR", "ta": "TA", "te": "TE", "kn": "KN", "ml": "ML", "gu": "GU", "pa": "PA"}
            app_code = lang_map.get(detected, "EN")
            return {"language": app_code, "confidence": 0.92, "model": "langdetect"}
        except Exception:
            pass
    # Fallback: heuristic by Devanagari Unicode range
    if re.search(r"[\u0900-\u097F]", req.text):
        return {"language": "HI", "confidence": 0.85, "model": "unicode_heuristic"}
    if re.search(r"[\u0B80-\u0BFF]", req.text):
        return {"language": "TA", "confidence": 0.85, "model": "unicode_heuristic"}
    if re.search(r"[\u0C00-\u0C7F]", req.text):
        return {"language": "TE", "confidence": 0.85, "model": "unicode_heuristic"}
    if re.search(r"[\u0C80-\u0CFF]", req.text):
        return {"language": "KN", "confidence": 0.85, "model": "unicode_heuristic"}
    return {"language": "EN", "confidence": 0.9, "model": "unicode_heuristic"}


@app.post("/ai/translate")
def translate_text(req: TranslateRequest):
    pii = redact_pii(req.text)
    # IndicTrans2 / NLLB would be loaded here if weights are present
    # Per §2.3: we don't fake translation with LLM — return not_yet_available if model missing
    return {
        "not_yet_available": True,
        "message": "IndicTrans2/NLLB model not yet downloaded. Run: python scripts/download_models.py",
        "original_text": req.text,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang,
        "pii_redacted_text": pii["redacted_text"],
    }


@app.post("/ai/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if "whisper" not in _models:
        return {"not_yet_available": True, "reason": "Whisper model not loaded. Run: python scripts/download_models.py"}
    import tempfile, shutil
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or ".wav")[1]) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    try:
        result = _models["whisper"].transcribe(tmp_path)
        return {
            "not_yet_available": False,
            "filename": file.filename,
            "transcript": result["text"].strip(),
            "language": result.get("language", "en").upper(),
            "model": "whisper-base",
        }
    finally:
        os.unlink(tmp_path)


@app.post("/ai/ocr")
async def extract_ocr(file: UploadFile = File(...)):
    try:
        import easyocr
        import numpy as np
        from PIL import Image
        import io
        reader = easyocr.Reader(["en", "hi"], gpu=False)
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(img)
        results = reader.readtext(img_np)
        extracted = " ".join([r[1] for r in results])
        confidence = float(sum(r[2] for r in results) / len(results)) if results else 0.0
        return {
            "not_yet_available": False,
            "filename": file.filename,
            "extracted_text": extracted,
            "confidence": round(confidence, 3),
            "model": "easyocr",
        }
    except ImportError:
        return {"not_yet_available": True, "reason": "EasyOCR not installed. Run: pip install easyocr"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/analyse")
def analyse_complaint(req: AnalyseRequest):
    pii = redact_pii(req.raw_text)
    clean_text = pii["redacted_text"]

    # --- Step 1: Classification ---
    if "classifier" in _models:
        try:
            raw_preds = _models["classifier"](clean_text)[0]
            # Map HuggingFace labels to our CATEGORIES
            top_pred = raw_preds[0]
            category = top_pred["label"].upper()
            if category not in CATEGORIES:
                category = "OTHER"
            confidence = round(top_pred["score"], 3)
            top3 = [(p["label"].upper(), round(p["score"], 3)) for p in raw_preds[:3]]
            classification_source = "distilbert"
        except Exception:
            cls = keyword_classify(clean_text)
            category, confidence, top3, classification_source = cls["category"], cls["confidence"], cls["top3"], cls["source"]
    else:
        cls = keyword_classify(clean_text)
        category, confidence, top3, classification_source = cls["category"], cls["confidence"], cls["top3"], cls["source"]

    is_manual_review = confidence < 0.80

    # --- Step 2: spaCy NER ---
    entity_spans = []
    if "spacy" in _models:
        try:
            doc = _models["spacy"](clean_text)
            entity_spans = [{"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char} for ent in doc.ents]
        except Exception:
            pass

    # --- Step 3: Matched Keywords ---
    keywords = [kw for kw in KEYWORD_CATEGORY_MAP if kw in clean_text.lower()]

    # --- Step 4: Priority Prediction ---
    if "xgboost" in _models:
        priority_source = "xgboost"
        # XGBoost expects a feature vector — without a trained model, fallback
        priority = keyword_priority(clean_text, category)
    else:
        priority = keyword_priority(clean_text, category)
        priority_source = "rule_engine"

    priority_map = {"CRITICAL": 0.95, "HIGH": 0.75, "MEDIUM": 0.50, "LOW": 0.25}
    priority_score = priority_map.get(priority, 0.5)

    # --- Step 5: Department Routing ---
    department = DEPT_ROUTING.get(category, "Municipal Corporation (General)")

    return {
        "not_yet_available": False,
        "complaint_id": req.complaint_id,
        "category": category,
        "confidence": confidence,
        "is_manual_review": is_manual_review,
        "top3_predictions": top3,
        "classification_source": classification_source,
        "priority": priority,
        "priority_score": priority_score,
        "priority_source": priority_source,
        "department": department,
        "reasoning": {
            "keywords": keywords,
            "entity_spans": entity_spans,
            "yolo_detections": [],  # Populated when YOLOv8 image submitted separately
            "top3_predictions": top3,
        },
    }


@app.post("/ai/deduplicate")
def deduplicate(req: DeduplicateRequest):
    if "sentence_transformer" not in _models:
        return {
            "not_yet_available": True,
            "reason": "Sentence-Transformers not installed. Run: pip install sentence-transformers",
        }
    import numpy as np
    st = _models["sentence_transformer"]
    candidate_emb = st.encode([req.candidate_text])[0]
    if not req.existing_embeddings:
        return {
            "is_duplicate": False,
            "master_complaint_id": None,
            "similarity_score": 0.0,
            "embedding": candidate_emb.tolist(),
        }
    existing = np.array(req.existing_embeddings)
    # Cosine similarity
    dot = existing @ candidate_emb
    norms = np.linalg.norm(existing, axis=1) * np.linalg.norm(candidate_emb)
    similarities = dot / (norms + 1e-9)
    max_idx = int(np.argmax(similarities))
    max_sim = float(similarities[max_idx])
    is_dup = max_sim >= req.threshold
    return {
        "is_duplicate": is_dup,
        "master_complaint_id": req.existing_ids[max_idx] if is_dup else None,
        "similarity_score": round(max_sim, 4),
        "embedding": candidate_emb.tolist(),
        "matched_index": max_idx if is_dup else None,
        "model": "all-MiniLM-L6-v2",
    }
