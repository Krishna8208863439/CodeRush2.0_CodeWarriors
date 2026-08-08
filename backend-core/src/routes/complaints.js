import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { processComplaintWithAI, checkDuplicateWithAI, predictMLPriorityWithAI } from '../services/aiService.js';

const router = express.Router();

// 1. Submit Complaint (Intake + Auto-Routing + ML Priority + Duplicate Merging Pipeline)
router.post('/submit', async (req, res) => {
  try {
    const {
      title,
      description,
      latitude = 28.6139,
      longitude = 77.2090,
      location_name = 'City Center Sector 12',
      citizen_id = 'c1111111-1111-1111-1111-111111111111',
      file_url,
      file_type = 'IMAGE',
      caption,
      category: requestedCategory
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required for complaint submission.' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Module 1: Auto-Routing & Classification via AI microservice
    const aiResult = await processComplaintWithAI(title, description, lat, lon);
    const finalCategory = requestedCategory || aiResult.category;

    // Map department code to Department record
    let matchedDept = store.departments.find(d => 
      d.code === finalCategory || 
      d.code === aiResult.target_department_code || 
      d.id === aiResult.department_id
    ) || store.departments[0];

    const departmentId = matchedDept ? matchedDept.id : aiResult.department_id;

    // Fetch active complaints for duplicate detection
    const activeCandidates = store.complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');
    const dupCheck = await checkDuplicateWithAI(title, description, lat, lon, activeCandidates);

    let masterGroupId = null;
    let masterIssueId = null;
    let isMaster = true;
    let status = 'PENDING';
    let reportCount = 1;

    // Module 2 & Step 3: Duplicate Merging & Re-Prioritization Action
    if (dupCheck.is_duplicate && dupCheck.master_complaint) {
      const targetMaster = store.complaints.find(c => c.id === dupCheck.master_complaint.id);

      if (targetMaster) {
        if (!targetMaster.master_group_id) {
          masterGroupId = `grp-${uuidv4().substring(0, 8)}`;
          store.duplicateGroups.push({
            id: masterGroupId,
            master_complaint_id: targetMaster.id,
            similarity_score: dupCheck.similarity_score,
            geo_radius_meters: 500,
            created_at: new Date().toISOString()
          });
          targetMaster.master_group_id = masterGroupId;
        } else {
          masterGroupId = targetMaster.master_group_id;
        }

        masterIssueId = targetMaster.id;
        isMaster = false;
        status = 'DUPLICATE_GROUPED';

        // Re-prioritize Master Issue
        const oldPriority = targetMaster.priority;
        const oldScore = targetMaster.priority_score;
        targetMaster.report_count = (targetMaster.report_count || 1) + 1;

        const updatedML = await predictMLPriorityWithAI(
          targetMaster.title,
          targetMaster.description,
          targetMaster.category,
          targetMaster.latitude,
          targetMaster.longitude,
          targetMaster.report_count
        );

        targetMaster.urgency = updatedML.priority;
        targetMaster.priority = updatedML.priority;
        targetMaster.priority_score = updatedML.priority_score;
        targetMaster.priority_breakdown = updatedML.breakdown;
        targetMaster.updated_at = new Date().toISOString();

        // Log Priority Audit Entry
        store.auditLogs.unshift({
          id: `log-${uuidv4().substring(0, 8)}`,
          complaint_id: targetMaster.id,
          performed_by: citizen_id,
          action: 'PRIORITY_AUTO_ESCALATED',
          previous_status: oldPriority,
          new_status: updatedML.priority,
          notes: `Duplicate report linked. Report Count: ${targetMaster.report_count}. Priority score escalated from ${oldScore} (${oldPriority}) to ${updatedML.priority_score} (${updatedML.priority}). Breakdown: ${updatedML.breakdown?.explanation}`,
          created_at: new Date().toISOString()
        });
      }
    }

    // Step 2: Predict ML Priority Score for new ticket
    const mlPriority = await predictMLPriorityWithAI(title, description, finalCategory, lat, lon, reportCount);

    // Module 3: Unique Public Tracking Identifier (e.g. CIV-2026-8942)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingId = `CIV-2026-${randomNum}`;

    // SLA Deadline calculation
    const slaDef = store.slas.find(s => s.department_id === departmentId && s.urgency === mlPriority.priority)
      || { resolution_hours: matchedDept.SLA_hours || 48 };
    const slaDeadline = new Date(Date.now() + slaDef.resolution_hours * 3600000).toISOString();

    const newComplaint = {
      id: `cmp-${uuidv4().substring(0, 8)}`,
      ticket_number: trackingId,
      tracking_id: trackingId,
      citizen_id,
      title,
      description,
      category: finalCategory,
      urgency: mlPriority.priority,
      priority: mlPriority.priority,
      priority_score: mlPriority.priority_score,
      priority_breakdown: mlPriority.breakdown,
      report_count: reportCount,
      request_count: reportCount,
      status,
      department_id: departmentId,
      target_department_code: matchedDept.code,
      department_name: matchedDept.name,
      ward_id: 'w1111111-1111-1111-1111-111111111111',
      location_name,
      latitude: lat,
      longitude: lon,
      ai_confidence_score: aiResult.confidence_score || aiResult.confidence,
      ai_raw_extracted_entities: aiResult.extracted_entities,
      master_group_id: masterGroupId,
      master_issue_id: masterIssueId,
      is_master_ticket: isMaster,
      sla_deadline: slaDeadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.complaints.unshift(newComplaint);

    if (file_url) {
      store.evidence.push({
        id: `ev-${uuidv4().substring(0, 8)}`,
        complaint_id: newComplaint.id,
        file_url,
        file_type,
        caption: caption || title,
        ai_analysis_tags: aiResult.extracted_entities?.key_phrases || ['evidence'],
        created_at: new Date().toISOString()
      });
    }

    store.auditLogs.unshift({
      id: `log-${uuidv4().substring(0, 8)}`,
      complaint_id: newComplaint.id,
      performed_by: citizen_id,
      action: status === 'DUPLICATE_GROUPED' ? 'DUPLICATE_MERGED' : 'SUBMITTED',
      previous_status: null,
      new_status: status,
      notes: status === 'DUPLICATE_GROUPED'
        ? `Merged under Master Ticket ${dupCheck.master_complaint?.ticket_number}.`
        : `Submitted & auto-routed to ${matchedDept.name} (${matchedDept.code}) with ML priority score ${mlPriority.priority_score} (${mlPriority.priority}).`,
      created_at: new Date().toISOString()
    });

    return res.status(201).json({
      message: status === 'DUPLICATE_GROUPED' ? 'Complaint logged and merged into active Master Issue.' : 'Complaint registered successfully.',
      complaint: newComplaint,
      duplicate_detection: dupCheck,
      ai_analysis: aiResult,
      ml_priority: mlPriority
    });

  } catch (err) {
    console.error('[Submit Complaint Error]', err);
    return res.status(500).json({ error: 'Internal Server Error during complaint processing.' });
  }
});

// 2. List Complaints with Filtering
router.get('/', (req, res) => {
  const { category, urgency, status, search, is_master, tracking_id } = req.query;

  let list = [...store.complaints];

  if (category) list = list.filter(c => c.category === category);
  if (urgency) list = list.filter(c => c.urgency === urgency || c.priority === urgency);
  if (status) list = list.filter(c => c.status === status);
  if (is_master === 'true') list = list.filter(c => c.is_master_ticket === true);
  if (tracking_id) list = list.filter(c => c.ticket_number === tracking_id || c.tracking_id === tracking_id || c.id === tracking_id);

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.ticket_number.toLowerCase().includes(q) || 
      c.location_name.toLowerCase().includes(q)
    );
  }

  const enriched = list.map(c => {
    const dept = store.departments.find(d => d.id === c.department_id || d.code === c.target_department_code);
    const ward = store.wards.find(w => w.id === c.ward_id);
    
    return {
      ...c,
      department_name: dept ? dept.name : c.department_name || 'Unassigned',
      ward_name: ward ? ward.name : 'General Ward'
    };
  });

  return res.json({ count: enriched.length, complaints: enriched });
});

// 3. Get Single Complaint Details
router.get('/:id', (req, res) => {
  const queryId = req.params.id;
  const complaint = store.complaints.find(c => 
    c.id === queryId || 
    c.ticket_number === queryId || 
    c.tracking_id === queryId
  );

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const dept = store.departments.find(d => d.id === complaint.department_id || d.code === complaint.target_department_code);
  const ward = store.wards.find(w => w.id === complaint.ward_id);
  const evidenceList = store.evidence.filter(e => e.complaint_id === complaint.id);
  const timeline = store.auditLogs.filter(a => a.complaint_id === complaint.id);

  let groupedSubTickets = [];
  if (complaint.master_group_id && complaint.is_master_ticket) {
    groupedSubTickets = store.complaints.filter(c => c.master_group_id === complaint.master_group_id && c.id !== complaint.id);
  }

  return res.json({
    complaint: {
      ...complaint,
      department_name: dept ? dept.name : complaint.department_name || 'Unassigned',
      ward_name: ward ? ward.name : 'General Ward'
    },
    evidence: evidenceList,
    timeline,
    sub_tickets: groupedSubTickets
  });
});

// 4. Patch Status Update
router.patch('/:id/status', (req, res) => {
  const { status, notes, officer_id = 'c2222222-2222-2222-2222-222222222222' } = req.body;
  const complaint = store.complaints.find(c => c.id === req.params.id || c.ticket_number === req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const prevStatus = complaint.status;
  complaint.status = status;
  complaint.updated_at = new Date().toISOString();

  if (status === 'RESOLVED') {
    complaint.resolved_at = new Date().toISOString();
  }

  store.auditLogs.unshift({
    id: `log-${uuidv4().substring(0, 8)}`,
    complaint_id: complaint.id,
    performed_by: officer_id,
    action: `STATUS_UPDATED_TO_${status}`,
    previous_status: prevStatus,
    new_status: status,
    notes: notes || `Status changed from ${prevStatus} to ${status} by field officer.`,
    created_at: new Date().toISOString()
  });

  return res.json({ message: 'Complaint status updated.', complaint });
});

export default router;
