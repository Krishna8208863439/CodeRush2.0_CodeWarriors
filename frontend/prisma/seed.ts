import { PrismaClient, Role, Urgency, GrievanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Prisma Seed] Starting database seeding...');

  // 1. Seed 8 Municipal Departments
  const departmentsData = [
    { name: 'Water Supply & Sewerage', code: 'WSS', SLA_hours: 24, description: 'Municipal water distribution, pipe leaks, and sewerage management.' },
    { name: 'Public Works & Roads', code: 'ROADS', SLA_hours: 48, description: 'Road maintenance, pothole repairs, flyovers, and asphalt works.' },
    { name: 'Solid Waste Management', code: 'SWM', SLA_hours: 24, description: 'Garbage collection, street sweeping, and community waste bins.' },
    { name: 'Electricity & Street Lighting', code: 'ELEC', SLA_hours: 12, description: 'Streetlights, power transformers, and electrical safety hazards.' },
    { name: 'Drainage & Stormwater', code: 'DRAIN', SLA_hours: 24, description: 'Stormwater drain clearing, gutter blockages, and flood prevention.' },
    { name: 'Building & Construction Permissions', code: 'BUILD', SLA_hours: 72, description: 'Building permits, illegal construction checks, and structural safety.' },
    { name: 'Parks & Horticulture', code: 'PARKS', SLA_hours: 48, description: 'Public gardens, fallen trees, park maintenance, and green cover.' },
    { name: 'Public Safety & Encroachment', code: 'SAFETY', SLA_hours: 12, description: 'Public hazards, street encroachments, and municipal safety.' }
  ];

  const departmentRecords: Record<string, any> = {};

  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: {
        name: dept.name,
        SLA_hours: dept.SLA_hours,
        description: dept.description
      },
      create: {
        name: dept.name,
        code: dept.code,
        SLA_hours: dept.SLA_hours,
        description: dept.description
      }
    });
    departmentRecords[dept.code] = record;
  }
  console.log('[Prisma Seed] 8 Municipal Departments seeded.');

  // 2. Hash Passwords
  const citizenPasswordHash = await bcrypt.hash('Password123!', 10);
  const officerPasswordHash = await bcrypt.hash('Officer123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  // 3. Seed Users
  // Citizen
  const citizenUser = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: { passwordHash: citizenPasswordHash, name: 'Ananya Sharma' },
    create: {
      name: 'Ananya Sharma',
      email: 'citizen@example.com',
      passwordHash: citizenPasswordHash,
      role: Role.CITIZEN
    }
  });

  // Water Officer
  const waterOfficer = await prisma.user.upsert({
    where: { email: 'water.officer@gov.in' },
    update: { passwordHash: officerPasswordHash, departmentId: departmentRecords['WSS'].id },
    create: {
      name: 'Inspector Vikram Singh',
      email: 'water.officer@gov.in',
      passwordHash: officerPasswordHash,
      role: Role.OFFICER,
      departmentId: departmentRecords['WSS'].id
    }
  });

  // Roads Officer
  const roadsOfficer = await prisma.user.upsert({
    where: { email: 'roads.officer@gov.in' },
    update: { passwordHash: officerPasswordHash, departmentId: departmentRecords['ROADS'].id },
    create: {
      name: 'Officer Rajesh Kumar',
      email: 'roads.officer@gov.in',
      passwordHash: officerPasswordHash,
      role: Role.OFFICER,
      departmentId: departmentRecords['ROADS'].id
    }
  });

  // Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gov.in' },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: 'System Administrator',
      email: 'admin@gov.in',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN
    }
  });

  console.log('[Prisma Seed] Test Accounts seeded.');

  // 4. Seed Sample Active Grievances
  const sampleGrievances = [
    {
      ticketNumber: 'CIV-2026-8942',
      title: 'Major Water Pipeline Leakage on MG Road',
      description: 'Clean drinking water is gushing out on Main MG Road near Ward 4. Immediate repair required to prevent road erosion.',
      location_lat: 28.6139,
      location_lng: 77.2090,
      address: 'Ward 4, West Zone, MG Road Junction',
      status: GrievanceStatus.IN_PROGRESS,
      urgency: Urgency.HIGH,
      priority: Urgency.HIGH,
      priorityScore: 5.5,
      requestCount: 3,
      departmentId: departmentRecords['WSS'].id,
      assignedOfficerId: waterOfficer.id,
      citizenId: citizenUser.id
    },
    {
      ticketNumber: 'CIV-2026-7740',
      title: 'Deep Pothole Obstruction near City Flyover',
      description: 'A deep dangerous pothole has developed on the flyover descent causing severe vehicle damage and traffic bottlenecks.',
      location_lat: 28.6250,
      location_lng: 77.2180,
      address: 'Ward 12, South District Flyover',
      status: GrievanceStatus.PENDING,
      urgency: Urgency.MEDIUM,
      priority: Urgency.MEDIUM,
      priorityScore: 3.2,
      requestCount: 2,
      departmentId: departmentRecords['ROADS'].id,
      assignedOfficerId: roadsOfficer.id,
      citizenId: citizenUser.id
    },
    {
      ticketNumber: 'CIV-2026-6119',
      title: 'Overflowing Community Garbage Bin in Sector 9 Market',
      description: 'Garbage dump has not been cleared for 3 days creating foul odor and pest hazard near food market stalls.',
      location_lat: 28.6010,
      location_lng: 77.1950,
      address: 'Sector 9 Central Market Plaza',
      status: GrievanceStatus.RESOLVED,
      urgency: Urgency.LOW,
      priority: Urgency.LOW,
      priorityScore: 1.8,
      requestCount: 1,
      departmentId: departmentRecords['SWM'].id,
      assignedOfficerId: null,
      citizenId: citizenUser.id
    },
    {
      ticketNumber: 'CIV-2026-5502',
      title: 'High Voltage Electrical Wire Sparking Near School',
      description: 'Exposed overhead power wire sparking continuously during wind near Primary School Gate 2.',
      location_lat: 28.6300,
      location_lng: 77.2250,
      address: 'Ward 2, Primary School Gate 2',
      status: GrievanceStatus.PENDING,
      urgency: Urgency.CRITICAL,
      priority: Urgency.CRITICAL,
      priorityScore: 8.4,
      requestCount: 6,
      departmentId: departmentRecords['ELEC'].id,
      assignedOfficerId: null,
      citizenId: citizenUser.id
    }
  ];

  for (const g of sampleGrievances) {
    const existing = await prisma.grievance.findUnique({
      where: { ticketNumber: g.ticketNumber }
    });

    if (!existing) {
      await prisma.grievance.create({
        data: g
      });
    }
  }

  console.log('[Prisma Seed] Sample Grievances seeded successfully.');
}

main()
  .catch((e) => {
    console.error('[Prisma Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
