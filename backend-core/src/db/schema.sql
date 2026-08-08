-- Community Redressal Planner - Database DDL
-- Tables: Citizen, Complaint, Department, Evidence, AuditLog, SLA, DuplicateGroups, Ward

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Department
CREATE TABLE IF NOT EXISTS Department (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SLA Definition
CREATE TABLE IF NOT EXISTS SLA (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES Department(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    urgency VARCHAR(20) NOT NULL,
    resolution_hours INT NOT NULL,
    warning_hours INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, category, urgency)
);

-- 3. Ward
CREATE TABLE IF NOT EXISTS Ward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward_number INT NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    officer_in_charge VARCHAR(100),
    boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Citizen / Officer Users
CREATE TABLE IF NOT EXISTS Citizen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'CITIZEN',
    department_id UUID REFERENCES Department(id),
    ward_id UUID REFERENCES Ward(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Duplicate Groups (Master Issue Tracking)
CREATE TABLE IF NOT EXISTS DuplicateGroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_complaint_id UUID,
    similarity_score FLOAT NOT NULL,
    geo_radius_meters FLOAT NOT NULL DEFAULT 500.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Complaint
CREATE TABLE IF NOT EXISTS Complaint (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES Citizen(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    urgency VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    department_id UUID REFERENCES Department(id),
    ward_id UUID REFERENCES Ward(id),
    location_name VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    ai_confidence_score FLOAT DEFAULT 0.0,
    ai_raw_extracted_entities JSONB,
    master_group_id UUID REFERENCES DuplicateGroups(id),
    is_master_ticket BOOLEAN DEFAULT TRUE,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add self reference for DuplicateGroups master
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_complaint'
    ) THEN
        ALTER TABLE DuplicateGroups ADD CONSTRAINT fk_master_complaint 
            FOREIGN KEY (master_complaint_id) REFERENCES Complaint(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Evidence
CREATE TABLE IF NOT EXISTS Evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES Complaint(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    caption TEXT,
    ai_analysis_tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AuditLog
CREATE TABLE IF NOT EXISTS AuditLog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES Complaint(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES Citizen(id),
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_complaint_geom ON Complaint USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_complaint_status ON Complaint(status);
CREATE INDEX IF NOT EXISTS idx_complaint_category ON Complaint(category);
CREATE INDEX IF NOT EXISTS idx_complaint_department ON Complaint(department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_ticket ON Complaint(ticket_number);
