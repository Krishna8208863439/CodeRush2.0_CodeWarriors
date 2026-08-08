import math
import re
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from priority_engine import predict_ml_priority

# Load SentenceTransformers or TF-IDF fallback
HAS_SENTENCE_TRANSFORMERS = False
try:
    from sentence_transformers import SentenceTransformer, util
    model = SentenceTransformer('all-MiniLM-L6-v2')
    HAS_SENTENCE_TRANSFORMERS = True
    print("[AI Microservice] SentenceTransformer 'all-MiniLM-L6-v2' successfully loaded into memory.")
except Exception as e:
    print(f"[AI Microservice] SentenceTransformer fallback active: {e}")
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(
    title="Community Redressal Planner - AI Microservice",
    description="Microservice providing NLP Entity Extraction, Category Classification, Automatic Department Routing, and ML Dynamic Priority Prediction Engine.",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyRequest(BaseModel):
    title: str
    description: str
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090

class CandidateTicket(BaseModel):
    id: str
    ticket_number: Optional[str] = "GRV-000"
    title: str
    description: str
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090

class DetectDuplicatesRequest(BaseModel):
    title: str
    description: str
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090
    candidates: List[CandidateTicket]
    geo_radius_meters: Optional[float] = 500.0

class CalculatePriorityRequest(BaseModel):
    base_urgency: Optional[str] = "MEDIUM"
    request_count: int = 1
    sla_time_elapsed_ratio: Optional[float] = 0.0

class PredictMLPriorityRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = "PUBLIC_WORKS"
    latitude: Optional[float] = 28.6139
    longitude: Optional[float] = 77.2090
    report_count: Optional[int] = 1
    candidate_locations: Optional[List[Dict[str, Any]]] = None

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def perform_classification(title: str, description: str):
    full_text = f"{title} {description}".lower()

    category = "PUBLIC_WORKS"
    target_dept_code = "ROADS"
    dept_id = "d1111111-1111-1111-1111-111111111111"
    confidence = 0.91

    if any(k in full_text for k in ["water", "pipe", "leak", "tap", "drinking", "waterbody", "gush"]):
        category = "WATER_SUPPLY"
        target_dept_code = "WSS"
        dept_id = "d3333333-3333-3333-3333-333333333333"
        confidence = 0.96
    elif any(k in full_text for k in ["garbage", "trash", "waste", "dump", "smell", "sweep", "bin", "litter", "sanitation"]):
        category = "SOLID_WASTE"
        target_dept_code = "SWM"
        dept_id = "d2222222-2222-2222-2222-222222222222"
        confidence = 0.95
    elif any(k in full_text for k in ["light", "power", "wire", "electricity", "transformer", "dark", "pole", "spark"]):
        category = "ELECTRICITY"
        target_dept_code = "ELEC"
        dept_id = "d4444444-4444-4444-4444-444444444444"
        confidence = 0.94
    elif any(k in full_text for k in ["drain", "sewage", "gutter", "overflow", "manhole", "blockage"]):
        category = "DRAINAGE"
        target_dept_code = "DRAIN"
        dept_id = "d5555555-5555-5555-5555-555555555555"
        confidence = 0.93
    elif any(k in full_text for k in ["park", "tree", "garden", "playground", "grass", "branch"]):
        category = "PARKS"
        target_dept_code = "PARKS"
        dept_id = "d6666666-6666-6666-6666-666666666666"
        confidence = 0.92
    elif any(k in full_text for k in ["danger", "safety", "hazard", "encroachment", "police", "crime", "stray"]):
        category = "PUBLIC_SAFETY"
        target_dept_code = "SAFETY"
        dept_id = "d7777777-7777-7777-7777-777777777777"
        confidence = 0.91

    urgency = "MEDIUM"
    if any(k in full_text for k in ["urgent", "danger", "hazard", "gushing", "fire", "hospital", "collapsed", "electrical spark", "critical"]):
        urgency = "CRITICAL"
        confidence += 0.03
    elif any(k in full_text for k in ["heavy", "damaged", "deep", "blocked", "overflowing"]):
        urgency = "HIGH"

    location_matches = re.findall(r'(?:metro|gate|street|road|sector|colony|market|nagar|park|block|junction)\s*[0-9a-z]*', full_text)
    detected_location = ", ".join([m.title() for m in location_matches]) if location_matches else "Civic Landmark"

    return {
        "category": category,
        "target_department_code": target_dept_code,
        "department_id": dept_id,
        "urgency": urgency,
        "confidence": min(0.99, round(confidence, 2)),
        "confidence_score": min(0.99, round(confidence, 2)),
        "extracted_entities": {
            "location": detected_location,
            "detected_urgency": urgency,
            "extracted_keywords": [w for w in re.findall(r'\b\w{6,}\b', full_text) if w not in ['please', 'urgent', 'street']][:5]
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Python FastAPI AI Microservice",
        "sentence_transformers_active": HAS_SENTENCE_TRANSFORMERS
    }

# STEP 2 ML PRIORITY PREDICTION ENDPOINT
@app.post("/api/ml/predict-priority")
def predict_ml_priority_endpoint(req: PredictMLPriorityRequest):
    return predict_ml_priority(
        title=req.title,
        description=req.description,
        category=req.category or "PUBLIC_WORKS",
        latitude=req.latitude or 28.6139,
        longitude=req.longitude or 77.2090,
        report_count=req.report_count or 1,
        candidate_locations=req.candidate_locations
    )

# MODULE 1: AUTOMATIC DEPARTMENT ROUTING ENDPOINT
@app.post("/api/classify-and-route")
@app.post("/api/classify")
@app.post("/ai/process-grievance")
def classify_and_route(req: ClassifyRequest):
    return perform_classification(req.title, req.description)

# MODULE 2: DYNAMIC REQUEST-BASED PRIORITIZATION ENDPOINT
@app.post("/api/calculate-priority")
def calculate_priority(req: CalculatePriorityRequest):
    urgency_weights = {
        "LOW": 1.0,
        "MEDIUM": 2.0,
        "HIGH": 3.0,
        "CRITICAL": 4.0
    }

    base_urgency = req.base_urgency.upper() if req.base_urgency else "MEDIUM"
    base_weight = urgency_weights.get(base_urgency, 2.0)

    request_count = max(1, req.request_count)
    sla_ratio = max(0.0, req.sla_time_elapsed_ratio or 0.0)

    score = (base_weight * 0.4) + (request_count * 1.5) + (sla_ratio * 0.5)

    if request_count >= 6:
        calculated_priority = "CRITICAL"
    elif request_count >= 3:
        calculated_priority = "HIGH" if base_urgency != "CRITICAL" else "CRITICAL"
    else:
        calculated_priority = base_urgency

    return {
        "priority": calculated_priority,
        "priority_score": round(score, 2),
        "request_count": request_count,
        "auto_escalated": request_count >= 3,
        "formula_breakdown": {
            "base_weight": base_weight,
            "request_count_multiplier": request_count * 1.5,
            "sla_ratio_multiplier": round(sla_ratio * 0.5, 2)
        }
    }

# STEP 3 Requested Endpoint 2: /api/detect-duplicates
@app.post("/api/detect-duplicates")
@app.post("/ai/duplicates/check")
def detect_duplicates(req: DetectDuplicatesRequest):
    if not req.candidates:
        return {
            "is_duplicate": False,
            "similarity_score": 0.0,
            "master_complaint": None,
            "candidates_evaluated": 0
        }

    new_text = f"{req.title} {req.description}"
    best_candidate = None
    highest_similarity = 0.0

    in_range_candidates = []
    for cand in req.candidates:
        dist = haversine_distance(req.latitude or 28.6139, req.longitude or 77.2090, cand.latitude or 28.6139, cand.longitude or 77.2090)
        if dist <= (req.geo_radius_meters or 500.0):
            in_range_candidates.append((cand, dist))

    if not in_range_candidates:
        return {
            "is_duplicate": False,
            "similarity_score": 0.0,
            "master_complaint": None,
            "candidates_evaluated": 0
        }

    candidate_texts = [f"{c[0].title} {c[0].description}" for c in in_range_candidates]

    if HAS_SENTENCE_TRANSFORMERS:
        new_embedding = model.encode(new_text, convert_to_tensor=True)
        cand_embeddings = model.encode(candidate_texts, convert_to_tensor=True)
        cosine_scores = util.cos_sim(new_embedding, cand_embeddings)[0]

        for idx, score in enumerate(cosine_scores):
            sim_val = float(score.item())
            if sim_val > highest_similarity:
                highest_similarity = sim_val
                best_candidate = in_range_candidates[idx][0]
    else:
        vectorizer = TfidfVectorizer().fit([new_text] + candidate_texts)
        vectors = vectorizer.transform([new_text] + candidate_texts)
        similarities = cosine_similarity(vectors[0:1], vectors[1:])[0]

        for idx, sim in enumerate(similarities):
            sim_val = float(sim)
            if sim_val > highest_similarity:
                highest_similarity = sim_val
                best_candidate = in_range_candidates[idx][0]

    is_dup = highest_similarity >= 0.85

    return {
        "is_duplicate": is_dup,
        "similarity_score": round(highest_similarity, 3),
        "master_complaint": best_candidate.dict() if (is_dup and best_candidate) else None,
        "candidates_evaluated": len(in_range_candidates),
        "threshold": 0.85
    }
