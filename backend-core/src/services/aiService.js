// Node.js to FastAPI AI Microservice Client Bridge

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function processComplaintWithAI(title, description, lat, lon) {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/classify-and-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[AI Microservice Bridge] FastAPI classify-and-route fallback active:', err.message);
  }

  return fallbackAIPipeline(title, description, lat, lon);
}

export async function classifyAndRouteWithAI(title, description, lat = 28.6139, lon = 77.2090) {
  return processComplaintWithAI(title, description, lat, lon);
}

export async function predictMLPriorityWithAI(title, description, category, lat = 28.6139, lon = 77.2090, reportCount = 1) {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/ml/predict-priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        report_count: reportCount
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[AI Microservice Bridge] FastAPI predict-priority fallback used:', err.message);
  }

  const baseWeight = 50.0;
  const multiplier = reportCount >= 10 ? 2.5 : reportCount >= 5 ? 1.8 : reportCount >= 2 ? 1.4 : 1.0;
  const rawScore = baseWeight * multiplier;
  const finalScore = Math.min(100.0, parseFloat(rawScore.toFixed(2)));

  let priority = 'MEDIUM';
  if (finalScore >= 85.0) priority = 'CRITICAL';
  else if (finalScore >= 65.0) priority = 'HIGH';
  else if (finalScore >= 35.0) priority = 'MEDIUM';
  else priority = 'LOW';

  return {
    priority,
    priority_score: finalScore,
    report_count: reportCount,
    breakdown: {
      base_weight: baseWeight,
      severity_bonus: 0,
      geo_multiplier: multiplier,
      raw_score: rawScore,
      explanation: `Category Base: ${baseWeight} | Severity Bonus: +0 | Location Multiplier: x${multiplier} (${reportCount} Reports)`
    }
  };
}

export async function calculatePriorityWithAI(baseUrgency = 'MEDIUM', requestCount = 1, slaRatio = 0.0) {
  return predictMLPriorityWithAI('Grievance', 'Urgent issue', baseUrgency, 28.6139, 77.2090, requestCount);
}

export async function checkDuplicateWithAI(title, description, lat, lon, activeComplaints) {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/detect-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        candidates: activeComplaints.map(c => ({
          id: c.id,
          ticket_number: c.ticket_number,
          title: c.title,
          description: c.description,
          latitude: c.latitude,
          longitude: c.longitude
        }))
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[AI Microservice Bridge] FastAPI duplicate check fallback used.');
  }

  return fallbackDuplicateChecker(title, description, lat, lon, activeComplaints);
}

// Intelligent Fallback Categorizer & Entity Extractor
function fallbackAIPipeline(title, description, lat, lon) {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = 'PUBLIC_WORKS';
  let targetDeptCode = 'ROADS';
  let departmentId = 'd1111111-1111-1111-1111-111111111111';
  let urgency = 'MEDIUM';
  let confidence = 0.89;

  if (text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('tap') || text.includes('waterbody')) {
    category = 'WATER_SUPPLY';
    targetDeptCode = 'WSS';
    departmentId = 'd3333333-3333-3333-3333-333333333333';
  } else if (text.includes('garbage') || text.includes('trash') || text.includes('dump') || text.includes('clean') || text.includes('waste') || text.includes('smell') || text.includes('sweep')) {
    category = 'SOLID_WASTE';
    targetDeptCode = 'SWM';
    departmentId = 'd2222222-2222-2222-2222-222222222222';
  } else if (text.includes('light') || text.includes('power') || text.includes('wire') || text.includes('spark') || text.includes('transformer') || text.includes('dark')) {
    category = 'ELECTRICITY';
    targetDeptCode = 'ELEC';
    departmentId = 'd4444444-4444-4444-4444-444444444444';
  } else if (text.includes('drain') || text.includes('sewage') || text.includes('gutter') || text.includes('overflow')) {
    category = 'DRAINAGE';
    targetDeptCode = 'DRAIN';
    departmentId = 'd5555555-5555-5555-5555-555555555555';
  }

  if (text.includes('urgent') || text.includes('danger') || text.includes('hazard') || text.includes('overflow') || text.includes('gushing') || text.includes('fire') || text.includes('broken main')) {
    urgency = 'CRITICAL';
    confidence = 0.95;
  } else if (text.includes('heavy') || text.includes('damaged') || text.includes('deep') || text.includes('blocked')) {
    urgency = 'HIGH';
    confidence = 0.92;
  }

  const locations = text.match(/(metro|gate|street|road|sector|colony|market|nagar|park|block|junction)\s*[0-9a-z]*/gi) || ['City Location'];
  const wardNum = Math.floor(Math.abs(lat * 100) % 20) + 1;

  return {
    category,
    target_department_code: targetDeptCode,
    department_id: departmentId,
    urgency,
    confidence: confidence,
    confidence_score: confidence,
    extracted_entities: {
      location: locations.join(', '),
      inferred_ward: `Ward ${wardNum}`,
      detected_urgency: urgency,
      key_phrases: text.split(' ').filter(w => w.length > 5).slice(0, 4)
    }
  };
}

function fallbackDuplicateChecker(title, description, lat, lon, candidates) {
  const newTokens = getTokens(`${title} ${description}`);
  let bestMatch = null;
  let highestSimilarity = 0.0;

  for (const item of candidates) {
    const dist = calculateHaversineMeters(lat, lon, item.latitude, item.longitude);
    if (dist > 500) continue;

    const itemTokens = getTokens(`${item.title} ${item.description}`);
    const similarity = jaccardSimilarity(newTokens, itemTokens);

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = item;
    }
  }

  const finalScore = Math.min(1.0, highestSimilarity * 1.4);

  return {
    is_duplicate: finalScore >= 0.85,
    similarity_score: parseFloat(finalScore.toFixed(3)),
    master_complaint: finalScore >= 0.85 ? bestMatch : null,
    radius_meters: 500
  };
}

function getTokens(text) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
}

function jaccardSimilarity(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
