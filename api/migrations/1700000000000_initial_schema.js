/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Enable PostGIS & pgcrypto
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "postgis";`);
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  // 2. Sequence for complaint reference ID (CRP-YYYY-NNNNNN)
  pgm.sql(`CREATE SEQUENCE IF NOT EXISTS complaint_ref_seq START 1;`);

  // 3. users table
  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      is_locked BOOLEAN DEFAULT FALSE,
      locked_until TIMESTAMP,
      push_subscription JSONB,
      notification_opt_outs JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. citizens table
  pgm.sql(`
    CREATE TABLE citizens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      phone_encrypted TEXT,
      national_id_encrypted TEXT,
      email_encrypted TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. refresh_tokens table
  pgm.sql(`
    CREATE TABLE refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. password_reset_tokens table
  pgm.sql(`
    CREATE TABLE password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. departments table
  pgm.sql(`
    CREATE TABLE departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      department_head_id UUID REFERENCES users(id) ON DELETE SET NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. officers table
  pgm.sql(`
    CREATE TABLE officers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      designation VARCHAR(100),
      badge_number VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. wards table (MultiPolygon 4326)
  pgm.sql(`
    CREATE TABLE wards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      ward_number INT UNIQUE NOT NULL,
      boundary GEOMETRY(MultiPolygon, 4326),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. complaints table
  pgm.sql(`
    CREATE TABLE complaints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_id VARCHAR(50) UNIQUE NOT NULL,
      citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(100),
      title VARCHAR(255),
      description TEXT,
      channel VARCHAR(50) NOT NULL,
      language VARCHAR(10) DEFAULT 'EN',
      status VARCHAR(50) DEFAULT 'SUBMITTED',
      priority_score FLOAT DEFAULT 0.0,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
      master_incident_id UUID,
      sla_deadline TIMESTAMP,
      breach_timestamp TIMESTAMP,
      escalation_level INT DEFAULT 0,
      escalated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Foreign key for master_incident_id after complaints table exists
  pgm.sql(`
    ALTER TABLE complaints ADD CONSTRAINT fk_master_incident
    FOREIGN KEY (master_incident_id) REFERENCES complaints(id) ON DELETE SET NULL;
  `);

  // 11. gis_locations table (Point 4326 + GIST spatial index)
  pgm.sql(`
    CREATE TABLE gis_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      geom GEOMETRY(Point, 4326) NOT NULL,
      latitude FLOAT NOT NULL,
      longitude FLOAT NOT NULL,
      formatted_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_gis_locations_geom ON gis_locations USING GIST (geom);
  `);

  // 12, 13, 14. complaint evidence tables (complaint_images, complaint_audio, complaint_video)
  pgm.sql(`
    CREATE TABLE complaint_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      minio_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE complaint_audio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      minio_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE complaint_video (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      minio_key VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 15. evidence table (unified evidence reference)
  pgm.sql(`
    CREATE TABLE evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      evidence_type VARCHAR(50),
      minio_key VARCHAR(500) NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 16. ai_predictions table (reasoning JSONB)
  pgm.sql(`
    CREATE TABLE ai_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      model_name VARCHAR(100) NOT NULL,
      model_version VARCHAR(50) NOT NULL,
      category VARCHAR(100) NOT NULL,
      confidence FLOAT NOT NULL,
      priority_score FLOAT DEFAULT 0.0,
      reasoning JSONB NOT NULL,
      is_manual_review BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 17. translation_logs table
  pgm.sql(`
    CREATE TABLE translation_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      original_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      source_lang VARCHAR(10) NOT NULL,
      model_used VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 18. duplicate_groups table
  pgm.sql(`
    CREATE TABLE duplicate_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_incident_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      duplicate_complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      similarity_score FLOAT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 19. status_history table
  pgm.sql(`
    CREATE TABLE status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 20. appeals table
  pgm.sql(`
    CREATE TABLE appeals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 21. feedback table
  pgm.sql(`
    CREATE TABLE feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
      citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 22. notifications table
  pgm.sql(`
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
      channel VARCHAR(50) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB,
      status VARCHAR(50) DEFAULT 'PENDING',
      attempt_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 23. audit_logs table
  pgm.sql(`
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      acting_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      table_name VARCHAR(100),
      operation VARCHAR(50) NOT NULL,
      record_id VARCHAR(255),
      changed_fields JSONB,
      ip_address VARCHAR(100),
      user_agent TEXT,
      event VARCHAR(100),
      complaint_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 24. consent_records table
  pgm.sql(`
    CREATE TABLE consent_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
      consent_version VARCHAR(50) NOT NULL,
      granted BOOLEAN NOT NULL DEFAULT TRUE,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 25. sla_rules table & seed default rules
  pgm.sql(`
    CREATE TABLE sla_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(100) UNIQUE NOT NULL,
      deadline_hours INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO sla_rules (category, deadline_hours) VALUES
      ('GARBAGE', 12),
      ('STREET_LIGHT', 24),
      ('WATER_LEAKAGE', 48),
      ('ROAD_DAMAGE', 168)
    ON CONFLICT (category) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS sla_rules CASCADE;
    DROP TABLE IF EXISTS consent_records CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS feedback CASCADE;
    DROP TABLE IF EXISTS appeals CASCADE;
    DROP TABLE IF EXISTS status_history CASCADE;
    DROP TABLE IF EXISTS duplicate_groups CASCADE;
    DROP TABLE IF EXISTS translation_logs CASCADE;
    DROP TABLE IF EXISTS ai_predictions CASCADE;
    DROP TABLE IF EXISTS evidence CASCADE;
    DROP TABLE IF EXISTS complaint_video CASCADE;
    DROP TABLE IF EXISTS complaint_audio CASCADE;
    DROP TABLE IF EXISTS complaint_images CASCADE;
    DROP TABLE IF EXISTS gis_locations CASCADE;
    DROP TABLE IF EXISTS complaints CASCADE;
    DROP TABLE IF EXISTS wards CASCADE;
    DROP TABLE IF EXISTS officers CASCADE;
    DROP TABLE IF EXISTS departments CASCADE;
    DROP TABLE IF EXISTS password_reset_tokens CASCADE;
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
    DROP TABLE IF EXISTS citizens CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP SEQUENCE IF EXISTS complaint_ref_seq;
  `);
};
