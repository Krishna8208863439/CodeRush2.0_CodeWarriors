/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'EN',
      ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS phone_otp_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMP;
  `);

  pgm.sql(`
    ALTER TABLE citizens
      ADD COLUMN IF NOT EXISTS address TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS preferred_language,
      DROP COLUMN IF EXISTS notification_preferences,
      DROP COLUMN IF EXISTS is_phone_verified,
      DROP COLUMN IF EXISTS phone_otp_code,
      DROP COLUMN IF EXISTS phone_otp_expires_at;
  `);
};
