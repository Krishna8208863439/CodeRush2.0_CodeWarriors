// In-Memory Data Store & PostgreSQL Synchronizer
import { v4 as uuidv4 } from 'uuid';

export const store = {
  departments: [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      name: 'Public Works & Roads',
      code: 'PWR',
      description: 'Responsible for municipal road repair, pothole maintenance, and bridge safety.',
      contact_email: 'roads@civic-gov.in',
      contact_phone: '+91 800-111-0001'
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      name: 'Sanitation & Solid Waste',
      code: 'SSW',
      description: 'Handles garbage collection, waste dumping, street sweeping, and recycling.',
      contact_email: 'sanitation@civic-gov.in',
      contact_phone: '+91 800-111-0002'
    },
    {
      id: 'd3333333-3333-3333-3333-333333333333',
      name: 'Water Supply & Sewerage',
      code: 'WSS',
      description: 'Manages clean water supply, pipe leaks, drain blockages, and sewage treatment.',
      contact_email: 'water@civic-gov.in',
      contact_phone: '+91 800-111-0003'
    },
    {
      id: 'd4444444-4444-4444-4444-444444444444',
      name: 'Electricity & Street Lighting',
      code: 'ESL',
      description: 'Maintains streetlights, power transformers, and electrical hazards.',
      contact_email: 'power@civic-gov.in',
      contact_phone: '+91 800-111-0004'
    }
  ],

  wards: [
    {
      id: 'w1111111-1111-1111-1111-111111111111',
      ward_number: 12,
      name: 'Central Metro North',
      officer_in_charge: 'Officer Rajesh Sharma'
    },
    {
      id: 'w2222222-2222-2222-2222-222222222222',
      ward_number: 14,
      name: 'Civic Centre East',
      officer_in_charge: 'Officer Priya Patel'
    },
    {
      id: 'w3333333-3333-3333-3333-333333333333',
      ward_number: 7,
      name: 'South Lake Sector',
      officer_in_charge: 'Officer Vikram Singh'
    }
  ],

  citizens: [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      full_name: 'Aarav Mehta',
      email: 'citizen@gov.in',
      password_hash: 'password123',
      phone_number: '+91 9876543210',
      role: 'CITIZEN'
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      full_name: 'Officer Rajesh Sharma',
      email: 'officer@gov.in',
      password_hash: 'officer123',
      phone_number: '+91 9876543211',
      role: 'OFFICER',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      ward_id: 'w1111111-1111-1111-1111-111111111111'
    }
  ],

  slas: [
    { id: 's1', department_id: 'd1111111-1111-1111-1111-111111111111', category: 'ROADS', urgency: 'CRITICAL', resolution_hours: 24, warning_hours: 18 },
    { id: 's2', department_id: 'd1111111-1111-1111-1111-111111111111', category: 'ROADS', urgency: 'HIGH', resolution_hours: 48, warning_hours: 36 },
    { id: 's3', department_id: 'd1111111-1111-1111-1111-111111111111', category: 'ROADS', urgency: 'MEDIUM', resolution_hours: 72, warning_hours: 54 },
    { id: 's4', department_id: 'd2222222-2222-2222-2222-222222222222', category: 'SANITATION', urgency: 'CRITICAL', resolution_hours: 12, warning_hours: 8 },
    { id: 's5', department_id: 'd2222222-2222-2222-2222-222222222222', category: 'SANITATION', urgency: 'HIGH', resolution_hours: 24, warning_hours: 18 },
    { id: 's6', department_id: 'd3333333-3333-3333-3333-333333333333', category: 'WATER', urgency: 'CRITICAL', resolution_hours: 12, warning_hours: 8 },
    { id: 's7', department_id: 'd4444444-4444-4444-4444-444444444444', category: 'ELECTRICITY', urgency: 'CRITICAL', resolution_hours: 6, warning_hours: 4 }
  ],

  duplicateGroups: [
    {
      id: 'grp-001',
      master_complaint_id: 'cmp-001',
      similarity_score: 0.92,
      geo_radius_meters: 500,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ],

  complaints: [
    {
      id: 'cmp-001',
      ticket_number: 'GRV-2026-0801',
      citizen_id: 'c1111111-1111-1111-1111-111111111111',
      title: 'Major Pothole causing traffic delay near Metro Gate 3',
      description: 'Dangerous deep pothole right outside Metro Station Gate 3 on MG Road. Two vehicles damaged tires today.',
      category: 'ROADS',
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      ward_id: 'w1111111-1111-1111-1111-111111111111',
      location_name: 'MG Road, Metro Gate 3, Ward 12',
      latitude: 28.6139,
      longitude: 77.2090,
      ai_confidence_score: 0.94,
      ai_raw_extracted_entities: { location: 'MG Road Metro Gate 3', ward: '12', urgency: 'HIGH', key_elements: ['pothole', 'metro', 'tire damage'] },
      master_group_id: 'grp-001',
      is_master_ticket: true,
      sla_deadline: new Date(Date.now() + 3600000 * 18).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'cmp-002',
      ticket_number: 'GRV-2026-0802',
      citizen_id: 'c1111111-1111-1111-1111-111111111111',
      title: 'Large hole on road near MG Metro Gate 3',
      description: 'Deep road crater near Metro Station Gate 3. Need urgent bitumen patching before rain.',
      category: 'ROADS',
      urgency: 'HIGH',
      status: 'DUPLICATE_GROUPED',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      ward_id: 'w1111111-1111-1111-1111-111111111111',
      location_name: 'MG Road, Ward 12',
      latitude: 28.6141,
      longitude: 77.2092,
      ai_confidence_score: 0.91,
      ai_raw_extracted_entities: { location: 'MG Metro Gate 3', ward: '12', urgency: 'HIGH' },
      master_group_id: 'grp-001',
      is_master_ticket: false,
      sla_deadline: new Date(Date.now() + 3600000 * 18).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'cmp-003',
      ticket_number: 'GRV-2026-0803',
      citizen_id: 'c1111111-1111-1111-1111-111111111111',
      title: 'Overflowing garbage bin near Sector 14 Market',
      description: 'Municipal garbage dump box overflowing onto main road causing foul smell and health hazard.',
      category: 'SANITATION',
      urgency: 'CRITICAL',
      status: 'SUBMITTED',
      department_id: 'd2222222-2222-2222-2222-222222222222',
      ward_id: 'w2222222-2222-2222-2222-222222222222',
      location_name: 'Sector 14 Main Market, Ward 14',
      latitude: 28.6250,
      longitude: 77.2180,
      ai_confidence_score: 0.96,
      ai_raw_extracted_entities: { location: 'Sector 14 Market', ward: '14', urgency: 'CRITICAL' },
      master_group_id: null,
      is_master_ticket: true,
      sla_deadline: new Date(Date.now() + 3600000 * 4).toISOString(), // 4 hours left
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 'cmp-004',
      ticket_number: 'GRV-2026-0804',
      citizen_id: 'c1111111-1111-1111-1111-111111111111',
      title: 'Water main pipeline leaking heavily on Main Street',
      description: 'Clean drinking water gushing out of broken supply pipe near South Lake Colony entrance.',
      category: 'WATER',
      urgency: 'CRITICAL',
      status: 'ESCALATED',
      department_id: 'd3333333-3333-3333-3333-333333333333',
      ward_id: 'w3333333-3333-3333-3333-333333333333',
      location_name: 'South Lake Colony, Ward 7',
      latitude: 28.6010,
      longitude: 77.1950,
      ai_confidence_score: 0.98,
      ai_raw_extracted_entities: { location: 'South Lake Colony', ward: '7', urgency: 'CRITICAL' },
      master_group_id: null,
      is_master_ticket: true,
      sla_deadline: new Date(Date.now() - 3600000 * 2).toISOString(), // Overdue by 2 hours
      escalated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ],

  evidence: [
    {
      id: 'ev-001',
      complaint_id: 'cmp-001',
      file_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60',
      file_type: 'IMAGE',
      caption: 'Pothole damaged car tire on MG Road',
      ai_analysis_tags: ['pothole', 'asphalt_damage', 'road_hazard']
    },
    {
      id: 'ev-003',
      complaint_id: 'cmp-003',
      file_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60',
      file_type: 'IMAGE',
      caption: 'Overflowing dump bin Sector 14',
      ai_analysis_tags: ['solid_waste', 'overflow_bin', 'sanitation_breach']
    }
  ],

  auditLogs: [
    {
      id: 'log-001',
      complaint_id: 'cmp-001',
      performed_by: 'c1111111-1111-1111-1111-111111111111',
      action: 'SUBMITTED',
      previous_status: null,
      new_status: 'SUBMITTED',
      notes: 'Complaint submitted by citizen via AI Intake form.',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'log-002',
      complaint_id: 'cmp-001',
      performed_by: 'c2222222-2222-2222-2222-222222222222',
      action: 'ASSIGNED',
      previous_status: 'SUBMITTED',
      new_status: 'IN_PROGRESS',
      notes: 'Officer Rajesh Sharma assigned road patching team.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'log-003',
      complaint_id: 'cmp-002',
      performed_by: null,
      action: 'DUPLICATE_MERGED',
      previous_status: 'SUBMITTED',
      new_status: 'DUPLICATE_GROUPED',
      notes: 'AI SentenceTransformer calculated 91% similarity with GRV-2026-0801 within 200m radius. Merged into Master Issue.',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ]
};

// Distance calculation helper (Haversine formula in meters)
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
