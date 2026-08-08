import math
import re
from typing import List, Optional, Dict, Any

def calculate_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth 
    specified in decimal degrees using the Haversine formula.
    Returns distance in meters.
    """
    R = 6371000.0  # Earth's mean radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# 1. Base Category Urgency Weights (W_cat: 0 to 100)
CATEGORY_BASE_WEIGHTS: Dict[str, float] = {
    # Extreme Hazards & Infrastructure Failures (90 - 100)
    "LIVE_ELECTRIC_WIRE": 95.0,
    "LIVE_WIRE": 95.0,
    "GAS_LEAK": 95.0,
    "BUILDING_COLLAPSE": 95.0,
    "FIRE_HAZARD": 90.0,

    # High Urgency Municipal Issues (60 - 80)
    "WATER_BURST": 75.0,
    "WATER_SUPPLY": 70.0,
    "MAJOR_POTHOLE": 65.0,
    "POTHOLE": 65.0,
    "DRAIN_OVERFLOW": 70.0,
    "DRAINAGE": 65.0,
    "ROADS": 60.0,
    "PUBLIC_WORKS": 60.0,
    "PUBLIC_SAFETY": 70.0,

    # Medium Urgency Civic Services (40 - 60)
    "GARBAGE_ACCUMULATION": 50.0,
    "SOLID_WASTE": 50.0,
    "SANITATION": 50.0,
    "STREETLIGHT_OUT": 45.0,
    "ELECTRICITY": 50.0,

    # Low Urgency Aesthetics / Maintenance (10 - 30)
    "PARK_MAINTENANCE": 25.0,
    "PARK_BENCH": 20.0,
    "PARKS": 20.0,
    "ILLEGAL_BANNER": 20.0,
}

# 2. Critical NLP Urgency Keywords
SEVERITY_KEYWORDS = [
    "accident", "hospital", "school", "hazard", "fire",
    "blocking traffic", "flooding", "emergency", "danger",
    "gushing", "collapse", "sparking", "injury", "broken main",
    "critical", "fatal", "exposed wire"
]

def predict_ml_priority(
    title: str,
    description: str,
    category: str,
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    report_count: int = 1,
    candidate_locations: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    ML Dynamic Priority Prediction Engine
    Calculates dynamic complaint priority (LOW, MEDIUM, HIGH, CRITICAL)
    based on Base Category Weight, NLP Keyword Extraction, and Geospatial Frequency.
    """
    # 1. Base Category Weight (W_cat)
    cat_upper = category.upper().strip().replace(" ", "_")
    base_weight = CATEGORY_BASE_WEIGHTS.get(cat_upper, 50.0)

    # 2. NLP Problem Severity Score (S_text)
    full_text = f"{title} {description}".lower()
    matched_triggers = [kw for kw in SEVERITY_KEYWORDS if kw in full_text]
    
    severity_bonus = 0.0
    if len(matched_triggers) >= 3:
        severity_bonus = 25.0
    elif len(matched_triggers) >= 1:
        severity_bonus = 15.0

    # 3. Geospatial Report Frequency Clustering (F_geo)
    total_reports = max(1, report_count)

    if candidate_locations:
        nearby_count = 0
        for cand in candidate_locations:
            cand_cat = cand.get("category", "").upper().strip().replace(" ", "_")
            # Filter by same category if category provided in candidate
            if cand_cat and cand_cat != cat_upper:
                continue
            cand_lat = cand.get("latitude", 28.6139)
            cand_lng = cand.get("longitude", 77.2090)
            dist = calculate_haversine_meters(latitude, longitude, cand_lat, cand_lng)
            if dist <= 500.0:
                nearby_count += 1
        total_reports = max(total_reports, nearby_count + 1)

    # Frequency Multiplier Formula:
    # N=1 -> 1.0 | N=2..4 -> 1.4 | N=5..9 -> 1.8 | N>=10 -> 2.5
    if total_reports >= 10:
        geo_multiplier = 2.5
    elif total_reports >= 5:
        geo_multiplier = 1.8
    elif total_reports >= 2:
        geo_multiplier = 1.4
    else:
        geo_multiplier = 1.0

    # 4. Final Score Formula: FinalScore = min(100.0, (W_cat + S_text) * F_geo)
    raw_score = (base_weight + severity_bonus) * geo_multiplier
    final_score = min(100.0, round(raw_score, 2))

    # 5. Output Threshold Mapping:
    # Score < 35.0 -> LOW
    # 35.0 <= Score < 65.0 -> MEDIUM
    # 65.0 <= Score < 85.0 -> HIGH
    # Score >= 85.0 -> CRITICAL
    if final_score >= 85.0:
        priority = "CRITICAL"
    elif final_score >= 65.0:
        priority = "HIGH"
    elif final_score >= 35.0:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    explanation = f"Category Base: {int(base_weight)} | Severity Bonus: +{int(severity_bonus)} | Location Multiplier: x{geo_multiplier} ({total_reports} Reports)"

    return {
        "priority": priority,
        "priority_score": final_score,
        "report_count": total_reports,
        "breakdown": {
            "base_weight": base_weight,
            "severity_bonus": severity_bonus,
            "geo_multiplier": geo_multiplier,
            "raw_score": round(raw_score, 2),
            "matched_keywords": matched_triggers,
            "explanation": explanation
        }
    }
